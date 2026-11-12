// 홈 에이전트 카드(축소형, v0.2 B5·L): 오브 + 들은 말(회색 칩) + 답 2줄 말줄임 + 자세히 › + 입력 + 제안 칩 1줄
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { lastTurn, useAgent } from '../store/agent';
import { SUGGESTIONS } from '../suggestions';
import { color as C, floatShadow, font, radius, space } from '../theme';
import { AgentInput } from './AgentInput';
import { AgentOrb } from './AgentOrb';
import { Txt } from './Txt';

// 답을 두 줄 안에 들어갈 만큼, 문장·낱말 경계에서 자른다("0.8k…"처럼 낱말 중간에서 끊지 않게)
const MAX = 38;
function brief(text: string) {
  const first = text.trim().split(/(?<=[.!?])\s+/)[0];
  if (first.length <= MAX) return first;
  const cut = first.slice(0, MAX);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > MAX / 2 ? cut.slice(0, sp) : cut).replace(/[\s,·]+$/, '')}…`;
}

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
        : brief(t.run?.summary ?? '확인했어요.');

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
          {/* 높이 고정: 위 줄(들은 말 | 하르방 + 자세히) 20px, 답 두 줄 자리 — 답이 와도 카드가 커지지 않는다 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s, height: 20 }}>
            {heard ? (
              <View style={{ flexShrink: 1, backgroundColor: C.bg, borderRadius: radius.chip, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Txt v="caption" color={C.sub} numberOfLines={1} style={{ fontSize: 12, lineHeight: 16 }}>
                  {heard}
                </Txt>
              </View>
            ) : (
              <Txt v="captionMedium" color={C.brandDark} style={{ fontSize: 12, lineHeight: 16 }}>
                하르방
              </Txt>
            )}
            <View style={{ flex: 1 }} />
            {t ? (
              <Pressable onPress={more} accessibilityRole="button" accessibilityLabel="하르방 답 자세히 보기" hitSlop={8}>
                <Txt v="captionMedium" color={C.brandDark}>
                  자세히 ›
                </Txt>
              </Pressable>
            ) : null}
          </View>
          <Txt v="bodyMedium" numberOfLines={2} color={t?.status === 'error' ? C.danger : C.ink} style={{ fontFamily: font.bold, fontSize: 15, lineHeight: 21, minHeight: 42 }}>
            {reply}
          </Txt>
        </View>
      </View>
      <AgentInput onSend={ask} busy={busy} suggestions={SUGGESTIONS} />
    </View>
  );
}
