// 가게 카드 두 가지(docs/DESIGN.md v0.2 C): 목록형 StoreRow(카테고리·시장·검색·홈 목록) / 가로 레일용 StoreCard(홈).
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useMenuNames } from '../hooks';
import type { Store } from '../types';
import { color as C, font, space, won } from '../theme';
import { Chip } from './Chip';
import { Thumb } from './Thumb';
import { Txt } from './Txt';

export function openChip(s: Store): { label: string; tone: 'leaf' | 'warn' | 'neutral' } {
  if (!s.is_open) return { label: `${s.open} 오픈`, tone: 'neutral' };
  if (s.closes_in_min !== null && s.closes_in_min <= 60) return { label: `${s.closes_in_min}분 뒤 마감`, tone: 'warn' };
  return { label: `${s.close}까지`, tone: 'leaf' };
}

// 가게마다 틴트를 돌려 쓴다(주황·바다·잎) — 상인 모드 머리에서 쓴다
const TINTS = [C.brandSoft, C.seaSoft, C.leafSoft, C.warnSoft];
export const storeTint = (id: string) => TINTS[[...id].reduce((n, ch) => n + ch.charCodeAt(0), 0) % TINTS.length];

export const etaText = (s: Store) => (s.eta_min !== undefined ? `${s.eta_min}~${s.eta_min + 10}분` : `준비 ${s.prep_min}분`);
const shortTip = (s: Store) => (s.kind === 'market' ? `묶음 ${won(s.delivery_tip ?? 3000)}~` : won(s.delivery_tip ?? s.delivery_fee));
export const minOrderText = (s: Store) => (s.min_order > 0 ? `최소주문 ${won(s.min_order)}` : '최소주문 없음');

function badges(s: Store) {
  const out: { label: string; tone: 'sea' | 'leaf' | 'warn' | 'outline' | 'danger' }[] = [];
  if (!s.is_open) out.push({ label: '준비 중', tone: 'outline' });
  else if (s.closes_in_min !== null && s.closes_in_min <= 60) out.push({ label: `${s.closes_in_min}분 뒤 마감`, tone: 'warn' });
  if (s.in_zone === false) out.push({ label: '배달 불가 지역', tone: 'danger' });
  else if (s.eta_min !== undefined && s.eta_min > 60) out.push({ label: '멀어요', tone: 'warn' });
  if (s.kind === 'market') out.push({ label: '시장 묶음', tone: 'sea' });
  if (s.pickup) out.push({ label: '포장 가능', tone: 'leaf' });
  return out;
}

export function StoreRow({ store: s, last }: { store: Store; last?: boolean }) {
  const menus = useMenuNames(s.id);
  return (
    <Pressable
      onPress={() => router.push(`/store/${s.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${s.name} 가게 보기`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: space.m,
        paddingVertical: space.m,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.line,
        opacity: s.is_open ? (pressed ? 0.75 : 1) : 0.5,
      })}
    >
      <Thumb image={s.image} emoji={s.icon} category={s.category} emojiSize={40} style={{ width: 88, height: 88 }} />
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt v="bodyMedium" style={{ fontFamily: font.bold, flexShrink: 1 }} numberOfLines={1}>
            {s.name}
          </Txt>
          <Txt v="captionMedium" color={C.ink}>{`★${s.rating.toFixed(1)}`}</Txt>
        </View>
        <Txt v="caption" color={C.sub} numberOfLines={1}>
          {`⏱ ${etaText(s)} · 🛵 ${shortTip(s)}${s.kind === 'market' ? '' : ` · 최소 ${won(s.min_order)}`}`}
        </Txt>
        {menus.length ? (
          <Txt v="caption" color={C.ink} numberOfLines={1}>
            {menus.join(', ')}
          </Txt>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
          {badges(s).map((b) => (
            <Chip key={b.label} small label={b.label} tone={b.tone} />
          ))}
        </View>
      </View>
    </Pressable>
  );
}

// 홈 가로 레일 카드
export function StoreCard({ store: s, width = 148 }: { store: Store; width?: number }) {
  return (
    <Pressable
      onPress={() => router.push(`/store/${s.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${s.name} 가게 보기`}
      style={({ pressed }) => ({ width, gap: space.s, opacity: s.is_open ? (pressed ? 0.8 : 1) : 0.5 })}
    >
      <Thumb image={s.image} emoji={s.icon} category={s.category} emojiSize={44} style={{ width, height: Math.round(width * 0.75) }} />
      <View style={{ gap: 1 }}>
        <Txt v="bodyMedium" style={{ fontSize: 15, lineHeight: 21, fontFamily: font.bold }} numberOfLines={1}>
          {s.name}
        </Txt>
        <Txt v="caption" color={C.sub} numberOfLines={1}>
          {`★${s.rating.toFixed(1)} · ⏱ ${s.is_open ? etaText(s) : '준비 중'}`}
        </Txt>
        <Txt v="caption" color={C.sub} numberOfLines={1}>
          {`🛵 ${shortTip(s)}`}
        </Txt>
      </View>
    </Pressable>
  );
}
