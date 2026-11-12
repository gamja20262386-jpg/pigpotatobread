// 마이 → 시연 설정: 시연 시각(X-Demo-Time), AI 상태, API 주소
import { Pressable, View } from 'react-native';
import { API_URL } from '../../src/api';
import { Icon } from '../../src/components/Icon';
import { LlmChip } from '../../src/components/LlmChip';
import { Card, Screen, StackHeader } from '../../src/components/Screen';
import { Txt } from '../../src/components/Txt';
import { useSession } from '../../src/store/session';
import { color as C, font, radius, space } from '../../src/theme';

const DEMO_TIMES: { value: string | null; label: string; hint: string }[] = [
  { value: null, label: '실제 시각', hint: '지금 시계 그대로' },
  { value: '08:30', label: '08:30', hint: '시장 여는 시간' },
  { value: '12:00', label: '12:00', hint: '점심' },
  { value: '18:30', label: '18:30', hint: '저녁 · 야시장' },
  { value: '20:40', label: '20:40', hint: '시장 마감 임박' },
  { value: '23:00', label: '23:00', hint: '야식' },
];

export default function DemoScreen() {
  const demoTime = useSession((s) => s.demoTime);
  const setDemoTime = useSession((s) => s.setDemoTime);

  return (
    <Screen header={<StackHeader title="시연 설정" />}>
      <View style={{ gap: space.m }}>
        <View style={{ gap: 2 }}>
          <Txt v="title">시연 시각</Txt>
          <Txt v="caption" color={C.sub}>
            영업시간·마감 임박·식사 시간 판단에 써요
          </Txt>
        </View>
        <View style={{ backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
          {DEMO_TIMES.map((t, i) => {
            const on = demoTime === t.value;
            return (
              <Pressable
                key={t.label}
                onPress={() => setDemoTime(t.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`시연 시각 ${t.label}`}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.m,
                  minHeight: 52,
                  paddingHorizontal: space.l,
                  borderBottomWidth: i === DEMO_TIMES.length - 1 ? 0 : 1,
                  borderBottomColor: C.line,
                  backgroundColor: on ? C.brandSoft : pressed ? C.bg : C.card,
                })}
              >
                <Txt v="bodyMedium" style={{ width: 76, fontSize: 15, fontFamily: on ? font.bold : font.medium }}>
                  {t.label}
                </Txt>
                <Txt v="caption" color={C.sub} style={{ flex: 1 }}>
                  {t.hint}
                </Txt>
                {on ? <Icon name="check" size={18} color={C.brand} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: space.m }}>
        <Txt v="title">AI 상태</Txt>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
            <LlmChip />
          </View>
          <Txt v="caption" color={C.sub}>
            AI가 꺼져도 규칙으로 동작해요
          </Txt>
          <View style={{ gap: 2 }}>
            <Txt v="captionMedium">API 주소</Txt>
            <Txt v="caption" color={C.sub} selectable>
              {API_URL}
            </Txt>
          </View>
        </Card>
      </View>
    </Screen>
  );
}
