// 가게 카드: 아이콘 타일(4:5) + serif 이름 + 한 줄 이야기 + 영업 칩. 닫혔으면 흐리게.
import { router } from 'expo-router';
import { Pressable, View, type DimensionValue } from 'react-native';
import type { Store } from '../types';
import { color as C, radius, space } from '../theme';
import { Chip } from './Chip';
import { Txt } from './Txt';

export function openChip(s: Store): { label: string; tone: 'leaf' | 'warn' | 'neutral' } {
  if (!s.is_open) return { label: `${s.open} 오픈`, tone: 'neutral' };
  if (s.closes_in_min !== null && s.closes_in_min <= 60) return { label: `${s.closes_in_min}분 뒤 마감`, tone: 'warn' };
  return { label: `${s.close}까지`, tone: 'leaf' };
}

// 가게마다 틴트를 돌려 쓴다(주황·바다·잎)
const TINTS = [C.brandSoft, C.seaSoft, C.leafSoft, C.warnSoft];
export const storeTint = (id: string) => TINTS[[...id].reduce((n, ch) => n + ch.charCodeAt(0), 0) % TINTS.length];

export function StoreCard({ store, width }: { store: Store; width: DimensionValue }) {
  const chip = openChip(store);
  return (
    <Pressable
      onPress={() => router.push(`/store/${store.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${store.name} 가게 보기`}
      style={({ pressed }) => ({ width, opacity: store.is_open ? (pressed ? 0.8 : 1) : 0.55, gap: space.s })}
    >
      <View style={{ width: '100%', aspectRatio: 4 / 5, borderRadius: radius.card, backgroundColor: storeTint(store.id), alignItems: 'center', justifyContent: 'center' }}>
        <Txt style={{ fontSize: 48, lineHeight: 58 }}>{store.icon}</Txt>
        <View style={{ position: 'absolute', left: 8, top: 8 }}>
          <Chip small label={chip.label} tone={chip.tone === 'neutral' ? 'outline' : chip.tone} />
        </View>
      </View>
      <View style={{ gap: 2 }}>
        <Txt v="serifTitle" style={{ fontSize: 16, lineHeight: 22 }} numberOfLines={1}>
          {store.name}
        </Txt>
        <Txt v="caption" color={C.sub} numberOfLines={1}>
          {store.story}
        </Txt>
      </View>
    </Pressable>
  );
}

// 맛집 목록 행
export function StoreRow({ store }: { store: Store }) {
  const chip = openChip(store);
  return (
    <Pressable
      onPress={() => router.push(`/store/${store.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: 'row', gap: space.m, alignItems: 'center', opacity: store.is_open ? (pressed ? 0.8 : 1) : 0.55, paddingVertical: space.s })}
    >
      <View style={{ width: 64, height: 64, borderRadius: radius.card, backgroundColor: storeTint(store.id), alignItems: 'center', justifyContent: 'center' }}>
        <Txt style={{ fontSize: 30, lineHeight: 38 }}>{store.icon}</Txt>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt v="serifTitle" style={{ fontSize: 16, lineHeight: 22 }} numberOfLines={1}>
          {store.name}
        </Txt>
        <Txt v="caption" color={C.sub} numberOfLines={1}>
          {`★ ${store.rating.toFixed(1)} · ${store.label} · 준비 ${store.prep_min}분`}
        </Txt>
        <Chip small label={chip.label} tone={chip.tone === 'neutral' ? 'outline' : chip.tone} />
      </View>
    </Pressable>
  );
}
