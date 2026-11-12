// 하르방이 먼저 챙겼어요: 닫기 ✕ / 맡기기
import { Pressable, View } from 'react-native';
import type { Nudge } from '../types';
import { color as C, radius, space } from '../theme';
import { Button } from './Button';
import { Icon } from './Icon';
import { Txt } from './Txt';

export function NudgeCard({ nudge, onDismiss, onAct }: { nudge: Nudge; onDismiss: () => void; onAct: () => void }) {
  return (
    <View style={{ backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, padding: space.l, gap: space.s }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.s }}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ backgroundColor: C.brandSoft, borderRadius: radius.chip, paddingHorizontal: 6 }}>
              <Txt v="label" color={C.brandDark} style={{ fontSize: 10 }}>
                먼저
              </Txt>
            </View>
            <Txt v="bodyMedium" style={{ flex: 1 }} numberOfLines={2}>
              {nudge.title}
            </Txt>
          </View>
          <Txt v="caption" color={C.sub} style={{ fontSize: 14, lineHeight: 20 }}>
            {nudge.body}
          </Txt>
        </View>
        <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="이 안내 닫기" hitSlop={8} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginTop: -6, marginRight: -6 }}>
          <Icon name="close" size={16} color={C.sub} />
        </Pressable>
      </View>
      {nudge.action ? <Button small kind="dark" label={nudge.action.type === 'ask' ? '맡기기' : '보러 가기'} onPress={onAct} style={{ alignSelf: 'flex-start' }} /> : null}
    </View>
  );
}
