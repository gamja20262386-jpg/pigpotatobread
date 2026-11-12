// 상인 모드: 내 가게 머리, 말로 고치기(이전→이후 표 → 반영하기), 상품(재고 ±, 가격, 품절), 들어온 주문
import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { api, errorText } from '../src/api';
import { AgentInput } from '../src/components/AgentInput';
import { Button } from '../src/components/Button';
import { Chip } from '../src/components/Chip';
import { ClaimList } from '../src/components/ClaimList';
import { DemoLogin } from '../src/components/DemoLogin';
import { RunTimeline } from '../src/components/RunTimeline';
import { Card, Screen, StackHeader } from '../src/components/Screen';
import { Empty, ErrorView, Loading } from '../src/components/States';
import { Stepper } from '../src/components/Stepper';
import { storeTint } from '../src/components/StoreCard';
import { Txt } from '../src/components/Txt';
import { fmtTime } from '../src/format';
import { useSession } from '../src/store/session';
import type { Product, RunResult, StockChange } from '../src/types';
import { useResource } from '../src/useResource';
import { color as C, font, radius, space, won } from '../src/theme';

const INTAKE_EXAMPLES = [
  { label: '고등어회 3개 더, 2만 6천원', message: '고등어회 3개 더 들어왔어, 2만 6천원으로' },
  { label: '모둠회 다 팔렸어', message: '모둠회 다 팔렸어' },
];

