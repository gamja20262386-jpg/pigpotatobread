// 하르방이 먼저 챙겼어요(v0.2 P): 제목 1줄 + 왜 떴는지 캡션 1줄 + [맡기기] [✕]
import { Pressable, View } from 'react-native';
import type { Nudge } from '../types';
import { color as C, font, radius, space } from '../theme';
import { Button } from './Button';
import { Icon } from './Icon';
import { Txt } from './Txt';

// 본문 첫 문장이 이유("저녁 시간이에요", "담은 은갈치구이가 품절이에요")
const reasonOf = (body: string) => body.split(/[.?!](\s|$)/)[0];

export function NudgeCard({ nudge, onDismiss, onAct }: { nudge: Nudge; onDismiss: () => void; onAct: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s, backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, paddingVertical: space.m, paddingLeft: space.l, paddingRight: space.xs }}>
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <Txt v="bodyMedium" numberOfLines={1} style={{ fontFamily: font.bold, fontSize: 15, lineHeight: 21 }}>
          {nudge.title}
        </Txt>
        <Txt v="caption" color={C.sub} numberOfLines={1}>
          {reasonOf(nudge.body)}
        </Txt>
      </View>
      {nudge.action ? <Button small kind="dark" label={nudge.action.type === 'ask' ? '맡기기' : '보러 가기'} onPress={onAct} style={{ height: 36 }} /> : null}
      <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="이 안내 닫기" hitSlop={4} style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="close" size={16} color={C.sub} />
      </Pressable>
    </View>
  );
}
