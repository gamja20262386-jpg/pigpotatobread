// 주문 목록 (GET /orders, 로그인 필요)
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '../../src/api';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { DemoLogin } from '../../src/components/DemoLogin';
import { Screen } from '../../src/components/Screen';
import { quoteToLines } from '../../src/components/ProposalCard';
import { ErrorView, Loading } from '../../src/components/States';
import { Txt } from '../../src/components/Txt';
import { useCart } from '../../src/store/cart';
import { useSession } from '../../src/store/session';
import type { Order } from '../../src/types';
import { fmtTime } from '../../src/format';
import { useResource } from '../../src/useResource';
import { color as C, radius, space, won } from '../../src/theme';

export default function OrdersScreen() {
  const token = useSession((s) => s.token);
  const orders = useResource(token ? `orders:${token}` : null, () => api.orders());
  const reload = orders.reload;
  const list = orders.data?.orders;
  // 제목은 상태에 맞게: 없음 / 다 도착 / 오는 중
  const title = !token || !list ? '주문 내역' : list.length === 0 ? '아직 주문이 없어요' : list.every((o) => o.status === 'delivered') ? '주문 내역' : '주문한 것들이 오고 있어요';
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return (
    <Screen tab onRefresh={token ? orders.reload : undefined}>
      <View style={{ gap: space.s, paddingTop: space.s }}>
        <Txt v="label" color={C.sub}>
          내 주문
        </Txt>
        <Txt v="display">{title}</Txt>
      </View>
      {!token ? (
        <View style={{ backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, padding: space.xl, gap: space.m }}>
          <Txt v="bodyMedium">시연 로그인하면 주문을 볼 수 있어요</Txt>
          <DemoLogin only="customer" />
        </View>
      ) : orders.error && !orders.data ? (
        <ErrorView message={orders.error} onRetry={orders.reload} />
      ) : orders.loading && !orders.data ? (
        <Loading />
      ) : orders.data && orders.data.orders.length === 0 ? (
        <Button label="하르방에게 말하기" kind="outline" small onPress={() => router.navigate('/agent')} style={{ alignSelf: 'flex-start' }} />
      ) : (
        <View style={{ gap: space.m }}>
          {(orders.data?.orders ?? []).map((o) => (
            <OrderCard key={o.id} order={o} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function OrderCard({ order: o }: { order: Order }) {
  const done = o.status === 'delivered';
  const stores = o.quote.groups.map((g) => g.store_name);
  const replace = useCart((s) => s.replace);
  const first = o.quote.lines[0];
  const items = first ? `${first.name}${o.quote.lines.length > 1 ? ` 외 ${o.quote.lines.length - 1}개` : ''}` : '';
  // 재주문: 같은 상품·수량으로 장바구니를 채우고 장바구니로(가격·재고는 장바구니가 다시 확인)
  const reorder = () => {
    replace(quoteToLines(o.quote));
    router.push('/cart');
  };
  // 버튼 안에 버튼을 넣지 않는다(웹 <button> 중첩 오류): 위쪽만 눌러서 추적 화면, 아래 줄은 합계 + 재주문
  return (
    <View style={{ backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, padding: space.l, gap: space.s }}>
      <Pressable onPress={() => router.push(`/order/${o.id}`)} accessibilityRole="button" style={({ pressed }) => ({ gap: space.s, opacity: pressed ? 0.7 : 1 })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Chip small label={o.status_label} tone={done ? 'leaf' : 'brand'} />
          <Txt v="caption" color={C.sub}>
            {fmtTime(o.created_at)}
          </Txt>
        </View>
        <Txt v="serifTitle" style={{ fontSize: 17, lineHeight: 24 }} numberOfLines={1}>
          {items}
        </Txt>
        <Txt v="caption" color={C.sub} numberOfLines={1}>
          {`${stores.length > 2 ? `${stores.slice(0, 2).join(' · ')} 외 ${stores.length - 2}곳` : stores.join(' · ')} · ${o.destination.name}`}
        </Txt>
      </Pressable>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt v="bodyMedium" color={C.brand}>
          {won(o.quote.total)}
        </Txt>
        <Button label="재주문" kind="outline" small onPress={reorder} style={{ height: 36 }} />
      </View>
    </View>
  );
}