export default function MerchantScreen() {
  const user = useSession((s) => s.user);
  const token = useSession((s) => s.token);
  const isMerchant = !!token && user?.role === 'merchant';
  const res = useResource(isMerchant ? `merchant:${token}` : null, () => api.merchantStore());
  const data = res.data;

  return (
    <Screen header={<StackHeader title="상인 모드" />} onRefresh={isMerchant ? res.reload : undefined}>
      {!isMerchant ? (
        <Card>
          <Txt v="serifTitle">상인 계정으로 들어와 주세요</Txt>
          <Txt v="caption" color={C.sub} style={{ fontSize: 14 }}>
            시연 상인은 동문시장 바당횟집을 관리해요. 말로 재고·가격을 고치고, 확인한 뒤에만 반영돼요.
          </Txt>
          <DemoLogin only="merchant" />
        </Card>
      ) : res.loading && !data ? (
        <Loading label="내 가게를 불러오는 중이에요" />
      ) : res.error && !data ? (
        <ErrorView message={res.error} onRetry={res.reload} />
      ) : data ? (
        <>
          <View style={{ flexDirection: 'row', gap: space.l, alignItems: 'center' }}>
            <View style={{ width: 72, height: 90, borderRadius: radius.card, backgroundColor: storeTint(data.store.id), alignItems: 'center', justifyContent: 'center' }}>
              <Txt style={{ fontSize: 38, lineHeight: 46 }}>{data.store.icon}</Txt>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="label" color={C.sub}>
                MY STALL
              </Txt>
              <Txt v="display" style={{ fontSize: 24, lineHeight: 30 }}>
                {data.store.name}
              </Txt>
              <Txt v="caption" color={C.sub}>
                {`${data.store.open}–${data.store.close} · 상품 ${data.products.length}개`}
              </Txt>
            </View>
          </View>

          <IntakeCard onApplied={res.reload} />

          <View style={{ gap: space.s }}>
            <Txt v="title">상품</Txt>
            {data.products.length ? data.products.map((p) => <MerchantProduct key={p.id} product={p} onSaved={res.reload} />) : <Empty title="등록된 상품이 없어요" />}
          </View>

          <View style={{ gap: space.s }}>
            <Txt v="title">들어온 주문</Txt>
            {data.orders.length ? (
              data.orders.map((o) => (
                <View key={o.id} style={{ backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, padding: space.l, gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip small label={o.status_label} tone="brand" />
                    <Txt v="caption" color={C.sub}>
                      {fmtTime(o.created_at)}
                    </Txt>
                  </View>
                  {o.lines.map((l, i) => (
                    <Txt key={`${o.id}-${i}`} v="caption" style={{ fontSize: 14 }}>
                      {`${l.name} × ${l.qty}`}
                    </Txt>
                  ))}
                </View>
              ))
            ) : (
              <Empty title="아직 들어온 주문이 없어요" />
            )}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function IntakeCard({ onApplied }: { onApplied: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ message: string; run: RunResult; changes: StockChange[] } | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const ask = async (message: string) => {
    setBusy(true);
    setError('');
    setApplied(false);
    setResult(null);
    try {
      const r = await api.intake(message);
      setResult({ message, ...r });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  const apply = async () => {
    if (!result) return;
    setApplying(true);
    setError('');
    try {
      // 그사이 주문으로 재고가 바뀌었으면 서버가 409로 거절한다(덮어쓰지 않음)
      for (const c of result.changes) await api.patchProduct(c.product_id, { ...c.after, expected_stock: c.before.stock });
      setApplied(true);
      onApplied();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setApplying(false);
    }
  };

  return (
    <View style={{ backgroundColor: C.card, borderRadius: radius.sheet, borderWidth: 1, borderColor: C.line, padding: space.xl, gap: space.l }}>
      <View style={{ gap: 2 }}>
        <Txt v="label" color={C.brandDark}>
          8 · 상인 말 입력
        </Txt>
        <Txt v="serifTitle">말로 고치기</Txt>
        <Txt v="caption" color={C.sub}>
          말하면 하르방이 바꿀 내용을 표로 보여 드려요. 반영하기를 눌러야 바뀌어요.
        </Txt>
      </View>
      <AgentInput onSend={(m) => void ask(m)} busy={busy} suggestions={INTAKE_EXAMPLES} placeholder="고등어회 3개 더 들어왔어, 2만 6천원으로" />
      {busy ? <RunTimeline pendingFlow="stock_intake" /> : null}
      {error ? (
        <Txt v="caption" color={C.danger}>
          {error}
        </Txt>
      ) : null}
      {result ? (
        <View style={{ gap: space.m }}>
          <Txt v="caption" color={C.sub}>{`“${result.message}”`}</Txt>
          <Txt v="reply">{result.run.summary}</Txt>
          <RunTimeline run={result.run} animate defaultOpen={false} />
          <ClaimList claims={result.run.public_claims} initial={2} />
          {result.changes.length ? (
            <View style={{ borderRadius: radius.card, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', backgroundColor: C.bg, paddingHorizontal: space.m, paddingVertical: space.s }}>
                <Txt v="captionMedium" style={{ flex: 2 }}>
                  상품
                </Txt>
                <Txt v="captionMedium" style={{ flex: 3 }}>
                  이전 → 이후
                </Txt>
              </View>
              {result.changes.map((c) => (
                <View key={c.product_id} style={{ flexDirection: 'row', paddingHorizontal: space.m, paddingVertical: space.s, borderTopWidth: 1, borderTopColor: C.line, gap: space.s }}>
                  <Txt v="caption" style={{ flex: 2, fontSize: 14 }} numberOfLines={2}>
                    {c.name}
                  </Txt>
                  <View style={{ flex: 3, gap: 2 }}>
                    {c.after.price !== undefined ? <Diff label="가격" before={won(c.before.price)} after={won(c.after.price)} /> : null}
                    {c.after.stock !== undefined ? <Diff label="재고" before={`${c.before.stock}개`} after={`${c.after.stock}개`} /> : null}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Txt v="caption" color={C.sub} style={{ fontSize: 14 }}>
              바꿀 내용을 찾지 못했어요. 상품 이름과 숫자를 같이 말해 보세요.
            </Txt>
          )}
          {result.changes.length ? (
            applied ? (
              <Chip label="반영했어요" tone="leaf" />
            ) : (
              <View style={{ flexDirection: 'row', gap: space.s }}>
                <Button label="반영하기" onPress={() => void apply()} busy={applying} style={{ flex: 2 }} />
                <Button label="취소" kind="outline" onPress={() => setResult(null)} disabled={applying} style={{ flex: 1 }} />
              </View>
            )
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Diff({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <Txt v="caption" style={{ fontSize: 14 }}>
      <Txt v="caption" color={C.sub}>{`${label} `}</Txt>
      <Txt v="caption" color={C.sub} style={{ textDecorationLine: 'line-through' }}>
        {before}
      </Txt>
      {' → '}
      <Txt v="captionMedium" color={C.brandDark}>
        {after}
      </Txt>
    </Txt>
  );
}

function MerchantProduct({ product: p, onSaved }: { product: Product; onSaved: () => void }) {
  const [price, setPrice] = useState(String(p.price));
  const [stock, setStock] = useState(p.stock);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const sent = useRef(p.price);
  const save = async (patch: { price?: number; stock?: number }) => {
    setSaving(true);
    setError('');
    try {
      const r = await api.patchProduct(p.id, patch);
      setStock(r.product.stock);
      setPrice(String(r.product.price));
      sent.current = r.product.price;
      onSaved();
    } catch (e) {
      setError(errorText(e));
      setStock(p.stock);
      setPrice(String(p.price));
      sent.current = p.price;
    } finally {
      setSaving(false);
    }
  };
  const commitPrice = () => {
    const n = Number(price.replace(/[^0-9]/g, ''));
    if (n > 0 && n !== sent.current) {
      sent.current = n;
      void save({ price: n });
    } else if (!(n > 0)) setPrice(String(sent.current));
  };
  const out = stock <= 0;
  return (
    <View style={{ backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, padding: space.m, gap: space.s, opacity: saving ? 0.6 : 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
        <Txt style={{ fontSize: 28, lineHeight: 34 }}>{p.emoji}</Txt>
        <Txt v="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>
          {p.name}
        </Txt>
        <Pressable onPress={() => void save({ stock: out ? 10 : 0 })} accessibilityRole="switch" accessibilityState={{ checked: out }} hitSlop={6}>
          <Chip small label={out ? '품절' : '판매 중'} tone={out ? 'danger' : 'leaf'} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, borderRadius: radius.chip, paddingHorizontal: space.s, height: 40 }}>
          <TextInput
            value={price}
            onChangeText={setPrice}
            onSubmitEditing={commitPrice}
            onBlur={commitPrice}
            keyboardType="number-pad"
            accessibilityLabel={`${p.name} 가격`}
            style={{ flex: 1, fontFamily: font.medium, fontSize: 15, color: C.ink, minWidth: 0 }}
          />
          <Txt v="caption" color={C.sub}>
            원
          </Txt>
        </View>
        <Stepper value={stock} onChange={(n) => void save({ stock: Math.max(0, n) })} />
      </View>
      {error ? (
        <Txt v="caption" color={C.danger}>
          {error}
        </Txt>
      ) : null}
    </View>
  );
}
