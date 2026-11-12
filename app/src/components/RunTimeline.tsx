// 작업 과정(v0.2 P): 실행 중에는 한 줄 상태("시장 가게 고르는 중…"), 끝나면 접힌 한 줄 "✓ 5단계 확인 · 8초 ›".
// 펼치면 단계 목록 — 단계 이름은 한 일(주장에서 뽑은 짧은 말), 아래 작게 에이전트 번호·이름·AI. 새 결과는 120ms 간격으로 켜진다.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useHarness } from '../hooks';
import type { Claim, HarnessAgent, RunResult } from '../types';
import { color as C, radius, space } from '../theme';
import { Icon } from './Icon';
import { Txt } from './Txt';

type Step = { id: string; no: number | null; name: string; did: string; ok: boolean; llm: boolean; note?: string };

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

// 실행 중 한 줄 상태(에이전트 일을 쉬운 말로)
const DOING: Record<string, string> = {
  intake: '주문 문장 이해하는 중…',
  curator: '시장 가게 고르는 중…',
  bundler: '묶음 배송 짜는 중…',
  delivery: '배달비 계산 중…',
  freshness: '신선도 확인 중…',
  concierge: '답을 찾는 중…',
  care: '챙길 것 찾는 중…',
  stock_intake: '재고·가격 읽는 중…',
};

// 끝난 단계 이름: 그 에이전트가 낸 주장에서 뽑은 짧은 말
function didOf(id: string, claims: Claim[], fallback: string) {
  const texts = claims.map((c) => c.text);
  const find = (re: RegExp) => texts.map((t) => t.match(re)).find((m) => m);
  switch (id) {
    case 'intake':
      return claims.length ? `조건 ${claims.length}가지 파악` : '주문 문장 읽음';
    case 'curator': {
      const sub = texts.filter((t) => /^\s*단[,，]/.test(t)).length;
      const n = claims.length - sub;
      return n > 0 ? `메뉴 ${n}개 고름${sub ? ` · 대체 ${sub}` : ''}` : '메뉴 찾음';
    }
    case 'bundler': {
      const bags = texts.filter((t) => /보온백|보냉|봉투/.test(t)).length;
      return bags ? `봉투 ${bags}개로 묶음` : '묶음 배송 확인';
    }
    case 'delivery': {
      const m = find(/도착 예상 (\d+)분/);
      return m ? `도착 ${m[1]}분 계산` : '배달비 계산';
    }
    case 'freshness':
      return claims.length ? `신선 주의 ${claims.length}` : '신선 문제 없음';
    case 'care':
      return claims.length ? `챙길 것 ${claims.length}개` : '챙길 것 확인';
    case 'stock_intake':
      return claims.length ? `변경 ${claims.length}건 읽음` : '상인 말 읽음';
    case 'concierge':
      return '질문에 답함';
    default:
      return fallback;
  }
}

function buildSteps(run: RunResult, agents: Map<string, HarnessAgent>): Step[] {
  const fromEvents = run.events
    .filter((e) => e.type === 'agent_start' || e.type === 'agent_done')
    .map((e) => str(e.payload.agent_id) ?? str(e.payload.agent))
    .filter((x): x is string => !!x);
  const ids = run.plan?.length ? run.plan : [...new Set([...fromEvents, ...run.results.map((r) => r.agent_id)])];
  return ids.map((id) => {
    const r = run.results.find((x) => x.agent_id === id);
    const done = run.events.find((e) => e.type === 'agent_done' && (e.payload.agent_id === id || e.payload.agent === id));
    const a = agents.get(id);
    const ok = r ? r.ok : done && typeof done.payload.ok === 'boolean' ? done.payload.ok : true;
    const name = a?.name ?? id;
    return {
      id,
      no: a?.no ?? null,
      name,
      did: didOf(id, run.public_claims.filter((c) => c.agent_id === id), name),
      ok,
      llm: r?.used_llm ?? done?.payload.used_llm === true,
      note: r?.error ?? undefined,
    };
  });
}

