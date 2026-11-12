// 홈(v0.2 B, 배민형): 배송지·장바구니 → 검색창 → 서비스 탭 → 카테고리 5×2 → 하르방 카드(축소) → 먼저 챙겼어요 → 빠른 배달 → 동문시장 → 별점 높은 가게
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
import { Thumb, categoryTint } from '../../src/components/Thumb';
import { Txt } from '../../src/components/Txt';
import { useDestination } from '../../src/hooks';
import { useAgent } from '../../src/store/agent';
import { cartCount, cartItems, useCart } from '../../src/store/cart';
import { useSession, type Service } from '../../src/store/session';
import type { Nudge, Store } from '../../src/types';
import { useResource } from '../../src/useResource';
import { color as C, font, radius, space } from '../../src/theme';

const SERVICES: { id: Service; label: string }[] = [
  { id: 'delivery', label: '음식배달' },
  { id: 'market', label: '동문시장 장보기' },
  { id: 'pickup', label: '포장' },
];

// 시장 장보기 칸 순서: 많이 찾는 라벨 먼저
const MARKET_FIRST = ['회·해산물', '떡', '꼬치', '반찬', '건어물', '생선구이', '흑돼지', '과일', '제주 간식', '술·안주'];
const marketRank = (label: string) => (MARKET_FIRST.includes(label) ? MARKET_FIRST.indexOf(label) : MARKET_FIRST.length);

const inService = (service: Service) => (s: Store) =>
  service === 'delivery' ? s.kind === 'restaurant' : service === 'market' ? s.kind === 'market' : s.pickup;

