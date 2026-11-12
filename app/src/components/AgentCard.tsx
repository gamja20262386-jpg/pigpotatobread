// 홈 에이전트 카드(축소형, v0.2 B5·L): 오브 + 들은 말(회색 칩) + 답 2줄 말줄임 + 자세히 › + 입력 + 제안 칩 1줄
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { lastTurn, useAgent } from '../store/agent';
import { SUGGESTIONS } from '../suggestions';
import { color as C, floatShadow, font, radius, space } from '../theme';
import { AgentInput } from './AgentInput';
import { AgentOrb } from './AgentOrb';
import { Txt } from './Txt';

export function AgentCard() {
  const turns = useAgent((s) => s.turns);
  const busy = useAgent((s) => s.busy);
  const send = useAgent((s) => s.send);
  const requestFocus = useAgent((s) => s.requestFocus);
  const t = lastTurn(turns);
  const heard = t?.message;
  const reply = !t
    ? '한 문장이면 하르방 팀이 장바구니를 짜 드려요'
    : t.status === 'pending'
      ? '하르방 팀이 가게·재고·배달비를 확인하고 있어요…'
      : t.status === 'error'
        ? t.error ?? '잠깐 문제가 생겼어요.'
        : t.run?.summary ?? '확인했어요.';

  const ask = (text: string) => {
    void send(text);
    router.navigate('/agent');
  };
  const more = () => {
    if (t) requestFocus(t.id);
    router.navigate('/agent');
  };

  return (
    <View style={[{ backgroundColor: C.card, borderRadius: radius.sheet, padding: space.l, gap: space.m }, floatShadow]}>
      <View style={{ flexDirection: 'row', gap: space.m, alignItems: 'flex-start' }}>
        <AgentOrb size={44} busy={busy} />
        <View style={{ flex: 1, gap: 4 }}>
          {heard ? (
            <View style={{ alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: C.bg, borderRadius: radius.chip, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Txt v="caption" color={C.sub} numberOfLines={1} style={{ fontSize: 12, lineHeight: 16 }}>
                {heard}
              </Txt>
            </View>
          ) : null}
          <Txt v="bodyMedium" numberOfLines={2} color={t?.status === 'error' ? C.danger : C.ink} style={{ fontFamily: font.bold, fontSize: 15, lineHeight: 21 }}>
            {reply}
          </Txt>
          {t ? (
            <Pressable onPress={more} accessibilityRole="button" accessibilityLabel="하르방 답 자세히 보기" hitSlop={8} style={{ alignSelf: 'flex-start' }}>
              <Txt v="captionMedium" color={C.brandDark}>
                자세히 ›
              </Txt>
            </Pressable>
          ) : null}
        </View>
      </View>
      <AgentInput onSend={ask} busy={busy} suggestions={SUGGESTIONS} />
    </View>
  );
}
