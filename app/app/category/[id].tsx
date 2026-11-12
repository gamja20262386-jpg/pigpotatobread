// 카테고리 목록(v0.2 C): 뒤로 + 제목 → 가로 카테고리 탭(활성 밑줄, 자동 스크롤) → 정렬·필터 칩 → 목록형 가게 카드
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View, type ScrollViewInstance } from 'react-native';
import { api } from '../../src/api';
import { Chip } from '../../src/components/Chip';
import { Icon } from '../../src/components/Icon';
import { Screen, StackHeader } from '../../src/components/Screen';
import { Empty, ErrorView, Loading } from '../../src/components/States';
import { StoreRow } from '../../src/components/StoreCard';
import { Txt } from '../../src/components/Txt';
import { useDestination } from '../../src/hooks';
import { useSession } from '../../src/store/session';
import type { StoreSort } from '../../src/types';
import { useResource } from '../../src/useResource';
import { color as C, font, space } from '../../src/theme';

const SORTS: { id: StoreSort; label: string }[] = [
  { id: 'fast', label: '배달 빠른 순' },
  { id: 'fee', label: '배달팁 낮은 순' },
  { id: 'default', label: '기본순' },
  { id: 'rating', label: '별점 높은 순' },
];

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const category = String(id ?? '');
  const demoTime = useSession((s) => s.demoTime);
  const sort = useSession((s) => s.sort);
  const setSort = useSession((s) => s.setSort);
  const { id: destId } = useDestination();
  const [openOnly, setOpenOnly] = useState(false);
  const [pickupOnly, setPickupOnly] = useState(false);

  const categories = useResource('categories', () => api.categories());
  const tabs = (categories.data?.categories ?? []).filter((c) => c.id !== 'market');
  const current = tabs.find((c) => c.id === category);
  const stores = useResource(`cat:${category}:${sort}:${openOnly}:${demoTime}:${destId}`, () =>
    api.stores({ kind: 'restaurant', category, sort, open_only: openOnly, destination_id: destId }),
  );
  const list = (stores.data?.stores ?? []).filter((s) => !pickupOnly || s.pickup);

  // 활성 탭이 보이게 가로 스크롤
  const tabScroll = useRef<ScrollViewInstance>(null);
  const tabX = useRef<Record<string, number>>({});
  const [laidOut, setLaidOut] = useState(0);
  useEffect(() => {
    const x = tabX.current[category];
    if (x !== undefined) tabScroll.current?.scrollTo({ x: Math.max(0, x - 60), animated: true });
  }, [category, laidOut]);

  const filtered = openOnly || pickupOnly;

  return (
    <Screen
      onRefresh={stores.reload}
      header={
        <View style={{ backgroundColor: C.bg }}>
          <StackHeader
            title={current?.name ?? '카테고리'}
            right={
              <Pressable onPress={() => router.push('/search')} accessibilityRole="button" accessibilityLabel="검색" hitSlop={8}>
                <Icon name="search" />
              </Pressable>
            }
          />
          <ScrollView ref={tabScroll} horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, borderBottomWidth: 1, borderBottomColor: C.line }} contentContainerStyle={{ paddingHorizontal: space.s }}>
            {tabs.map((c) => {
              const on = c.id === category;
              return (
                <Pressable
                  key={c.id}
                  onLayout={(e) => {
                    tabX.current[c.id] = e.nativeEvent.layout.x;
                    setLaidOut((n) => n + 1);
                  }}
                  onPress={() => router.setParams({ id: c.id })}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  style={{ height: 44, paddingHorizontal: space.m, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: on ? C.brand : 'transparent' }}
                >
                  <Txt v="captionMedium" color={on ? C.ink : C.sub} style={{ fontSize: 15, lineHeight: 20, fontFamily: on ? font.bold : font.medium }}>
                    {c.name}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: space.screen, paddingVertical: space.s, gap: 6, alignItems: 'center' }}>
            {SORTS.map((o) => (
              <Chip key={o.id} label={o.label} pill active={sort === o.id} onPress={() => setSort(o.id)} />
            ))}
            <View style={{ width: 1, height: 20, backgroundColor: C.line, marginHorizontal: 4 }} />
            <Chip label="영업 중" pill tone="outline" active={openOnly} onPress={() => setOpenOnly((v) => !v)} />
            <Chip label="포장 가능" pill tone="outline" active={pickupOnly} onPress={() => setPickupOnly((v) => !v)} />
          </ScrollView>
        </View>
      }
    >
      {categories.error && !categories.data ? <ErrorView compact message={categories.error} onRetry={categories.reload} /> : null}
      {stores.error && !stores.data ? <ErrorView message={stores.error} onRetry={stores.reload} /> : null}
      {stores.loading && !stores.data ? <Loading label="가게를 불러오는 중이에요" /> : null}
      {stores.data ? (
        list.length ? (
          <View style={{ opacity: stores.loading ? 0.6 : 1 }}>
            <Txt v="caption" color={C.sub}>{`가게 ${list.length}곳`}</Txt>
            {list.map((s, i) => (
              <StoreRow key={s.id} store={s} last={i === list.length - 1} />
            ))}
          </View>
        ) : (
          <Empty
            title="이 카테고리에 문 연 가게가 없어요"
            body={filtered ? '필터를 풀면 준비 중인 가게도 볼 수 있어요' : '다른 카테고리를 골라 보세요'}
            action={
              filtered
                ? {
                    label: '필터 해제',
                    onPress: () => {
                      setOpenOnly(false);
                      setPickupOnly(false);
                    },
                  }
                : undefined
            }
          />
        )
      ) : null}
    </Screen>
  );
}
