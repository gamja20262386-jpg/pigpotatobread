// 동문시장(v0.2 F·O): 편집형 머리 + 상태 칩 → 묶음 배송 아이콘 띠(ⓘ 규칙 시트) → 시장 인기 메뉴 레일 → 라벨 필터 → 목록형 가게 카드
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View, type ScrollViewInstance } from 'react-native';
import { api } from '../../src/api';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { Icon } from '../../src/components/Icon';
import { Screen, SectionTitle } from '../../src/components/Screen';
import { Sheet } from '../../src/components/Sheet';
import { Empty, ErrorView, Loading } from '../../src/components/States';
import { StoreRow } from '../../src/components/StoreCard';
import { Thumb } from '../../src/components/Thumb';
import { Txt } from '../../src/components/Txt';
import { useDestination } from '../../src/hooks';
import { useAgent } from '../../src/store/agent';
import { useCart } from '../../src/store/cart';
import { useSession } from '../../src/store/session';
import type { Market, Product } from '../../src/types';
import { useResource } from '../../src/useResource';
import { color as C, font, radius, space, won } from '../../src/theme';

export default function MarketScreen() {
  const demoTime = useSession((s) => s.demoTime);
  const { id: destId, market } = useDestination();
  const stores = useResource(`market-stores:${demoTime}:${destId}`, () => api.stores({ kind: 'market', destination_id: destId }));
  const products = useResource(`market-products:${demoTime}`, () => api.products());
  const hasProducts = !!products.data || !!products.error;
  const [label, setLabel] = useState<string | null>(null);
  // 홈 "동문시장 장보기" 칸에서 라벨을 골라 오면 그 라벨로 거른다
  // 걸러진 목록이 화면 아래에 있으니 그 자리로 내려 준다
  const params = useLocalSearchParams<{ label?: string; at?: string }>();
  const scroll = useRef<ScrollViewInstance>(null);
  const listY = useRef<number | null>(null);
  const [listReady, setListReady] = useState(false);
  useEffect(() => {
    if (params.label) setLabel(String(params.label));
  }, [params.label, params.at]);
  useEffect(() => {
    if (!params.label || !listReady || !hasProducts) return;
    const t = setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, (listY.current ?? 0) - space.s), animated: true }), 300);
    return () => clearTimeout(t);
  }, [params.label, params.at, listReady, hasProducts]);
  const send = useAgent((s) => s.send);
  const busy = useAgent((s) => s.busy);

  const all = stores.data?.stores ?? [];
  const labels = [...new Set(all.map((s) => s.label))];
  const shown = all.filter((s) => !label || s.label === label);
  const openCount = all.filter((s) => s.is_open).length;
  const marketIds = new Set(all.map((s) => s.id));
  const popular = (products.data?.products ?? []).filter((p) => p.popular && marketIds.has(p.store_id));

  return (
    <Screen
      tab
      scrollRef={scroll}
      onRefresh={() => {
        void market.reload();
        void stores.reload();
        void products.reload();
      }}
    >
      <View style={{ gap: space.s, paddingTop: space.s }}>
        <Txt v="label" color={C.sub}>
          JEJU · DONGMUN MARKET
        </Txt>
        <Txt v="display">시장 가게를 한 번에 묶어 보내요</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.xs }}>
          {market.data ? (
            <>
              <Chip small label={`영업 ${market.data.hours.open}–${market.data.hours.close}`} tone="leaf" />
              {market.data.hours.night_market ? <Chip small label={`야시장 ${market.data.hours.night_market.replace('-', '–')}`} tone="brand" /> : null}
            </>
          ) : null}
          {stores.data ? <Chip small label={`문 연 가게 ${openCount}/${all.length}`} /> : null}
        </View>
      </View>

      <BundleStrip
        market={market.data}
        busy={busy}
        onDelegate={() => {
          void send('동문시장 가게들로 2명 저녁거리 3만원 이하');
          router.navigate('/agent');
        }}
      />

      {stores.error && !stores.data ? <ErrorView message={stores.error} onRetry={stores.reload} /> : null}
      {stores.loading && !stores.data ? <Loading label="시장 가게를 불러오는 중이에요" /> : null}

      {/* 시장 인기 메뉴 */}
      {stores.data ? (
        <View style={{ gap: space.m }}>
          <SectionTitle title="시장 인기 메뉴" />
          {products.loading && !products.data ? <Loading /> : null}
          {products.error && !products.data ? <ErrorView compact message={products.error} onRetry={products.reload} /> : null}
          {popular.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.screen }} contentContainerStyle={{ paddingHorizontal: space.screen, gap: space.m }}>
              {popular.map((p) => (
                <PopularCard key={p.id} product={p} category={all.find((s) => s.id === p.store_id)?.category} closed={all.find((s) => s.id === p.store_id)?.is_open === false} />
              ))}
            </ScrollView>
          ) : products.data ? (
            <Empty title="인기 메뉴가 아직 없어요" />
          ) : null}
        </View>
      ) : null}

      {stores.data ? (
        <View
          style={{ gap: space.s }}
          onLayout={(e) => {
            listY.current = e.nativeEvent.layout.y;
            setListReady(true);
          }}
        >
          <SectionTitle title="시장 가게" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.screen, marginTop: space.s }} contentContainerStyle={{ paddingHorizontal: space.screen, gap: 6 }}>
            <Chip label="전체" pill active={!label} onPress={() => setLabel(null)} />
            {labels.map((l) => (
              <Chip key={l} label={l} pill active={label === l} onPress={() => setLabel(label === l ? null : l)} />
            ))}
          </ScrollView>
          {shown.length ? (
            <View>
              {shown.map((s, i) => (
                <StoreRow key={s.id} store={s} last={i === shown.length - 1} />
              ))}
            </View>
          ) : (
            <Empty title="이 라벨 가게가 없어요" action={{ label: '전체 보기', onPress: () => setLabel(null) }} />
          )}
        </View>
      ) : null}
    </Screen>
  );
}