export function RunTimeline({
  run,
  pendingFlow,
  animate,
  defaultOpen = false,
  dark,
  ms,
}: {
  run?: RunResult;
  pendingFlow?: string;
  animate?: boolean;
  defaultOpen?: boolean;
  dark?: boolean;
  ms?: number;
}) {
  const harness = useHarness();
  // 번호(no)가 없으면 하네스 목록 순서로 대신한다
  const agents = new Map((harness.data?.agents ?? []).map((a, i) => [a.id, { ...a, no: typeof a.no === 'number' ? a.no : i }]));
  const [open, setOpen] = useState(defaultOpen);
  const steps: Step[] = run ? buildSteps(run, agents) : [];
  const flow = harness.data?.flows[pendingFlow ?? ''] ?? [];

  // 결과가 오면 0 → steps.length 로 120ms마다 하나씩 켠다
  const total = steps.length;
  const [lit, setLit] = useState(run && !animate ? total : 0);
  useEffect(() => {
    if (!run) return;
    if (!animate) {
      setLit(total);
      return;
    }
    setLit(0);
    const t = setInterval(() => setLit((n) => (n >= total ? n : n + 1)), 120);
    return () => clearInterval(t);
  }, [run, animate, total]);

  // 실행 중: 흐름 에이전트를 1.2초마다 다음으로(서버가 끝나야 실제 결과를 안다)
  const [cursor, setCursor] = useState(0);
  useEffect(() => {
    if (run) return;
    const t = setInterval(() => setCursor((n) => n + 1), 1200);
    return () => clearInterval(t);
  }, [run]);

  const fg = dark ? C.white : C.ink;
  const sub = dark ? C.basaltSub : C.sub;
  const box = { borderRadius: radius.card, backgroundColor: dark ? C.basaltLine : C.bg, paddingHorizontal: space.m, paddingVertical: space.s, gap: space.s } as const;

  if (!run) {
    const id = flow.length ? flow[Math.min(cursor, flow.length - 1)] : undefined;
    return (
      <View style={[box, { flexDirection: 'row', alignItems: 'center', minHeight: 40 }]} accessibilityRole="progressbar">
        <ActivityIndicator size="small" color={C.brand} />
        <Txt v="captionMedium" color={fg} style={{ fontSize: 14, flex: 1 }} numberOfLines={1}>
          {(id && DOING[id]) || '하르방 팀이 확인하는 중…'}
        </Txt>
      </View>
    );
  }

  const warn = steps.filter((s) => !s.ok).length;
  const secs = ms ? ` · ${Math.max(1, Math.round(ms / 1000))}초` : '';
  return (
    <View style={box}>
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel="작업 과정"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 }}
      >
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: warn ? C.warn : C.leaf, alignItems: 'center', justifyContent: 'center' }}>
          {warn ? (
            <Txt v="captionMedium" color={C.white} style={{ fontSize: 12, lineHeight: 16 }}>
              !
            </Txt>
          ) : (
            <Icon name="check" size={12} color={C.white} stroke={3} />
          )}
        </View>
        <Txt v="captionMedium" color={fg} style={{ fontSize: 14, flex: 1 }} numberOfLines={1}>
          {`${total}단계 확인${warn ? ` · 주의 ${warn}` : ''}${secs}`}
        </Txt>
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <Icon name="right" size={16} color={sub} />
        </View>
      </Pressable>

      {open && total > 0 ? (
        <View>
          {steps.map((s, i) => (
            <StepRow key={s.id} step={s} on={i < lit} last={i === total - 1} dark={dark} />
          ))}
          {lit >= total ? <GateRow run={run} dark={dark} /> : null}
        </View>
      ) : null}
    </View>
  );
}

function StepRow({ step, on, last, dark }: { step: Step; on: boolean; last: boolean; dark?: boolean }) {
  const fg = dark ? C.white : C.ink;
  const sub = dark ? C.basaltSub : C.sub;
  const dotBg = !on ? (dark ? C.basalt : C.line) : step.ok ? C.leaf : C.warn;
  return (
    <View style={{ flexDirection: 'row', gap: 10, opacity: on ? 1 : 0.45 }}>
      <View style={{ alignItems: 'center', width: 20 }}>
        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: dotBg, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
          {on && step.ok ? <Icon name="check" size={12} color={C.white} stroke={3} /> : on ? <Txt v="captionMedium" color={C.white} style={{ fontSize: 12, lineHeight: 16 }}>!</Txt> : null}
        </View>
        {!last ? <View style={{ width: 2, flex: 1, minHeight: 8, backgroundColor: dark ? C.basalt : C.line }} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 2 : 8, gap: 1 }}>
        <Txt v="captionMedium" color={step.ok ? fg : C.warn} style={{ fontSize: 14 }} numberOfLines={1}>
          {step.ok ? step.did : step.note || '확인이 필요해요'}
        </Txt>
        <Txt v="caption" color={sub} style={{ fontSize: 12, lineHeight: 16 }} numberOfLines={1}>
          {`${step.no !== null ? `#${step.no} ` : ''}${step.name}${step.llm ? ' · AI' : ''}`}
        </Txt>
      </View>
    </View>
  );
}

function GateRow({ run, dark }: { run: RunResult; dark?: boolean }) {
  const sub = dark ? C.basaltSub : C.sub;
  const llmText = run.summary_source === 'llm' ? `AI가 말을 다듬음 · ${run.llm.model.split(':')[0]}` : '규칙 템플릿으로 요약';
  return (
    <View style={{ marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: dark ? C.basalt : C.line }}>
      <Txt v="caption" color={sub} style={{ fontSize: 12 }}>
        {`게이트 통과 ${run.public_claims.length}${run.blocked_count ? ` · 뺀 주장 ${run.blocked_count}` : ''} · ${llmText}`}
      </Txt>
    </View>
  );
}