export default function Home() {
  const [destOpen, setDestOpen] = useState(false);
  const { id: destId, current } = useDestination();
  const lines = useCart((s) => s.lines);
  const demoTime = useSession((s) => s.demoTime);
  const token = useSession((s) => s.token);
  const dismissed = useSession((s) => s.dismissed);
  const dismiss = useSession((s) => s.dismiss);
  const service = useSession((s) => s.service);
  const setService = useSession((s) => s.setService);
  const send = useAgent((s) => s.send);

  const categories = useResource('categories', () => api.categories());
  const fast = useResource(`stores:fast:${demoTime}:${destId}`, () => api.stores({ sort: 'fast', destination_id: destId }));
  const rated = useResource(`stores:rating:${demoTime}:${destId}`, () => api.stores({ sort: 'rating', destination_id: destId }));
  const items = cartItems(lines);
  const nudges = useResource(`nudges:${JSON.stringify(items)}:${destId}:${demoTime}:${token}:${dismissed.join(',')}`, () => api.nudges(items, destId, dismissed));

  const pick = inService(service);
  const fastList = (fast.data?.stores ?? []).filter((s) => pick(s) && s.is_open && s.in_zone !== false).slice(0, 8);
  const marketList = (fast.data?.stores ?? []).filter((s) => s.kind === 'market').sort((a, b) => Number(b.is_open) - Number(a.is_open)).slice(0, 8);
  const topList = (rated.data?.stores ?? []).filter(pick).slice(0, 5);
  const visibleNudges = (nudges.data?.nudges ?? []).filter((n) => !dismissed.includes(n.id));
  // 서비스 탭마다 5×2 칸이 바뀐다: 음식배달 = 카테고리, 동문시장 = 시장 라벨(→ /market 필터), 포장 = 포장 되는 가게
  const allStores = fast.data?.stores ?? [];
  const grid: { key: string; name: string; emoji: string; tint: string; image?: string | null; label: string; go: () => void }[] =
    service === 'market'
      ? [...new Map(allStores.filter((s) => s.kind === 'market').map((s) => [s.label, s])).values()].sort((a, b) => marketRank(a.label) - marketRank(b.label)).slice(0, 10).map((s) => ({
          key: `m-${s.label}`,
          name: s.label,
          emoji: s.icon,
          tint: categoryTint('market'),
          label: `${s.label} 시장 가게`,
          go: () => router.navigate({ pathname: '/market', params: { label: s.label, at: String(Date.now()) } }),
        }))
      : service === 'pickup'
        ? allStores.filter((s) => s.pickup).slice(0, 10).map((s) => ({
            key: `p-${s.id}`,
            name: s.name,
            emoji: s.icon,
            tint: categoryTint(s.category),
            image: s.image,
            label: `${s.name} 포장 주문`,
            go: () => router.push(`/store/${s.id}`),
          }))
        : (categories.data?.categories ?? [])
            .filter((c) => c.id !== 'market')
            .map((c) => ({ key: c.id, name: c.name, emoji: c.emoji, tint: categoryTint(c.id), label: `${c.name} 가게 목록`, go: () => router.push(`/category/${c.id}`) }));
  const count = cartCount(lines);
  const what = service === 'delivery' ? '맛집' : service === 'market' ? '시장 가게' : '포장 가게';

  const act = (n: Nudge) => {
    if (!n.action) return;
    if (n.action.type === 'ask') {
      void send(n.action.prompt);
      router.navigate('/agent');
    } else router.push(n.action.route as never);
  };
  const reloadAll = () => {
    void categories.reload();
    void fast.reload();
    void rated.reload();
    void nudges.reload();
  };

  return (
    <Screen
      tab
      onRefresh={reloadAll}
      header={
        <View style={{ paddingHorizontal: space.screen, paddingTop: space.xs, paddingBottom: space.s, gap: space.s, borderBottomWidth: 1, borderBottomColor: C.line }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
            <Pressable
              onPress={() => setDestOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="배송지 바꾸기"
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, height: 44 }}
            >
              <Icon name="pin" size={18} color={C.brand} />
              <Txt v="bodyMedium" numberOfLines={1} style={{ flexShrink: 1, fontFamily: font.bold, fontSize: 17 }}>
                {current?.name ?? '배송지 고르기'}
              </Txt>
              <Icon name="down" size={16} color={C.ink} />
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
          <Pressable
            onPress={() => router.push('/search')}
            accessibilityRole="search"
            accessibilityLabel="메뉴·가게 검색"
            style={{ flexDirection: 'row', alignItems: 'center', gap: space.s, height: 46, borderRadius: radius.card, borderWidth: 1.5, borderColor: C.brand, backgroundColor: C.card, paddingHorizontal: space.l }}
          >
            <Icon name="search" size={20} color={C.brand} />
            <Txt v="body" color={C.sub} style={{ fontSize: 15 }}>
              메뉴·가게를 찾아보세요
            </Txt>
          </Pressable>
        </View>
      }
    >
      {/* 서비스 탭 */}
      <View style={{ flexDirection: 'row', backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, padding: 4 }}>
        {SERVICES.map((sv) => {
          const on = service === sv.id;
          return (
            <Pressable
              key={sv.id}
              onPress={() => setService(sv.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              style={{ flex: 1, height: 40, borderRadius: radius.chip, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.basalt : 'transparent' }}
            >
              <Txt v="captionMedium" color={on ? C.white : C.sub} numberOfLines={1} style={{ fontSize: 14, fontFamily: on ? font.bold : font.medium }}>
                {sv.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      {/* 카테고리 5×2 + 동문시장 띠 */}
      {categories.error && !categories.data ? (
        <ErrorView compact message={categories.error} onRetry={categories.reload} />
      ) : categories.loading && !categories.data ? (
        <Loading />
      ) : (
        <View style={{ gap: space.m }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: space.m }}>
            {grid.map((c) => (
              <Pressable
                key={c.key}
                onPress={c.go}
                accessibilityRole="button"
                accessibilityLabel={c.label}
                style={({ pressed }) => ({ width: '20%', alignItems: 'center', gap: 4, opacity: pressed ? 0.7 : 1 })}
              >
                <Thumb image={c.image} emoji={c.emoji} emojiSize={27} style={{ width: 54, height: 54, backgroundColor: c.tint }} />
                <Txt v="caption" numberOfLines={1} style={{ fontSize: 11.5, lineHeight: 15, letterSpacing: -0.3 }}>
                  {c.name}
                </Txt>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() => router.navigate('/market')}
            accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.m, backgroundColor: C.brandSoft, borderRadius: radius.card, paddingHorizontal: space.l, paddingVertical: space.m, opacity: pressed ? 0.8 : 1 })}
          >
            <Txt style={{ fontSize: 26, lineHeight: 32 }}>{categories.data?.categories.find((c) => c.id === 'market')?.emoji ?? ''}</Txt>
            <View style={{ flex: 1 }}>
              <Txt v="bodyMedium" style={{ fontFamily: font.bold, fontSize: 15, lineHeight: 21 }}>
                동문시장
              </Txt>
              <Txt v="caption" color={C.sub} numberOfLines={1}>
                여러 가게를 한 장바구니로, 한 번에 배달
              </Txt>
            </View>
            <Icon name="right" size={18} color={C.brandDark} />
          </Pressable>
        </View>
      )}

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

      {/* 지금 빠른 배달 */}
      <View style={{ gap: space.m }}>
        <SectionTitle title={service === 'pickup' ? '지금 바로 포장' : '지금 빠른 배달'} />
        {fast.loading && !fast.data ? <Loading /> : null}
        {fast.error && !fast.data ? <ErrorView compact message={fast.error} onRetry={fast.reload} /> : null}
        {fast.data && fastList.length === 0 ? <Empty title="지금 문 연 곳이 없어요" body="마이 → 시연 설정에서 시각을 바꿔 보세요" /> : null}
        {fastList.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.screen }} contentContainerStyle={{ paddingHorizontal: space.screen, gap: space.m }}>
            {fastList.map((s) => (
              <StoreCard key={s.id} store={s} />
            ))}
          </ScrollView>
        ) : null}
      </View>

      {/* 동문시장 오늘의 가게 */}
      {service !== 'market' && marketList.length ? (
        <View style={{ gap: space.m }}>
          <SectionTitle title="동문시장 오늘의 가게" action="전체 보기" onAction={() => router.navigate('/market')} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.screen }} contentContainerStyle={{ paddingHorizontal: space.screen, gap: space.m }}>
            {marketList.map((s) => (
              <StoreCard key={s.id} store={s} width={128} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* 별점 높은 가게 */}
      <View>
        <SectionTitle title={`별점 높은 ${what}`} />
        <View style={{ height: space.s }} />
        {rated.loading && !rated.data ? <Loading /> : null}
        {rated.error && !rated.data ? <ErrorView compact message={rated.error} onRetry={rated.reload} /> : null}
        {topList.map((s, i) => (
          <StoreRow key={s.id} store={s} last={i === topList.length - 1} />
        ))}
      </View>

      <DestinationSheet visible={destOpen} onClose={() => setDestOpen(false)} />
    </Screen>
  );
}
