// Quote 조각: 봉투 칩, 경고 띠
import { View } from 'react-native';
import type { Quote } from '../types';
import { color as C, radius, space } from '../theme';
import { tempTone } from './TempBadge';
import { Chip } from './Chip';
import { Icon } from './Icon';
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

// 경고 띠: 왼쪽 세로줄 없이 둥근 틴트 상자 + 아이콘. 서버가 이미 '배달 범위' 경고를 보냈으면 같은 뜻을 또 붙이지 않는다.
export function Warnings({ warnings, inZone = true }: { warnings: string[]; inZone?: boolean }) {
  const zoneSaid = warnings.some((w) => w.includes('배달 범위'));
  const all = inZone || zoneSaid ? warnings : ['배달 범위 밖이라 이 배송지로는 주문할 수 없어요', ...warnings];
  if (!all.length) return null;
  return (
    <View style={{ gap: 6 }}>
      {all.map((w) => {
        const danger = !inZone && w.includes('배달 범위');
        const fg = danger ? C.danger : C.warn;
        return (
          <View key={w} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: danger ? C.dangerSoft : C.warnSoft, borderRadius: radius.card, paddingHorizontal: space.m, paddingVertical: 10 }}>
            <View style={{ paddingTop: 2 }}>
              <Icon name="info" size={16} color={fg} />
            </View>
            <Txt v="caption" color={fg} style={{ flex: 1, fontSize: 14, lineHeight: 20 }}>
              {w}
            </Txt>
          </View>
        );
      })}
    </View>
  );
}
