// 장바구니(모달): 배송지, 가게별 묶음, 수량, 하르방 점검(/cart/quote, 바뀌면 0.4초 뒤 다시), 주문하기 → 주문 확인 시트
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { api, errorText } from '../src/api';
import { Button } from '../src/components/Button';
import { Chip } from '../src/components/Chip';
import { DemoLogin } from '../src/components/DemoLogin';
import { DestinationSheet } from '../src/components/DestinationSheet';
import { Icon } from '../src/components/Icon';
import { QuoteCard } from '../src/components/QuoteCard';
import { Screen, StackHeader } from '../src/components/Screen';
import { Sheet } from '../src/components/Sheet';
import { Empty } from '../src/components/States';
import { Stepper } from '../src/components/Stepper';
import { TempBadge } from '../src/components/TempBadge';
import { Thumb } from '../src/components/Thumb';
import { Txt } from '../src/components/Txt';
import { useDestination, useProductIndex } from '../src/hooks';
import { cartItems, useCart, type CartLine } from '../src/store/cart';
import { useSession } from '../src/store/session';
import { useResource } from '../src/useResource';
import { color as C, radius, space, won } from '../src/theme';

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function CartScreen() {
  const lines = useCart((s) => s.lines);
  const runId = useCart((s) => s.runId);
  const setQty = useCart((s) => s.setQty);
  const clear = useCart((s) => s.clear);
  const token = useSession((s) => s.token);
  const demoTime = useSession((s) => s.demoTime);
  const { id: destId, current } = useDestination();
  const [destOpen, setDestOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderError, setOrderError] = useState('');
  const productIndex = useProductIndex().data;

  const items = cartItems(lines);
  const key = useDebounced(items.length ? `${JSON.stringify(items)}|${destId}|${demoTime}` : null, 400);
  const quote = useResource(key, () => api.quote(items, destId));
  const q = quote.data?.quote;
  const stale = key !== (items.length ? `${JSON.stringify(items)}|${destId}|${demoTime}` : null);

  // 가게별 묶음
  const groups: { store_id: string; store_name: string; lines: CartLine[] }[] = [];
  for (const l of lines) {
    const g = groups.find((x) => x.store_id === l.store_id);
    if (g) g.lines.push(l);
    else groups.push({ store_id: l.store_id, store_name: l.store_name, lines: [l] });
  }
  const kindOf = (storeId: string) => q?.groups.find((g) => g.store_id === storeId)?.kind;
  const soldOut = q?.lines.filter((l) => l.sold_out) ?? [];
  const localSubtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  // 문 닫은 가게: 서버 경고("…지금 영업 시간이 아니에요") 또는 묶음의 is_open=false
  const closedWarning = q && !stale ? q.warnings.find((w) => w.includes('영업 시간')) ?? (q.groups.some((g) => g.is_open === false) ? '지금 문 닫은 가게가 있어요' : undefined) : undefined;
  const canOrder = !!q && !stale && !quote.loading && q.in_zone && soldOut.length === 0 && !closedWarning && !!destId;
  // 주문하기가 막힌 이유 한 줄
  const blockedWhy = !q || stale || quote.loading
    ? ''
    : !q.in_zone
      ? '배달 범위 밖이에요 · 배송지를 바꿔 주세요'
      : closedWarning
        ? '문 닫은 가게가 있어 지금은 주문할 수 없어요'
        : soldOut.length
          ? '품절된 상품을 빼면 주문할 수 있어요'
          : '';

  // 주문은 되돌릴 수 없어서 확인 시트를 한 번 거친다
  const askOrder = () => {
    if (!token) {
      setLoginOpen(true);
      return;
    }
    setConfirmOpen(true);
  };
  const placeOrder = async () => {
    if (!destId) return;
    setConfirmOpen(false);
    setOrdering(true);
    setOrderError('');
    try {
      const r = await api.createOrder(items, destId, runId);
      clear();
      router.replace(`/order/${r.order.id}`);
    } catch (e) {
      setOrderError(errorText(e));
      void quote.reload();
    } finally {
      setOrdering(false);
    }
  };

  return (
    <Screen
      header={<StackHeader title="장바구니" right={lines.length ? <Pressable onPress={clear} accessibilityRole="button" hitSlop={8}><Txt v="caption" color={C.sub}>비우기</Txt></Pressable> : undefined} />}
      footer={
        lines.length ? (
          <View style={{ gap: 6 }}>
            {orderError || (token && blockedWhy) ? (
              <Txt v="caption" color={C.danger} numberOfLines={2} style={{ textAlign: 'center' }}>
                {orderError || blockedWhy}
              </Txt>
            ) : null}
            <Button
              label={`주문하기 · ${won(q && !stale ? q.total : localSubtotal)}`}
              onPress={askOrder}
              busy={ordering}
              disabled={!canOrder}
            />
            {!token ? (
              <Txt v="caption" color={C.sub} style={{ textAlign: 'center' }}>
                주문하려면 시연 로그인이 필요해요
              </Txt>
            ) : null}
          </View>
        ) : undefined
      }
    >
      {lines.length === 0 ? (
        <Empty
          title="장바구니가 비었어요"
          body="메뉴를 담거나 하르방에게 맡겨 보세요"
          action={{ label: '하르방에게 말하기', onPress: () => router.navigate('/agent') }}
        />
      ) : (
        <>
          <Pressable
            onPress={() => setDestOpen(true)}
            accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, padding: space.l }}
          >
            <Icon name="pin" color={C.sea} />
            <View style={{ flex: 1 }}>
              <Txt v="caption" color={C.sub}>
                배송지
              </Txt>
              <Txt v="bodyMedium">{current?.name ?? '배송지를 골라 주세요'}</Txt>
            </View>
            <Txt v="captionMedium" color={C.brandDark}>
              바꾸기
            </Txt>
          </Pressable>

          {groups.map((g) => {
            const kind = kindOf(g.store_id);
            return (
              <View key={g.store_id} style={{ backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, padding: space.l, gap: space.m }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Txt v="serifTitle" style={{ fontSize: 17, lineHeight: 24, flexShrink: 1 }}>
                    {g.store_name}
                  </Txt>
                  {kind ? <Chip small label={kind === 'market' ? '공동 집하' : '맛집 배달'} tone={kind === 'market' ? 'sea' : 'brand'} /> : null}
                </View>
                {g.lines.map((l) => {
                  const ql = q?.lines.find((x) => x.product_id === l.product_id);
                  return (
                    <View key={l.product_id} style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
                      <Thumb image={productIndex?.find((p) => p.id === l.product_id)?.image} emoji={l.emoji ?? '🛍'} category={kind === 'market' ? 'market' : undefined} emojiSize={22} style={{ width: 48, height: 48, borderRadius: radius.chip }} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Txt v="bodyMedium" style={{ fontSize: 15 }} numberOfLines={2}>
                          {l.name}
                        </Txt>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Txt v="caption" color={C.brand}>
                            {won(l.price * l.qty)}
                          </Txt>
                          {l.temp ? <TempBadge temp={l.temp} /> : null}
                          {ql?.sold_out ? <Chip small label="품절" tone="danger" /> : null}
                        </View>
                      </View>
                      <Stepper value={l.qty} onChange={(n) => setQty(l.product_id, n)} />
                    </View>
                  );
                })}
              </View>
            );
          })}

          <QuoteCard quote={q} run={quote.data?.run} loading={quote.loading || stale} error={quote.error} onRetry={quote.reload} />
        </>
      )}

      <DestinationSheet visible={destOpen} onClose={() => setDestOpen(false)} />
      <Sheet visible={confirmOpen} onClose={() => setConfirmOpen(false)} title="이대로 주문할까요">
        {q ? (
          <View style={{ gap: space.s }}>
            <View style={{ gap: 4, paddingBottom: space.s, borderBottomWidth: 1, borderBottomColor: C.line }}>
              {q.lines.map((l) => (
                <View key={l.product_id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.m }}>
                  <Txt v="caption" style={{ flex: 1, fontSize: 14, lineHeight: 20 }} numberOfLines={1}>
                    {`${l.name} × ${l.qty}`}
                  </Txt>
                  <Txt v="caption" color={C.sub} style={{ fontSize: 14, lineHeight: 20 }}>
                    {won(l.line_total)}
                  </Txt>
                </View>
              ))}
            </View>
            <ConfirmRow label="합계" value={won(q.total)} strong />
            <ConfirmRow label="가게" value={`${q.groups.length}곳`} />
            <ConfirmRow label="도착 예상" value={`약 ${q.eta_min}분`} />
            <ConfirmRow label="배송지" value={q.destination.name} />
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: space.s }}>
          <Button label="닫기" kind="outline" onPress={() => setConfirmOpen(false)} style={{ flex: 1 }} />
          <Button label="주문하기" onPress={() => void placeOrder()} disabled={!canOrder} style={{ flex: 2 }} />
        </View>
      </Sheet>
      <Sheet visible={loginOpen} onClose={() => setLoginOpen(false)} title="시연 로그인">
        <Txt v="caption" color={C.sub} style={{ fontSize: 14 }}>
          주문은 로그인한 고객만 할 수 있어요. 시연 계정으로 바로 들어가요.
        </Txt>
        <DemoLogin
          only="customer"
          onDone={() => {
            setLoginOpen(false);
          }}
        />
      </Sheet>
    </Screen>
  );
}

function ConfirmRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.m }}>
      <Txt v="caption" color={C.sub} style={{ fontSize: 14 }}>
        {label}
      </Txt>
      <Txt v={strong ? 'title' : 'bodyMedium'} color={strong ? C.brand : C.ink} style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Txt>
    </View>
  );
}
