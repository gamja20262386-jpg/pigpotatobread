// 가게 상세(v0.2 D): 사진 16:9(뒤로·찜) → 정보 표 → 배달/포장 → 메뉴 검색 + 그룹 바로가기 → 메뉴 행 → 하단 장바구니 바
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, TextInput, View, type ScrollViewInstance } from 'react-native';
import { api } from '../../src/api';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { Icon } from '../../src/components/Icon';
import { MenuRow } from '../../src/components/MenuRow';
import { Screen } from '../../src/components/Screen';
import { Empty, ErrorView, Loading } from '../../src/components/States';
import { etaText, minOrderText, openChip } from '../../src/components/StoreCard';
import { Thumb } from '../../src/components/Thumb';
import { Txt } from '../../src/components/Txt';
import { useDestination, useMarket } from '../../src/hooks';
import { cartCount, useCart } from '../../src/store/cart';
import { useSession } from '../../src/store/session';
import type { MenuGroup, Product } from '../../src/types';
import { useResource } from '../../src/useResource';
import { color as C, floatShadow, font, radius, space, won } from '../../src/theme';

const GROUPS: MenuGroup[] = ['대표 메뉴', '메뉴', '사이드·음료'];

export default function StoreScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const demoTime = useSession((s) => s.demoTime);
  const favorites = useSession((s) => s.favorites);
  const toggleFavorite = useSession((s) => s.toggleFavorite);
  const { id: destId } = useDestination();
  const market = useMarket();
  const res = useResource(id ? `store:${id}:${demoTime}:${destId}` : null, () => api.store(String(id), destId));
  const lines = useCart((s) => s.lines);
  const [mode, setMode] = useState<'delivery' | 'pickup'>('delivery');
  const [q, setQ] = useState('');
  const scroll = useRef<ScrollViewInstance>(null);
  const menuY = useRef(0);
  const groupY = useRef<Record<string, number>>({});

  const store = res.data?.store;
  const products = res.data?.products ?? [];
  const count = cartCount(lines);
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const fav = !!store && favorites.includes(store.id);
  const needle = q.trim().toLowerCase();
  const shown = needle ? products.filter((p) => `${p.name} ${p.description} ${p.tags.join(' ')}`.toLowerCase().includes(needle)) : products;
  const groups = GROUPS.map((g) => ({ name: g, items: shown.filter((p) => (p.group ?? '메뉴') === g) })).filter((g) => g.items.length);
  const qtyOf = (p: Product) => lines.find((l) => l.product_id === p.id)?.qty ?? 0;
  const fee = market.data?.bundle_fee;

  const jump = (g: string) => {
    const y = groupY.current[g];
    if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, menuY.current + y - space.s), animated: true });
  };

  const tipRow = !store
    ? ''
    : mode === 'pickup'
      ? '0원 (포장)'
      : store.kind === 'market'
        ? fee
          ? `동문시장 묶음 배송 ${won(fee.base)}부터, 가게 1곳 늘 때 +${won(fee.per_extra_stall)}, 최대 ${won(fee.max)}`
          : `동문시장 묶음 배송 ${won(store.delivery_tip ?? 3000)}부터`
        : won(store.delivery_tip ?? store.delivery_fee);

  return (
    <Screen
      scrollRef={scroll}
      onRefresh={res.reload}
      footer={
        count > 0 ? (
          <Button label={`${count}개 · 장바구니 보기 · ${won(total)}`} onPress={() => router.push('/cart')} />
        ) : undefined
      }
    >
      {res.loading && !res.data ? (
        <>
          <BackBar />
          <Loading label="가게를 불러오는 중이에요" />
        </>
      ) : null}
      {res.error && !res.data ? (
        <>
          <BackBar />
          <ErrorView message={res.error} onRetry={res.reload} />
        </>
      ) : null}
      {store ? (
        <>
          {/* 사진 16:9 + 뒤로·찜 */}
          <View style={{ marginHorizontal: -space.screen, marginTop: -space.m }}>
            <Thumb image={store.image} emoji={store.icon} category={store.category} emojiSize={88} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 0, opacity: store.is_open ? 1 : 0.6 }} />
            <View style={{ position: 'absolute', top: space.s, left: space.m, right: space.m, flexDirection: 'row', justifyContent: 'space-between' }}>
              <RoundButton icon="back" label="뒤로" onPress={goBack} />
              <RoundButton icon="heart" label={fav ? '찜 해제' : '찜하기'} active={fav} onPress={() => toggleFavorite(store.id)} />
            </View>
          </View>

          {/* 정보 */}
          <View style={{ gap: space.s }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              <Chip small label={openChip(store).label} tone={openChip(store).tone === 'neutral' ? 'outline' : openChip(store).tone} />
              {store.kind === 'market' ? <Chip small label="시장 묶음" tone="sea" /> : null}
              {store.pickup ? <Chip small label="포장 가능" tone="leaf" /> : null}
            </View>
            <Txt v="display" style={{ fontSize: 24, lineHeight: 32 }}>
              {store.name}
            </Txt>
            <Txt v="bodyMedium">{`★ ${store.rating.toFixed(1)} · ${store.label}`}</Txt>
            <Txt v="body" color={C.sub} style={{ fontSize: 15, lineHeight: 22 }}>
              {store.story}
            </Txt>
            {!store.is_open ? (
              <Txt v="caption" color={C.warn}>
                {`지금은 준비 중이에요 · ${store.open} 오픈`}
              </Txt>
            ) : null}
            {store.in_zone === false ? (
              <Txt v="caption" color={C.danger}>
                지금 배송지는 배달 가능 거리 밖이에요.
              </Txt>
            ) : null}
          </View>

          {/* 배달 / 포장 + 정보 표 */}
          <View style={{ backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.line }}>
              {(['delivery', 'pickup'] as const).map((m) => {
                const on = mode === m;
                const off = m === 'pickup' && !store.pickup;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setMode(m)}
                    disabled={off}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on, disabled: off }}
                    style={{ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: on ? C.brand : 'transparent', opacity: off ? 0.4 : 1 }}
                  >
                    <Txt v="captionMedium" color={on ? C.ink : C.sub} style={{ fontSize: 15, lineHeight: 20, fontFamily: on ? font.bold : font.medium }}>
                      {m === 'delivery' ? '배달' : '포장'}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ padding: space.l, gap: space.s }}>
              <InfoRow label="최소주문" value={minOrderText(store).replace('최소주문 ', '')} />
              <InfoRow label={mode === 'pickup' ? '준비시간' : '배달시간'} value={mode === 'pickup' ? `${store.prep_min}분` : etaText(store)} />
              <InfoRow label="배달팁" value={tipRow} />
              <InfoRow label="영업시간" value={`${store.open}–${store.close}`} />
              {mode === 'pickup' ? (
                <Txt v="caption" color={C.sub}>
                  포장 주문은 준비 중 · 지금은 배달로 주문돼요
                </Txt>
              ) : null}
            </View>
          </View>

          {/* 메뉴 */}
          <View
            onLayout={(e) => {
              menuY.current = e.nativeEvent.layout.y;
            }}
            style={{ gap: space.s }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s, height: 44, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, paddingHorizontal: space.m }}>
              <Icon name="search" size={18} color={C.sub} />
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="이 가게 메뉴 찾기"
                placeholderTextColor={C.sub}
                accessibilityLabel="가게 안 메뉴 검색"
                style={{ flex: 1, minWidth: 0, height: 42, fontFamily: font.regular, fontSize: 15, color: C.ink }}
              />
              {q ? (
                <Pressable onPress={() => setQ('')} accessibilityRole="button" accessibilityLabel="검색어 지우기" hitSlop={8}>
                  <Icon name="close" size={16} color={C.sub} />
                </Pressable>
              ) : null}
            </View>
            {groups.length > 1 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {groups.map((g) => (
                  <Chip key={g.name} label={`${g.name} ${g.items.length}`} pill tone="outline" onPress={() => jump(g.name)} />
                ))}
              </View>
            ) : null}
            {groups.length ? (
              groups.map((g) => (
                <View
                  key={g.name}
                  onLayout={(e) => {
                    groupY.current[g.name] = e.nativeEvent.layout.y;
                  }}
                  style={{ paddingTop: space.m }}
                >
                  <Txt v="title" style={{ fontSize: 18, lineHeight: 24 }}>
                    {g.name}
                  </Txt>
                  {g.items.map((p, i) => (
                    <MenuRow key={p.id} product={p} category={store.category} inCart={qtyOf(p)} last={i === g.items.length - 1} />
                  ))}
                </View>
              ))
            ) : (
              <Empty title={needle ? `'${q.trim()}' 메뉴가 없어요` : '아직 등록된 메뉴가 없어요'} action={needle ? { label: '검색어 지우기', onPress: () => setQ('') } : undefined} />
            )}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

function BackBar() {
  return (
    <View style={{ flexDirection: 'row' }}>
      <RoundButton icon="back" label="뒤로" onPress={goBack} />
    </View>
  );
}

function RoundButton({ icon, label, onPress, active }: { icon: 'back' | 'heart'; label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 }, floatShadow]}
    >
      <Icon name={icon} size={22} color={active ? C.brand : C.ink} fill={active ? C.brand : 'none'} />
    </Pressable>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.m }}>
      <Txt v="caption" color={C.sub} style={{ width: 64, fontSize: 14, lineHeight: 20 }}>
        {label}
      </Txt>
      <Txt v="caption" style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>
        {value}
      </Txt>
    </View>
  );
}
