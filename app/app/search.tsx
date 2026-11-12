// 검색(v0.2 G): 자동 포커스 입력 → 최근 검색어·인기 검색어 → 결과 `가게 | 메뉴` 탭 → 하르방에게 이 말로 장바구니 짜 달라고 하기
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { api } from '../src/api';
import { Button } from '../src/components/Button';
import { Chip } from '../src/components/Chip';
import { Icon } from '../src/components/Icon';
import { MenuRow } from '../src/components/MenuRow';
import { Screen } from '../src/components/Screen';
import { Empty, ErrorView, Loading } from '../src/components/States';
import { StoreRow } from '../src/components/StoreCard';
import { Txt } from '../src/components/Txt';
import { useDestination } from '../src/hooks';
import { looksLikeOrder, useAgent } from '../src/store/agent';
import { useCart } from '../src/store/cart';
import { useSession } from '../src/store/session';
import { useResource } from '../src/useResource';
import { color as C, font, noOutline, radius, space } from '../src/theme';

const POPULAR = ['회', '흑돼지', '고기국수', '오메기떡', '갈치', '감귤', '치킨', '막걸리'];
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');

export default function SearchScreen() {
  const [text, setText] = useState('');
  const [tab, setTab] = useState<'store' | 'menu'>('store');
  const demoTime = useSession((s) => s.demoTime);
  const recent = useSession((s) => s.recent);
  const addRecent = useSession((s) => s.addRecent);
  const clearRecent = useSession((s) => s.clearRecent);
  const { id: destId } = useDestination();
  const send = useAgent((s) => s.send);
  const busy = useAgent((s) => s.busy);
  const lines = useCart((s) => s.lines);

  const data = useResource(`search-data:${demoTime}:${destId}`, async () => {
    const [s, p, c] = await Promise.all([api.stores({ destination_id: destId }), api.products(), api.categories()]);
    return { stores: s.stores, products: p.products, categories: c.categories };
  });

  const q = text.trim();
  const needle = norm(q);
  const catName = (id: string) => data.data?.categories.find((c) => c.id === id)?.name ?? '';
  const menus = needle ? (data.data?.products ?? []).filter((p) => norm(`${p.name} ${p.description} ${p.tags.join(' ')}`).includes(needle)) : [];
  const menuStores = new Set(menus.map((p) => p.store_id));
  const stores = needle
    ? (data.data?.stores ?? [])
        .filter((s) => menuStores.has(s.id) || norm(`${s.name} ${s.label} ${s.story} ${catName(s.category)}`).includes(needle))
        .sort((a, b) => Number(b.is_open) - Number(a.is_open))
    : [];
  // 결과가 있거나 먹거리·주문처럼 들리는 말일 때만 하르방에게 넘길 수 있다(ㅁㄴㅇㄹ 같은 말은 X)
  const askable = !!q && (stores.length + menus.length > 0 || POPULAR.some((w) => q.includes(w)) || looksLikeOrder(q));
  const qShort = q.length > 7 ? `${q.slice(0, 7)}…` : q;
  const categoryOf = (storeId: string) => data.data?.stores.find((s) => s.id === storeId)?.category;

  const run = (word: string) => {
    setText(word);
    if (word.trim()) addRecent(word.trim());
  };
  const askHarubang = () => {
    void send(`${q}로 장바구니 짜 줘`, 'plan');
    router.navigate('/agent');
  };

  return (
    <Screen
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.s, paddingVertical: space.s, borderBottomWidth: 1, borderBottomColor: C.line }}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityRole="button" accessibilityLabel="뒤로" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="back" />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.s, height: 44, borderRadius: radius.card, borderWidth: 1.5, borderColor: C.brand, backgroundColor: C.card, paddingHorizontal: space.m, marginRight: space.s }}>
            <Icon name="search" size={18} color={C.brand} />
            <TextInput
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => run(text)}
              autoFocus
              placeholder="메뉴·가게를 찾아보세요"
              placeholderTextColor={C.sub}
              returnKeyType="search"
              accessibilityLabel="검색어"
              style={[{ flex: 1, minWidth: 0, height: 42, fontFamily: font.regular, fontSize: 16, color: C.ink }, noOutline]}
            />
            {text ? (
              <Pressable onPress={() => setText('')} accessibilityRole="button" accessibilityLabel="검색어 지우기" hitSlop={8}>
                <Icon name="close" size={16} color={C.sub} />
              </Pressable>
            ) : null}
          </View>
        </View>
      }
      footer={
        askable ? <Button label={`하르방에게 '${qShort}' 맡기기`} kind="dark" onPress={askHarubang} disabled={busy} /> : undefined
      }
    >
      {!q ? (
        <>
          {recent.length ? (
            <View style={{ gap: space.m }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Txt v="bodyMedium" style={{ fontFamily: font.bold }}>
                  최근 검색어
                </Txt>
                <Pressable onPress={clearRecent} accessibilityRole="button" hitSlop={8}>
                  <Txt v="caption" color={C.sub}>
                    전체 지우기
                  </Txt>
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {recent.map((r) => (
                  <Chip key={r} label={r} pill tone="outline" onPress={() => run(r)} />
                ))}
              </View>
            </View>
          ) : null}
          <View style={{ gap: space.m }}>
            <Txt v="bodyMedium" style={{ fontFamily: font.bold }}>
              인기 검색어
            </Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {POPULAR.map((w, i) => (
                <Chip key={w} label={`${i + 1} ${w}`} pill tone={i < 3 ? 'brand' : 'outline'} onPress={() => run(w)} />
              ))}
            </View>
          </View>
        </>
      ) : data.error && !data.data ? (
        <ErrorView message={data.error} onRetry={data.reload} />
      ) : data.loading && !data.data ? (
        <Loading label="찾는 중이에요" />
      ) : (
        <View>
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.line, marginHorizontal: -space.screen, marginTop: -space.m }}>
            {(['store', 'menu'] as const).map((t) => {
              const on = tab === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  style={{ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: on ? C.brand : 'transparent' }}
                >
                  <Txt v="captionMedium" color={on ? C.ink : C.sub} style={{ fontSize: 15, lineHeight: 20, fontFamily: on ? font.bold : font.medium }}>
                    {`${t === 'store' ? '가게' : '메뉴'} ${t === 'store' ? stores.length : menus.length}`}
                  </Txt>
                </Pressable>
              );
            })}
          </View>
          {tab === 'store' ? (
            stores.length ? (
              stores.map((s, i) => <StoreRow key={s.id} store={s} last={i === stores.length - 1} />)
            ) : (
              <Empty title={`'${qShort}' 가게가 없어요`} body="다른 말로 찾아보세요" />
            )
          ) : menus.length ? (
            menus.map((p, i) => (
              <MenuRow key={p.id} product={p} category={categoryOf(p.store_id)} showStore inCart={lines.find((l) => l.product_id === p.id)?.qty ?? 0} last={i === menus.length - 1} />
            ))
          ) : (
            <Empty title={`'${qShort}' 메뉴가 없어요`} body="다른 말로 찾아보세요" />
          )}
        </View>
      )}
    </Screen>
  );
}
