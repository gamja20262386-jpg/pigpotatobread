// 홈: 워드마크·배송지·장바구니 → 에이전트 카드 → 먼저 챙겼어요 → 카테고리 → 오늘의 동문시장 → 맛집
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { api } from '../../src/api';
import { AgentCard } from '../../src/components/AgentCard';
import { DestinationSheet } from '../../src/components/DestinationSheet';
import { Icon } from '../../src/components/Icon';
import { NudgeCard } from '../../src/components/NudgeCard';
import { Screen, SectionTitle } from '../../src/components/Screen';
import { Empty, ErrorView, Loading } from '../../src/components/States';
import { StoreCard, StoreRow } from '../../src/components/StoreCard';
import { Txt } from '../../src/components/Txt';
import { useDestination } from '../../src/hooks';
import { useAgent } from '../../src/store/agent';
import { cartCount, cartItems, useCart } from '../../src/store/cart';
import { useSession } from '../../src/store/session';
import type { Nudge } from '../../src/types';
import { useResource } from '../../src/useResource';
import { color as C, radius, space } from '../../src/theme';

export default function Home() {
  const [destOpen, setDestOpen] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const { id: destId, current } = useDestination();
  const lines = useCart((s) => s.lines);
  const demoTime = useSession((s) => s.demoTime);
  const token = useSession((s) => s.token);
  const dismissed = useSession((s) => s.dismissed);
  const dismiss = useSession((s) => s.dismiss);
  const send = useAgent((s) => s.send);

  const categories = useResource('categories', () => api.categories());
  const stores = useResource(`stores:${demoTime}`, () => api.stores());
  const items = cartItems(lines);
  const nudges = useResource(`nudges:${JSON.stringify(items)}:${destId}:${demoTime}:${token}:${dismissed.join(',')}`, () => api.nudges(items, destId, dismissed));

  const market = (stores.data?.stores ?? []).filter((s) => s.kind === 'market');
  const restaurants = (stores.data?.stores ?? []).filter((s) => s.kind === 'restaurant' && (!category || s.category === category));
  const visibleNudges = (nudges.data?.nudges ?? []).filter((n) => !dismissed.includes(n.id));
  const count = cartCount(lines);

  const act = (n: Nudge) => {
    if (!n.action) return;
    if (n.action.type === 'ask') {
      void send(n.action.prompt);
      router.navigate('/agent');
    } else router.push(n.action.route as never);
  };
  const reloadAll = () => {
    void categories.reload();
    void stores.reload();
    void nudges.reload();
  };

  return (
    <Screen
      tab
      onRefresh={reloadAll}
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.screen, paddingTop: space.s, gap: space.s }}>
          <Txt v="display" color={C.brand} style={{ fontSize: 26 }}>
            제주잇
          </Txt>
          <Pressable
            onPress={() => setDestOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="배송지 바꾸기"
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, marginLeft: space.xs }}
          >
            <Icon name="pin" size={16} color={C.sea} />
            <Txt v="captionMedium" numberOfLines={1} style={{ flexShrink: 1 }}>
              {current?.name ?? '배송지 고르기'}
            </Txt>
            <Icon name="down" size={14} color={C.sub} />
          </Pressable>
          <Pressable onPress={() => router.push('/cart')} accessibilityRole="button" accessibilityLabel={`장바구니 ${count}개`} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="bag" size={24} />
            {count > 0 ? (
              <View style={{ position: 'absolute', top: 4, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                <Txt v="label" color={C.white} style={{ fontSize: 10, letterSpacing: 0 }}>
                  {count}
                </Txt>
              </View>
            ) : null}
          </Pressable>
        </View>
      }
    >
      <AgentCard />

      {/* 하르방이 먼저 챙겼어요 */}
      {visibleNudges.length > 0 ? (
        <View style={{ gap: space.m }}>
          <SectionTitle title="하르방이 먼저 챙겼어요" />
          {visibleNudges.map((n) => (
            <NudgeCard key={n.id} nudge={n} onDismiss={() => dismiss(n.id)} onAct={() => act(n)} />
          ))}
        </View>
      ) : null}

      {/* 카테고리 11칸(4열) */}
      {categories.error && !categories.data ? (
        <ErrorView message={categories.error} onRetry={reloadAll} />
      ) : categories.loading && !categories.data ? (
        <Loading />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: space.m }}>
          {(categories.data?.categories ?? []).map((c) => {
            const on = category === c.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => (c.id === 'market' ? router.navigate('/market') : setCategory(on ? null : c.id))}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={{ width: '25%', alignItems: 'center', gap: 4 }}
              >
                <View style={{ width: 56, height: 56, borderRadius: radius.card, backgroundColor: on ? C.brand : c.id === 'market' ? C.brandSoft : C.card, borderWidth: 1, borderColor: on ? C.brand : C.line, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt style={{ fontSize: 26, lineHeight: 32 }}>{c.emoji}</Txt>
                </View>
                <Txt v="caption" numberOfLines={1} color={on ? C.brandDark : C.ink} style={{ fontSize: 12 }}>
                  {c.name}
                </Txt>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* 오늘의 동문시장 */}
      <View style={{ gap: space.m }}>
        <SectionTitle title="오늘의 동문시장" action="전체 보기" onAction={() => router.navigate('/market')} />
        {stores.loading && !stores.data ? <Loading /> : null}
        {stores.error && !stores.data && !categories.error ? <ErrorView compact message={stores.error} onRetry={stores.reload} /> : null}
        {market.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.screen }} contentContainerStyle={{ paddingHorizontal: space.screen, gap: space.m }}>
            {market.map((s) => (
              <StoreCard key={s.id} store={s} width={140} />
            ))}
          </ScrollView>
        ) : null}
      </View>

      {/* 맛집 */}
      {stores.data ? (
        <View style={{ gap: space.xs }}>
          <SectionTitle title={category ? `${categories.data?.categories.find((c) => c.id === category)?.name ?? ''} 맛집` : '제주 맛집'} action={category ? '전체' : undefined} onAction={() => setCategory(null)} />
          <View style={{ height: space.s }} />
          {restaurants.length ? restaurants.map((s) => <StoreRow key={s.id} store={s} />) : <Empty title="이 종류 가게는 아직 없어요" body="다른 카테고리를 골라 보세요" />}
        </View>
      ) : null}

      <DestinationSheet visible={destOpen} onClose={() => setDestOpen(false)} />
    </Screen>
  );
}
