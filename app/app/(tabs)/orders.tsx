// 주문 목록 (GET /orders, 로그인 필요)
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '../../src/api';
import { Chip } from '../../src/components/Chip';
import { DemoLogin } from '../../src/components/DemoLogin';
import { Screen } from '../../src/components/Screen';
import { Empty, ErrorView, Loading } from '../../src/components/States';
import { Txt } from '../../src/components/Txt';
import { useSession } from '../../src/store/session';
import type { Order } from '../../src/types';
import { fmtTime } from '../../src/format';
import { useResource } from '../../src/useResource';
import { color as C, radius, space, won } from '../../src/theme';

export default function OrdersScreen() {
  const token = useSession((s) => s.token);
  const orders = useResource(token ? `orders:${token}` : null, () => api.orders());
  const reload = orders.reload;
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return (
    <Screen tab onRefresh={token ? orders.reload : undefined}>
      <View style={{ gap: space.s, paddingTop: space.s }}>
        <Txt v="label" color={C.sub}>
          MY ORDERS
        </Txt>
        <Txt v="display">주문한 것들이 오고 있어요</Txt>
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
        <Empty title="아직 주문이 없어요" body="하르방에게 한 문장으로 말해 보세요" action={{ label: '하르방에게 말하기', onPress: () => router.navigate('/agent') }} />
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
  return (
    <Pressable
      onPress={() => router.push(`/order/${o.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => ({ backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, padding: space.l, gap: space.s, opacity: pressed ? 0.8 : 1 })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Chip small label={o.status_label} tone={done ? 'leaf' : 'brand'} />
        <Txt v="caption" color={C.sub}>
          {fmtTime(o.created_at)}
        </Txt>
      </View>
      <Txt v="serifTitle" style={{ fontSize: 17, lineHeight: 24 }} numberOfLines={1}>
        {stores.length > 2 ? `${stores.slice(0, 2).join(' · ')} 외 ${stores.length - 2}곳` : stores.join(' · ')}
      </Txt>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Txt v="caption" color={C.sub}>
          {`${o.destination.name}${o.agent_run_id ? ' · 하르방 제안' : ''}`}
        </Txt>
        <Txt v="bodyMedium" color={C.brand}>
          {won(o.quote.total)}
        </Txt>
      </View>
    </Pressable>
  );
}