function PopularCard({ product: p, category, closed }: { product: Product; category?: string; closed?: boolean }) {
  const add = useCart((s) => s.add);
  const qty = useCart((s) => s.lines.find((l) => l.product_id === p.id)?.qty ?? 0);
  const out = p.sold_out || p.stock <= 0;
  const full = qty >= p.stock;
  return (
    <View style={{ width: 140, gap: space.s, opacity: out || closed ? 0.5 : 1 }}>
      <Pressable onPress={() => router.push(`/product/${p.id}`)} accessibilityRole="button" accessibilityLabel={`${p.name} 보기`} style={{ gap: space.s }}>
        <Thumb image={p.image} emoji={p.emoji} category={category} emojiSize={44} style={{ width: 140, height: 105 }} />
        <View style={{ gap: 1 }}>
          <Txt v="caption" color={C.sub} numberOfLines={1}>
            {p.store_name}
          </Txt>
          <Txt v="bodyMedium" style={{ fontFamily: font.bold, fontSize: 14, lineHeight: 20, minHeight: 40 }} numberOfLines={2}>
            {p.name}
          </Txt>
          <Txt v="captionMedium" color={C.brand} style={{ fontSize: 14 }}>
            {won(p.price)}
          </Txt>
        </View>
      </Pressable>
      <Button
        small
        kind="outline"
        label={out ? '품절' : closed ? '준비 중' : qty ? `${qty}개 담음 · 더 담기` : '담기'}
        disabled={out || full || closed}
        onPress={() => add({ product_id: p.id, name: p.name, price: p.price, store_id: p.store_id, store_name: p.store_name, emoji: p.emoji, temp: p.temp })}
        style={{ height: 36 }}
      />
    </View>
  );
}

// 묶음 배송 띠(v0.2 O): 아이콘 3개(여러 가게 → 집하장 → 한 번에) + ⓘ 바텀시트(배송비 규칙·하르방에게 맡기기)
function BundleStrip({ market, busy, onDelegate }: { market?: Market; busy: boolean; onDelegate: () => void }) {
  const [info, setInfo] = useState(false);
  const fee = market?.bundle_fee;
  const steps = [
    { emoji: '🛍', label: '여러 가게' },
    { emoji: '📦', label: '집하장' },
    { emoji: '🛵', label: '한 번에' },
  ];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, paddingVertical: space.m, paddingLeft: space.s }}>
      {steps.map((st, i) => (
        <View key={st.label} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
            <Txt style={{ fontSize: 24, lineHeight: 30 }}>{st.emoji}</Txt>
            <Txt v="captionMedium" numberOfLines={1}>
              {st.label}
            </Txt>
          </View>
          {i < steps.length - 1 ? <Icon name="right" size={16} color={C.sub} /> : null}
        </View>
      ))}
      <Pressable onPress={() => setInfo(true)} accessibilityRole="button" accessibilityLabel="묶음 배송비 규칙 보기" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="info" size={20} color={C.sub} />
      </Pressable>
      <Sheet visible={info} onClose={() => setInfo(false)} title="묶음 배송비">
        <Txt v="body">
          {fee ? `시장 가게 1곳 ${won(fee.base)}, 1곳 늘 때마다 +${won(fee.per_extra_stall)}, 최대 ${won(fee.max)}` : '가게가 늘어도 배송비는 조금씩만 더해요(상한 있음)'}
        </Txt>
        <Txt v="caption" color={C.sub}>
          {`${market?.hub.name ?? '공동 집하장'}에서 봉투를 나눠 한 번에 출발해요`}
        </Txt>
        <Button
          label="하르방에게 맡기기"
          onPress={() => {
            setInfo(false);
            onDelegate();
          }}
          disabled={busy}
        />
      </Sheet>
    </View>
  );
}
