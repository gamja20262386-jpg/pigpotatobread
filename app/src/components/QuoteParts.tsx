// Quote 조각: 봉투 칩, 경고 띠
import { View } from 'react-native';
import type { Quote } from '../types';
import { color as C, radius, space } from '../theme';
import { tempTone } from './TempBadge';
import { Chip } from './Chip';
import { Txt } from './Txt';

export function BagChips({ bags }: { bags: Quote['bags'] }) {
  if (!bags.length) return null;
  return (
    <View style={{ gap: 6 }}>
      <Txt v="label" color={C.sub}>
        봉투
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {bags.map((b) => (
          <Chip key={b.temp + b.label} label={`${b.label} · ${b.items.length}개`} tone={tempTone(b.temp)} />
        ))}
      </View>
    </View>
  );
}

export function Warnings({ warnings, inZone = true }: { warnings: string[]; inZone?: boolean }) {
  const all = inZone ? warnings : ['배달 범위 밖이라 이 배송지로는 주문할 수 없어요.', ...warnings];
  if (!all.length) return null;
  return (
    <View style={{ gap: 6 }}>
      {all.map((w) => (
        <View key={w} style={{ backgroundColor: inZone ? C.warnSoft : C.dangerSoft, borderRadius: radius.chip, paddingHorizontal: space.m, paddingVertical: space.s, borderLeftWidth: 3, borderLeftColor: inZone ? C.warn : C.danger }}>
          <Txt v="caption" color={inZone ? C.warn : C.danger} style={{ fontSize: 14, lineHeight: 20 }}>
            {w}
          </Txt>
        </View>
      ))}
    </View>
  );
}
