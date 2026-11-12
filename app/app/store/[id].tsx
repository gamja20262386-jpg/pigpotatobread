// 가게: 큰 틴트 타일 + serif 이름 + 이야기 + 영업·준비 시간 → 상품 행
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { api } from '../../src/api';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { ProductRow } from '../../src/components/ProductRow';
import { Screen, StackHeader } from '../../src/components/Screen';
import { Empty, ErrorView, Loading } from '../../src/components/States';
import { openChip, storeTint } from '../../src/components/StoreCard';
import { Txt } from '../../src/components/Txt';
import { cartCount, useCart } from '../../src/store/cart';
import { useSession } from '../../src/store/session';
import { useResource } from '../../src/useResource';
import { color as C, radius, space, won } from '../../src/theme';

export default function StoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const demoTime = useSession((s) => s.demoTime);
  const res = useResource(id ? `store:${id}:${demoTime}` : null, () => api.store(String(id)));
  const lines = useCart((s) => s.lines);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const store = res.data?.store;
  const products = res.data?.products ?? [];
  const count = cartCount(lines);
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);

  return (
    <Screen
      header={<StackHeader title={store?.name ?? '가게'} />}
      footer={count > 0 ? <Button label={`장바구니 보기 · ${count}개 · ${won(total)}`} onPress={() => router.push('/cart')} /> : undefined}
      onRefresh={res.reload}
    >
      {res.loading && !res.data ? <Loading label="가게를 불러오는 중이에요" /> : null}
      {res.error && !res.data ? <ErrorView message={res.error} onRetry={res.reload} /> : null}
      {store ? (
        <>
          <View style={{ gap: space.m }}>
            <View style={{ height: 180, borderRadius: radius.card, backgroundColor: storeTint(store.id), alignItems: 'center', justifyContent: 'center', opacity: store.is_open ? 1 : 0.6 }}>
              <Txt style={{ fontSize: 84, lineHeight: 100 }}>{store.icon}</Txt>
            </View>
            <View style={{ gap: 4 }}>
              <Txt v="label" color={C.sub}>
                {store.kind === 'market' ? 'DONGMUN MARKET' : 'JEJU RESTAURANT'}
              </Txt>
              <Txt v="display">{store.name}</Txt>
              <Txt v="body" color={C.sub}>
                {store.story}
              </Txt>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <Chip label={openChip(store).label} tone={openChip(store).tone === 'neutral' ? 'outline' : openChip(store).tone} />
              <Chip label={`${store.open}–${store.close}`} />
              <Chip label={`준비 ${store.prep_min}분`} />
              {store.kind === 'market' ? <Chip label="공동 집하 묶음 배송" tone="sea" /> : <Chip label={`배달비 ${won(store.delivery_fee)}`} tone="brand" />}
              <Chip label={`★ ${store.rating.toFixed(1)}`} />
            </View>
            {!store.is_open ? (
              <Txt v="caption" color={C.warn}>
                지금은 영업 전이거나 마감했어요. 담아 두면 하르방이 점검 때 알려 드려요.
              </Txt>
            ) : null}
          </View>
          <View>
            {products.length ? (
              products.map((p) => {
                const qty = lines.find((l) => l.product_id === p.id)?.qty ?? 0;
                return (
                  <ProductRow
                    key={p.id}
                    product={p}
                    qty={qty}
                    onQty={(n) =>
                      qty === 0
                        ? add({ product_id: p.id, name: p.name, price: p.price, store_id: p.store_id, store_name: p.store_name || store.name, emoji: p.emoji, temp: p.temp }, n)
                        : setQty(p.id, n)
                    }
                  />
                );
              })
            ) : (
              <Empty title="아직 등록된 상품이 없어요" />
            )}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
