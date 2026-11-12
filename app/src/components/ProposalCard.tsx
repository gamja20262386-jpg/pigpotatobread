// 장바구니 제안 카드(plan_order): 가게별 묶음(품목마다 이유 한 줄)·봉투·배달비·도착 예상·경고 → 이대로 담기 / 고쳐서 담기
import { useState } from 'react';
import { View } from 'react-native';
import type { CartLine } from '../store/cart';
import type { Claim, Proposal, Quote, QuoteLine } from '../types';
import { isSubstitution } from './ClaimList';
import { color as C, radius, space, won } from '../theme';
import { BagChips, Warnings } from './QuoteParts';
import { Button } from './Button';
import { Chip } from './Chip';
import { MoneyRow } from './MoneyRow';
import { Stepper } from './Stepper';
import { Txt } from './Txt';

export const quoteToLines = (quote: Quote, qty?: Record<string, number>): CartLine[] =>
  quote.lines.map((l) => ({
    product_id: l.product_id,
    qty: qty?.[l.product_id] ?? l.qty,
    name: l.name,
    price: l.price,
    store_id: l.store_id,
    store_name: l.store_name,
    temp: l.temp,
  }));

// 품목 이유 한 줄: 원한 메뉴 · (대체/예산 조정 | N명 기준) · 봉투 — 하르방 팀 주장에서 뽑는다
function reasonFor(line: QuoteLine, quote: Quote, claims: Claim[]) {
  const core = line.name.replace(/\s*\(.*?\)/g, '').trim();
  const texts = claims.map((c) => c.text);
  const wish = texts.map((t) => t.match(/원하는 메뉴:\s*(.+)$/)?.[1]).find(Boolean)?.split(/[,，]\s*/).find((w) => w && line.name.includes(w));
  const people = texts.map((t) => t.match(/인원 (\d+)명/)?.[1]).find(Boolean);
  const sub = texts.find((t) => isSubstitution(t) && t.includes(core));
  const adj = texts.map((t) => (t.includes(core) ? t.match(/수량을 (\d+)개에서 (\d+)개로/) : null)).find(Boolean);
  const bag = quote.bags.find((b) => b.items.some((it) => it.startsWith(line.name)))?.label;
  const why = sub ? sub.replace(/^\s*단[,，]\s*/, '') : adj ? `예산 맞춰 ${adj[1]}개→${adj[2]}개` : people ? `${people}명 기준` : undefined;
  return [wish, why, sub ? undefined : bag].filter(Boolean).join(' · ');
}

export function ProposalCard({
  proposal,
  claims = [],
  accepted,
  onAccept,
  onOpenCart,
}: {
  proposal: Proposal;
  claims?: Claim[];
  accepted?: boolean;
  onAccept: (lines: CartLine[]) => void;
  onOpenCart: () => void;
}) {
  const q = proposal.quote;
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(q.lines.map((l) => [l.product_id, l.qty])));
  const editedSubtotal = q.lines.reduce((s, l) => s + l.price * (qty[l.product_id] ?? l.qty), 0);
  const changed = q.lines.some((l) => (qty[l.product_id] ?? l.qty) !== l.qty);

  return (
    <View style={{ borderRadius: radius.card, borderWidth: 1, borderColor: C.brand, backgroundColor: C.card, overflow: 'hidden' }}>
      <View style={{ backgroundColor: C.brandSoft, paddingHorizontal: space.l, paddingVertical: space.m, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: space.s }}>
          <Txt v="label" color={C.brandDark}>
            장바구니 제안
          </Txt>
          <Txt v="captionMedium" style={{ fontSize: 14 }}>
            {`${q.destination.name} · 도착 예상 약 ${q.eta_min}분`}
          </Txt>
        </View>
        <Txt v="title" color={C.brand} style={{ flexShrink: 0 }}>
          {won(editing ? editedSubtotal + q.fees.total : q.total)}
        </Txt>
      </View>

      <View style={{ padding: space.l, gap: space.m }}>
        {q.groups.map((g) => (
          <View key={g.store_id} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Txt v="serifTitle" style={{ fontSize: 16, lineHeight: 22, flexShrink: 1 }}>
                {g.store_name}
              </Txt>
              <Chip small label={g.kind === 'market' ? '공동 집하' : '맛집 배달'} tone={g.kind === 'market' ? 'sea' : 'brand'} />
            </View>
            {q.lines
              .filter((l) => l.store_id === g.store_id)
              .map((l) => (
                <View key={l.product_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: editing ? 40 : 22 }}>
                  <View style={{ flex: 1, gap: 1 }}>
                    <Txt v="caption" color={l.sold_out ? C.danger : C.ink} style={{ fontSize: 14, textDecorationLine: l.sold_out ? 'line-through' : 'none' }} numberOfLines={2}>
                      {l.name}
                      {editing ? '' : ` × ${l.qty}`}
                    </Txt>
                    {reasonFor(l, q, claims) ? (
                      <Txt v="caption" color={C.sub} style={{ fontSize: 12, lineHeight: 16 }} numberOfLines={1}>
                        {reasonFor(l, q, claims)}
                      </Txt>
                    ) : null}
                  </View>
                  {l.sold_out ? <Chip small label="품절" tone="danger" /> : null}
                  {editing ? (
                    <Stepper value={qty[l.product_id] ?? l.qty} onChange={(n) => setQty((s) => ({ ...s, [l.product_id]: Math.max(0, n) }))} />
                  ) : (
                    <Txt v="captionMedium" style={{ fontSize: 14 }}>
                      {won(l.line_total)}
                    </Txt>
                  )}
                </View>
              ))}
          </View>
        ))}

        <BagChips bags={q.bags} />

        <View style={{ gap: 4, paddingTop: space.s, borderTopWidth: 1, borderTopColor: C.line }}>
          <MoneyRow label="상품" value={editing ? editedSubtotal : q.subtotal} />
          <MoneyRow label="시장 묶음 배송비" value={q.fees.market} />
          <MoneyRow label="맛집 배달비" value={q.fees.restaurants} />
          <Txt v="caption" color={C.sub} style={{ fontSize: 12 }}>
            {`직선 ${q.distance_km.toFixed(1)}km 기준 도착 예상${editing && changed ? ' · 바꾼 수량은 장바구니에서 다시 계산해요' : ''}`}
          </Txt>
        </View>

        <Warnings warnings={q.warnings} inZone={q.in_zone} />

        {accepted ? (
          <Button label="담았어요 · 장바구니 보기" kind="dark" onPress={onOpenCart} />
        ) : editing ? (
          <View style={{ flexDirection: 'row', gap: space.s }}>
            <Button label="취소" kind="outline" onPress={() => setEditing(false)} style={{ flex: 1, paddingHorizontal: 8 }} />
            <Button label="고친 대로 담기" onPress={() => onAccept(quoteToLines(q, qty))} style={{ flex: 2, paddingHorizontal: 8 }} disabled={editedSubtotal === 0} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: space.s }}>
            <Button label="이대로 담기" onPress={() => onAccept(quoteToLines(q))} style={{ flex: 1, paddingHorizontal: 8 }} />
            <Button label="고쳐서 담기" kind="outline" onPress={() => setEditing(true)} style={{ flex: 1, paddingHorizontal: 8 }} />
          </View>
        )}
        <Txt v="caption" color={C.sub} style={{ textAlign: 'center' }}>
          담기 전에는 아무것도 주문되지 않아요
        </Txt>
      </View>
    </View>
  );
}
