// 메뉴 행(docs/DESIGN.md v0.2 D): 왼쪽 글(이름·설명 2줄·가격·배지), 오른쪽 사진/아이콘 타일 88. 누르면 메뉴 상세.
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import type { Product } from '../types';
import { color as C, font, space, won } from '../theme';
import { Chip } from './Chip';
import { TempBadge } from './TempBadge';
import { Thumb } from './Thumb';
import { Txt } from './Txt';

export function MenuRow({ product: p, category, inCart = 0, showStore, last }: { product: Product; category?: string; inCart?: number; showStore?: boolean; last?: boolean }) {
  const out = p.sold_out || p.stock <= 0;
  return (
    <Pressable
      onPress={() => router.push(`/product/${p.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${p.name} ${won(p.price)}${out ? ' 품절' : ''}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: space.m,
        paddingVertical: space.l,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.line,
        opacity: out ? 0.5 : pressed ? 0.75 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
        {showStore ? (
          <Txt v="caption" color={C.sub} numberOfLines={1}>
            {p.store_name}
          </Txt>
        ) : null}
        <Txt v="bodyMedium" style={{ fontFamily: font.bold }} numberOfLines={2}>
          {p.name}
        </Txt>
        <Txt v="caption" color={C.sub} numberOfLines={2}>
          {p.description}
        </Txt>
        <Txt v="bodyMedium" color={C.brand} style={{ fontFamily: font.bold }}>
          {won(p.price)}
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {p.popular ? <Chip small label="대표" tone="brand" /> : null}
          {out ? <Chip small label="품절" tone="danger" /> : p.stock <= 5 ? <Chip small label={`${p.stock}개 남음`} tone="warn" /> : null}
          <TempBadge temp={p.temp} />
          {inCart > 0 ? <Chip small label={`${inCart}개 담음`} tone="dark" /> : null}
        </View>
      </View>
      <Thumb image={p.image} emoji={p.emoji} category={category} emojiSize={40} style={{ width: 88, height: 88 }} />
    </Pressable>
  );
}
