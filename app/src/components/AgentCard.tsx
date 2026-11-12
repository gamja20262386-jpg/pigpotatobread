// 에이전트 카드(JARI): 하르방 오브, 들은 말, 큰 답 문장, 입력창, 제안 칩
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { lastTurn, useAgent } from '../store/agent';
import { SUGGESTIONS } from '../suggestions';
import { color as C, floatShadow, radius, space } from '../theme';
import { AgentInput } from './AgentInput';
import { AgentOrb } from './AgentOrb';
import { Txt } from './Txt';

export function AgentCard() {
  const turns = useAgent((s) => s.turns);
  const busy = useAgent((s) => s.busy);
  const send = useAgent((s) => s.send);
  const t = lastTurn(turns);
  const heard = t?.message;
  const reply = !t
    ? '무엇이 드시고 싶으세요? 한 문장이면 시장 장바구니를 짜 드릴게요.'
    : t.status === 'pending'
      ? '하르방 팀이 가게·재고·배달비를 확인하고 있어요…'
      : t.status === 'error'
        ? t.error ?? '잠깐 문제가 생겼어요.'
        : t.run?.summary ?? '확인했어요.';

  const ask = (text: string) => {
    void send(text);
    router.navigate('/agent');
  };

  return (
    <View style={[{ backgroundColor: C.card, borderRadius: radius.sheet, padding: space.xl, gap: space.l }, floatShadow]}>
      <Pressable onPress={() => router.navigate('/agent')} accessibilityRole="button" accessibilityLabel="하르방 대화 열기" style={{ flexDirection: 'row', gap: space.l, alignItems: 'center' }}>
        <AgentOrb size={64} busy={busy} />
        <View style={{ flex: 1, gap: 4 }}>
          <Txt v="caption" color={C.sub} numberOfLines={1}>
            {heard ? `“${heard}”` : '하르방 · 제주 시장 장보기 에이전트'}
          </Txt>
          <Txt v="reply" numberOfLines={3} color={t?.status === 'error' ? C.danger : C.ink}>
            {reply}
          </Txt>
        </View>
      </Pressable>
      <AgentInput onSend={ask} busy={busy} suggestions={SUGGESTIONS} />
    </View>
  );
}
