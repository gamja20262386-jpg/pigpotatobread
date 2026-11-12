// 메뉴 상세(v0.2 E, 모달): 큰 사진/타일 → 이름·설명·가격·온도·재고·가게 → 수량 + "N원 담기". 품절이면 하르방에게 대체 메뉴 묻기.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { api } from '../../src/api';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { Icon } from '../../src/components/Icon';
import { Screen, StackHeader } from '../../src/components/Screen';
import { ErrorView, Loading } from '../../src/components/States';
import { Stepper } from '../../src/components/Stepper';
import { TempBadge } from '../../src/components/TempBadge';
import { Thumb } from '../../src/components/Thumb';
import { Txt } from '../../src/components/Txt';
import { useAgent } from '../../src/store/agent';
import { cartCount, useCart } from '../../src/store/cart';
import { useSession } from '../../src/store/session';
import { useResource } from '../../src/useResource';
import { color as C, font, radius, space, won } from '../../src/theme';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const demoTime = useSession((s) => s.demoTime);
  const res = useResource(id ? `product:${id}:${demoTime}` : null, () => api.product(String(id)));
  const add = useCart((s) => s.add);
  const inCart = useCart((s) => s.lines.find((l) => l.product_id === id)?.qty ?? 0);
  const send = useAgent((s) => s.send);
  const busy = useAgent((s) => s.busy);
  const [qty, setQty] = useState(1);
  const lines = useCart((s) => s.lines);
  const count = cartCount(lines);
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  // 담으면 화면에 그대로 있고 짧은 알림 + 장바구니 바(딥링크로 열었을 때 뒤로 갈 곳이 없어도 안전)
  const [toast, setToast] = useState(false);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  const p = res.data?.product;
  const store = res.data?.store;
  const out = !!p && (p.sold_out || p.stock <= 0);
  const room = p ? Math.max(0, p.stock - inCart) : 0;

  const put = () => {
    if (!p || !store) return;
    add({ product_id: p.id, name: p.name, price: p.price, store_id: p.store_id, store_name: p.store_name || store.name, emoji: p.emoji, temp: p.temp }, qty);
    setQty(1);
    setToast(true);
  };
  const askAlt = () => {
    if (!p) return;
    void send(`${p.name} 대신 비슷한 거`);
    router.navigate('/agent');
  };

  return (
    <Screen
      header={<StackHeader title={p?.name ?? '메뉴'} />}
      onRefresh={res.reload}
      footer={
        p && store ? (
          out ? (
            <View style={{ gap: space.s }}>
              <Button label="품절이에요" disabled />
              <Button label="하르방에게 대체 메뉴 물어보기" kind="outline" onPress={askAlt} disabled={busy} />
            </View>
          ) : (
            <View style={{ gap: space.s }}>
              {toast ? (
                <View pointerEvents="none" style={{ position: 'absolute', top: -60, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.basalt, borderRadius: radius.pill, paddingHorizontal: space.l, paddingVertical: space.s }}>
                  <Icon name="check" size={14} color={C.white} stroke={3} />
                  <Txt v="captionMedium" color={C.white}>
                    장바구니에 담았어요
                  </Txt>
                </View>
              ) : null}
              {count > 0 ? <Button label={`${count}개 · 장바구니 보기 · ${won(total)}`} kind="dark" onPress={() => router.push('/cart')} /> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
                <Stepper value={qty} onChange={(n) => setQty(Math.max(1, n))} min={1} max={Math.max(1, room)} />
                <Button label={room > 0 ? `${won(p.price * qty)} 담기` : '재고만큼 담았어요'} onPress={put} disabled={room <= 0} style={{ flex: 1 }} kind={count > 0 ? 'outline' : 'primary'} />
              </View>
            </View>
          )
        ) : undefined
      }
    >
      {res.loading && !res.data ? <Loading label="메뉴를 불러오는 중이에요" /> : null}
      {res.error && !res.data ? <ErrorView message={res.error} onRetry={res.reload} /> : null}
      {p && store ? (
        <>
          <Thumb image={p.image} emoji={p.emoji} category={store.category} emojiSize={96} style={{ width: '100%', aspectRatio: 4 / 3, opacity: out ? 0.5 : 1 }} />
          <View style={{ gap: space.s }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {p.popular ? <Chip small label="대표" tone="brand" /> : null}
              <TempBadge temp={p.temp} />
              {p.temp === 'cold' ? <Chip small label="보냉 포장" tone="sea" /> : null}
              {out ? <Chip small label="품절" tone="danger" /> : p.stock <= 5 ? <Chip small label={`${p.stock}개 남음`} tone="warn" /> : null}
              {p.serves > 1 ? <Chip small label={`${p.serves}인분`} /> : null}
            </View>
            <Txt v="display" style={{ fontSize: 24, lineHeight: 32 }}>
              {p.name}
            </Txt>
            <Txt v="body" color={C.sub}>
              {p.description}
            </Txt>
            <Txt v="title" color={C.brand}>
              {won(p.price)}
            </Txt>
            {out || inCart ? (
              <Txt v="caption" color={C.sub}>
                {out ? '지금은 품절이에요' : `장바구니에 ${inCart}개 담겨 있어요`}
              </Txt>
            ) : null}
          </View>
          <Pressable
            onPress={() => router.push(`/store/${store.id}`)}
            accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.m, backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, padding: space.m, opacity: pressed ? 0.75 : 1 })}
          >
            <Thumb image={store.image} emoji={store.icon} category={store.category} emojiSize={24} style={{ width: 44, height: 44 }} />
            <View style={{ flex: 1 }}>
              <Txt v="bodyMedium" style={{ fontFamily: font.bold, fontSize: 15, lineHeight: 21 }} numberOfLines={1}>
                {store.name}
              </Txt>
              <Txt v="caption" color={C.sub} numberOfLines={1}>
                {`★ ${store.rating.toFixed(1)} · ${store.kind === 'market' ? '동문시장 묶음 배송' : store.label}`}
              </Txt>
            </View>
            <Icon name="right" size={18} color={C.sub} />
          </Pressable>
        </>
      ) : null}
    </Screen>
  );
}
