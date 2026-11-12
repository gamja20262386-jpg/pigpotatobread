// 하르방(에이전트 대화): 턴마다 요약 → 작업 과정 → 근거 → 장바구니 제안
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AgentInput } from '../../src/components/AgentInput';
import { AgentOrb } from '../../src/components/AgentOrb';
import { Button } from '../../src/components/Button';
import { ClaimList } from '../../src/components/ClaimList';
import { LlmChip } from '../../src/components/LlmChip';
import { ProposalCard } from '../../src/components/ProposalCard';
import { RunTimeline } from '../../src/components/RunTimeline';
import { ErrorView } from '../../src/components/States';
import { Txt } from '../../src/components/Txt';
import { useAgent, type Turn } from '../../src/store/agent';
import { useCart, type CartLine } from '../../src/store/cart';
import { useSession } from '../../src/store/session';
import { CHAT_SUGGESTIONS, SUGGESTIONS } from '../../src/suggestions';
import { color as C, radius, space } from '../../src/theme';

export default function AgentScreen() {
  const insets = useSafeAreaInsets();
  const turns = useAgent((s) => s.turns);
  const busy = useAgent((s) => s.busy);
  const send = useAgent((s) => s.send);
  const reset = useAgent((s) => s.reset);
  const scroll = useRef<ScrollViewInstance>(null);
  const last = turns[turns.length - 1];
  const turnY = useRef<Record<string, number>>({});

  // 보내는 중에는 맨 아래(작업 중 표시)로, 답이 오면 그 턴의 시작(요약·작업 과정)으로 이동한다.
  // 맨 아래 제안 카드로 가 버리면 하르방 팀이 한 일(요약·타임라인·근거)을 건너뛰게 된다.
  useEffect(() => {
    const t = setTimeout(() => {
      const y = last ? turnY.current[last.id] : undefined;
      if (last?.status !== 'pending' && y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - space.s), animated: true });
      else scroll.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(t);
  }, [turns.length, last?.status, last?.id]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, paddingHorizontal: space.screen, paddingVertical: space.s, borderBottomWidth: 1, borderBottomColor: C.line }}>
        <AgentOrb size={44} busy={busy} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="serifTitle">하르방</Txt>
          <Txt v="caption" color={C.sub}>
            제주 시장 장보기 에이전트 팀
          </Txt>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <LlmChip />
          {turns.length ? (
            <Pressable onPress={reset} disabled={busy} accessibilityRole="button" hitSlop={8}>
              <Txt v="caption" color={C.sub} style={{ fontSize: 12 }}>
                새 대화
              </Txt>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: space.screen, gap: space.xl }} keyboardShouldPersistTaps="handled">
        {turns.length === 0 ? <Intro onPick={(m) => void send(m)} /> : null}
        {turns.map((t) => (
          <View key={t.id} onLayout={(e) => { turnY.current[t.id] = e.nativeEvent.layout.y; }}>
            <TurnView turn={t} latest={t.id === last?.id} />
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: space.screen, paddingTop: space.m, paddingBottom: 64 + Math.max(insets.bottom, 12) + 4 + space.m, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg }}>
        <AgentInput onSend={(m) => void send(m)} busy={busy} suggestions={turns.length ? [...SUGGESTIONS, ...CHAT_SUGGESTIONS] : undefined} />
      </View>
    </KeyboardAvoidingView>
  );
}

