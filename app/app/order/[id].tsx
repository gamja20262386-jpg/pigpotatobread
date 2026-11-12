// 주문 추적: 단계 스테퍼(맛집만이면 4단계), 경로 카드(집하장 → 배송지), basalt 영수증, 다음 단계(시연)
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { api, errorText } from '../../src/api';
import { Button } from '../../src/components/Button';
import { DemoLogin } from '../../src/components/DemoLogin';
import { MoneyRow } from '../../src/components/MoneyRow';
import { BagChips } from '../../src/components/QuoteParts';
import { Screen, StackHeader } from '../../src/components/Screen';
import { ErrorView, Loading } from '../../src/components/States';
import { Icon } from '../../src/components/Icon';
import { Txt } from '../../src/components/Txt';
import { eyo, fmtTime } from '../../src/format';
import { useMarket } from '../../src/hooks';
import { useSession } from '../../src/store/session';
import type { Order, OrderStatus } from '../../src/types';
import { useResource } from '../../src/useResource';
import { color as C, radius, space } from '../../src/theme';

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'received', label: '주문 접수' },
  { status: 'preparing', label: '가게 준비 중' },
  { status: 'hub_packed', label: '집하장 포장 완료' },
  { status: 'delivering', label: '배달 중' },
  { status: 'delivered', label: '도착' },
];

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const token = useSession((s) => s.token);
  const res = useResource(id && token ? `order:${id}:${token}` : null, () => api.order(String(id)));
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState('');
  const order = res.data?.order;

  const advance = async () => {
    if (!order) return;
    setAdvancing(true);
    setError('');
    try {
      const r = await api.advance(order.id);
      res.setData({ order: r.order });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <Screen header={<StackHeader title="주문 추적" />} onRefresh={res.reload}>
      {!token ? (
        <View style={{ gap: space.m }}>
          <Txt v="bodyMedium">주문을 보려면 로그인이 필요해요</Txt>
          <DemoLogin only="customer" />
        </View>
      ) : res.loading && !order ? (
        <Loading label="주문을 불러오는 중이에요" />
      ) : res.error && !order ? (
        <ErrorView message={res.error} onRetry={res.reload} />
      ) : order ? (
        <>
          <OrderHead order={order} />
          <StatusStepper order={order} />
          <RouteCard order={order} />
          <Receipt order={order} />
          {order.status !== 'delivered' ? (
            <View style={{ gap: 6 }}>
              <Button label="다음 단계(시연)" kind="outline" onPress={() => void advance()} busy={advancing} />
              {error ? (
                <Txt v="caption" color={C.danger}>
                  {error}
                </Txt>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

function OrderHead({ order }: { order: Order }) {
  return (
    <View style={{ gap: 4 }}>
      <Txt v="label" color={C.sub}>
        {`ORDER · ${order.id.slice(0, 8).toUpperCase()}`}
      </Txt>
      <Txt v="display">{order.status === 'delivered' ? '잘 도착했어요' : eyo(order.status_label)}</Txt>
      <Txt v="caption" color={C.sub}>
        {`${fmtTime(order.created_at)} 주문 · ${order.destination.name}${order.agent_run_id ? ' · 하르방 제안으로 담음' : ''}`}
      </Txt>
    </View>
  );
}

function StatusStepper({ order }: { order: Order }) {
  const hasMarket = order.quote.groups.some((g) => g.kind === 'market');
  const steps = hasMarket ? STEPS : STEPS.filter((s) => s.status !== 'hub_packed');
  const idx = steps.findIndex((s) => s.status === order.status);
  return (
    <View style={{ backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, padding: space.l, gap: 0 }}>
      {steps.map((s, i) => {
        const done = i <= idx;
        const at = order.history.find((h) => h.status === s.status)?.at;
        return (
          <View key={s.status} style={{ flexDirection: 'row', gap: space.m }}>
            <View style={{ alignItems: 'center', width: 24 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: done ? (i === idx ? C.brand : C.leaf) : C.line, alignItems: 'center', justifyContent: 'center' }}>
                {done ? <Icon name="check" size={14} color={C.white} stroke={3} /> : null}
              </View>
              {i < steps.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 14, backgroundColor: i < idx ? C.leaf : C.line }} /> : null}
            </View>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingBottom: space.l, paddingTop: 1 }}>
              <Txt v={i === idx ? 'bodyMedium' : 'body'} color={done ? C.ink : C.sub} style={{ fontSize: 15, lineHeight: 22 }}>
                {s.label}
              </Txt>
              {at ? (
                <Txt v="caption" color={C.sub}>
                  {fmtTime(at).split(' ').pop()}
                </Txt>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function RouteCard({ order }: { order: Order }) {
  const market = useMarket();
  const hasMarket = order.quote.groups.some((g) => g.kind === 'market');
  const from = hasMarket ? market.data?.hub.name ?? '동문시장 공동 집하장' : order.quote.groups[0]?.store_name ?? '가게';
  return (
    <View style={{ backgroundColor: C.seaSoft, borderRadius: radius.card, padding: space.l, gap: space.m }}>
      <View style={{ height: 70 }}>
        <Svg width="100%" height="70" viewBox="0 0 300 70" preserveAspectRatio="none">
          <Line x1="20" y1="50" x2="280" y2="20" stroke={C.sea} strokeWidth={2.5} strokeDasharray="6 6" strokeLinecap="round" />
          <Circle cx="20" cy="50" r="9" fill={C.sea} />
          <Circle cx="280" cy="20" r="9" fill={C.card} stroke={C.sea} strokeWidth={3} />
        </Svg>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.m }}>
        <View style={{ flex: 1 }}>
          <Txt v="caption" color={C.sea}>
            출발
          </Txt>
          <Txt v="captionMedium" numberOfLines={2}>
            {from}
          </Txt>
        </View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Txt v="caption" color={C.sea}>
            도착
          </Txt>
          <Txt v="captionMedium" numberOfLines={2} style={{ textAlign: 'right' }}>
            {order.destination.name}
          </Txt>
        </View>
      </View>
      <Txt v="caption" color={C.sea}>
        {`직선 ${order.quote.distance_km.toFixed(1)}km 기준 도착 예상 약 ${order.quote.eta_min}분`}
      </Txt>
    </View>
  );
}

function Receipt({ order }: { order: Order }) {
  const q = order.quote;
  return (
    <View style={{ borderRadius: radius.card, overflow: 'hidden', borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
      <View style={{ backgroundColor: C.basalt, padding: space.l, gap: 2 }}>
        <Txt v="label" color={C.brand}>
          RECEIPT
        </Txt>
        <Txt v="serifTitle" color={C.white}>
          {`${q.groups.length}곳에서 ${q.lines.reduce((n, l) => n + l.qty, 0)}개`}
        </Txt>
      </View>
      <View style={{ padding: space.l, gap: space.s }}>
        {q.lines.map((l) => (
          <View key={l.product_id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.s }}>
            <Txt v="caption" style={{ flex: 1, fontSize: 14 }} numberOfLines={1}>
              {`${l.name} × ${l.qty}`}
            </Txt>
            <Txt v="caption" color={C.sub} style={{ fontSize: 14 }}>
              {l.store_name}
            </Txt>
          </View>
        ))}
        <BagChips bags={q.bags} />
        <View style={{ height: 1, backgroundColor: C.line, marginVertical: space.xs }} />
        <MoneyRow label="상품" value={q.subtotal} />
        <MoneyRow label="시장 묶음 배송비" value={q.fees.market} />
        <MoneyRow label="맛집 배달비" value={q.fees.restaurants} />
        <MoneyRow label="합계" value={q.total} strong />
      </View>
    </View>
  );
}
