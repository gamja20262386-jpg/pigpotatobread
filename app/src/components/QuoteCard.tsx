// 하르방 점검 카드(cart_check): 봉투, 배달비 = 시장 묶음 + 맛집, 도착 예상, 경고
import { View } from 'react-native';
import type { Quote, RunResult } from '../types';
import { color as C, radius, space } from '../theme';
import { AgentOrb } from './AgentOrb';
import { BagChips, Warnings } from './QuoteParts';
import { ErrorView } from './States';
import { MoneyRow } from './MoneyRow';
import { RunTimeline } from './RunTimeline';
import { Txt } from './Txt';

export function QuoteCard({ quote, run, loading, error, onRetry }: { quote?: Quote; run?: RunResult; loading: boolean; error?: string; onRetry: () => void }) {
  return (
    <View style={{ borderRadius: radius.card, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, padding: space.l, gap: space.m }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <AgentOrb size={36} busy={loading} />
        <View style={{ flex: 1 }}>
          <Txt v="bodyMedium">하르방 점검</Txt>
          <Txt v="caption" color={C.sub} numberOfLines={2}>
            {/* 경고 문장은 아래 상자에 그대로 나오므로 여기서는 상태만(같은 말 두 번 X) */}
            {loading ? '묶음·봉투·배달비를 다시 계산하고 있어요' : !quote ? '담은 상품을 확인했어요' : !quote.in_zone ? '이 배송지로는 주문할 수 없어요' : quote.warnings.length ? `주문 전 확인할 것 ${quote.warnings.length}개` : '주문해도 괜찮아요'}
          </Txt>
        </View>
      </View>

      {error && !loading ? <ErrorView compact message={error} onRetry={onRetry} /> : null}

      {quote ? (
        <View style={{ gap: space.m, opacity: loading ? 0.55 : 1 }}>
          <View style={{ flexDirection: 'row', gap: space.s }}>
            <Stat label="도착 예상" value={`약 ${quote.eta_min}분`} />
            <Stat label="직선 거리" value={`${quote.distance_km.toFixed(1)}km`} />
            <Stat label="가게" value={`${quote.groups.length}곳`} />
          </View>
          <BagChips bags={quote.bags} />
          <View style={{ gap: 4 }}>
            <MoneyRow label="시장 묶음 배송비" value={quote.fees.market} note={quote.groups.some((g) => g.kind === 'market') ? `시장 가게 ${quote.groups.filter((g) => g.kind === 'market').length}곳 한 번에` : undefined} />
            <MoneyRow label="맛집 배달비" value={quote.fees.restaurants} />
          </View>
          <Warnings warnings={quote.warnings} inZone={quote.in_zone} />
        </View>
      ) : null}

      {run ? <RunTimeline run={run} defaultOpen={false} /> : loading && !quote ? <RunTimeline pendingFlow="cart_check" /> : null}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, borderRadius: radius.chip, paddingVertical: space.s, paddingHorizontal: space.m }}>
      <Txt v="caption" color={C.sub} style={{ fontSize: 12 }}>
        {label}
      </Txt>
      <Txt v="bodyMedium">{value}</Txt>
    </View>
  );
}