function Intro({ onPick }: { onPick: (m: string) => void }) {
  return (
    <View style={{ gap: space.l, paddingTop: space.s }}>
      <Txt v="label" color={C.sub}>
        HARUBANG AGENT TEAM
      </Txt>
      <Txt v="display">한 문장이면 하르방 팀이 장바구니를 짜요</Txt>
      <Txt v="caption" color={C.sub} style={{ fontSize: 14, lineHeight: 21 }}>
        말 이해 → 메뉴 고르기 → 묶음 배송 → 배달비·도착 → 신선 지킴, 다섯 에이전트가 차례로 확인하고 근거와 함께 보여 드려요. 담기 전에는 아무것도 주문되지 않아요.
      </Txt>
      <View style={{ gap: space.s }}>
        {[...SUGGESTIONS, ...CHAT_SUGGESTIONS].map((s) => (
          <Pressable
            key={s.label}
            onPress={() => onPick(s.message)}
            accessibilityRole="button"
            style={({ pressed }) => ({ backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, paddingHorizontal: space.l, paddingVertical: space.m, opacity: pressed ? 0.7 : 1 })}
          >
            <Txt v="bodyMedium" style={{ fontSize: 15 }}>{`“${s.message}”`}</Txt>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function TurnView({ turn, latest }: { turn: Turn; latest: boolean }) {
  const send = useAgent((s) => s.send);
  const busy = useAgent((s) => s.busy);
  const markAccepted = useAgent((s) => s.markAccepted);
  const replace = useCart((s) => s.replace);
  const setDestination = useSession((s) => s.setDestination);
  const accept = (lines: CartLine[]) => {
    replace(lines, turn.run?.run_id ?? null);
    // 제안은 말에서 알아들은 배송지 기준으로 계산됐으니 장바구니도 같은 배송지로
    if (turn.proposal?.quote.destination?.id) setDestination(turn.proposal.quote.destination.id);
    markAccepted(turn.id);
    router.push('/cart');
  };
  const run = turn.run;
  return (
    <View style={{ gap: space.m }}>
      <View style={{ alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: C.brandSoft, borderRadius: radius.card, borderBottomRightRadius: 4, paddingHorizontal: space.l, paddingVertical: space.m }}>
        <Txt v="body" style={{ fontSize: 15, lineHeight: 22 }}>
          {turn.message}
        </Txt>
      </View>

      <View style={{ flexDirection: 'row', gap: space.s }}>
        <AgentOrb size={32} busy={turn.status === 'pending'} />
        <View style={{ flex: 1, backgroundColor: C.card, borderRadius: radius.card, borderTopLeftRadius: 4, borderWidth: 1, borderColor: C.line, padding: space.l, gap: space.l }}>
          {turn.status === 'pending' ? (
            <>
              <Txt v="reply" color={C.sub}>
                {turn.kind === 'plan' ? '가게·재고·배달비를 확인하고 있어요' : '알아보고 있어요'}
              </Txt>
              <RunTimeline pendingFlow={turn.kind === 'plan' ? 'plan_order' : 'assistant_chat'} />
            </>
          ) : turn.status === 'error' ? (
            <>
              <ErrorView compact message={turn.error ?? '답을 받지 못했어요.'} onRetry={busy ? undefined : () => void send(turn.message, turn.kind)} />
            </>
          ) : run ? (
            <>
              <View style={{ gap: 6 }}>
                <Txt v="reply" style={run.summary.length > 70 ? { fontSize: 17, lineHeight: 25 } : undefined}>
                  {run.summary}
                </Txt>
                <Txt v="caption" color={C.sub} style={{ fontSize: 12 }}>
                  {run.summary_source === 'llm' ? 'AI가 다듬은 문장 · 숫자는 코드가 계산' : '규칙으로 만든 문장 · 숫자는 코드가 계산'}
                </Txt>
              </View>
              <RunTimeline run={run} animate={latest} defaultOpen={latest} />
              <ClaimList claims={run.public_claims} />
              {turn.proposal ? (
                <ProposalCard proposal={turn.proposal} accepted={turn.accepted} onAccept={accept} onOpenCart={() => router.push('/cart')} />
              ) : turn.kind === 'plan' ? (
                <Txt v="caption" color={C.sub} style={{ fontSize: 14 }}>
                  조건에 맞는 상품을 다 찾지 못했어요. 인원·예산·먹고 싶은 것을 바꿔 말해 보세요.
                </Txt>
              ) : null}
              {turn.kind === 'chat' && turn.suggestPlan ? <Button label="이 말로 장바구니 짜기" kind="outline" small onPress={() => void send(turn.message, 'plan')} disabled={busy} style={{ alignSelf: 'flex-start' }} /> : null}
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}
