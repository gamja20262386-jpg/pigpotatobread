// 작업 과정: RunResult.events + GET /harness 에이전트 번호·이름으로 단계를 그린다.
// 새 결과는 단계가 120ms 간격으로 차례로 켜지고, 실행 중에는 흐름의 에이전트를 돌아가며 비춘다.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useHarness } from '../hooks';
import type { HarnessAgent, RunResult } from '../types';
import { color as C, radius, space } from '../theme';
import { Icon } from './Icon';
import { Txt } from './Txt';

type Step = { id: string; no: number | null; name: string; ok: boolean; llm: boolean; claims: number; note?: string };

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

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
    return {
      id,
      no: a?.no ?? null,
      name: a?.name ?? id,
      ok,
      llm: r?.used_llm ?? done?.payload.used_llm === true,
      claims: run.public_claims.filter((c) => c.agent_id === id).length,
      note: r?.error ?? undefined,
    };
  });
}

export function RunTimeline({
  run,
  pendingFlow,
  animate,
  defaultOpen = true,
  dark,
}: {
  run?: RunResult;
  pendingFlow?: string;
  animate?: boolean;
  defaultOpen?: boolean;
  dark?: boolean;
}) {
  const harness = useHarness();
  // 번호(no)가 없으면 하네스 목록 순서로 대신한다
  const agents = new Map((harness.data?.agents ?? []).map((a, i) => [a.id, { ...a, no: typeof a.no === 'number' ? a.no : i }]));
  const [open, setOpen] = useState(defaultOpen);

  const steps: Step[] = run
    ? buildSteps(run, agents)
    : (harness.data?.flows[pendingFlow ?? ''] ?? []).map((id) => ({ id, no: agents.get(id)?.no ?? null, name: agents.get(id)?.name ?? id, ok: true, llm: !!agents.get(id)?.llm, claims: 0 }));

  // 결과가 오면 0 → steps.length 로 120ms마다 하나씩 켠다
  const [lit, setLit] = useState(run && !animate ? steps.length : 0);
  const total = steps.length;
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

  // 실행 중: 흐름 에이전트를 600ms마다 하나씩 비춘다(서버가 끝나야 실제 결과를 안다)
  const [cursor, setCursor] = useState(0);
  useEffect(() => {
    if (run) return;
    const t = setInterval(() => setCursor((n) => n + 1), 600);
    return () => clearInterval(t);
  }, [run]);

  const fg = dark ? C.white : C.ink;
  const sub = dark ? C.basaltSub : C.sub;
  const warnCount = steps.filter((s) => !s.ok).length;
  const title = run ? `하르방 팀이 ${total}단계로 확인했어요` : '하르방 팀이 확인하고 있어요';

  return (
    <View style={{ borderRadius: radius.card, backgroundColor: dark ? C.basaltLine : C.bg, padding: space.m, gap: space.s }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 }}>
        {run ? null : <ActivityIndicator size="small" color={C.brand} />}
        <View style={{ flex: 1 }}>
          <Txt v="captionMedium" color={fg} style={{ fontSize: 14 }}>
            {title}
          </Txt>
          {run ? (
            <Txt v="caption" color={sub} style={{ fontSize: 12 }}>
              {`기록 ${run.events.length}개 · 통과한 주장 ${run.public_claims.length}개${run.blocked_count ? ` · 뺀 주장 ${run.blocked_count}개` : ''}${warnCount ? ` · 주의 ${warnCount}` : ''}`}
            </Txt>
          ) : null}
        </View>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <Icon name="down" size={18} color={sub} />
        </View>
      </Pressable>

      {open && steps.length > 0 ? (
        <View style={{ gap: 0 }}>
          {steps.map((s, i) => {
            const at = Math.min(cursor, total - 1);
            const on = run ? i < lit : i <= at;
            const current = !run && i === at;
            return (
              <StepRow key={s.id} step={s} on={on} current={current} last={i === total - 1} done={!!run} dark={dark} />
            );
          })}
          {run && lit >= total ? <GateRow run={run} dark={dark} /> : null}
        </View>
      ) : null}
      {open && !run && harness.error ? (
        <Txt v="caption" color={sub}>
          에이전트 목록을 불러오지 못했어요
        </Txt>
      ) : null}
    </View>
  );
}

function StepRow({ step, on, current, last, done, dark }: { step: Step; on: boolean; current: boolean; last: boolean; done: boolean; dark?: boolean }) {
  const fg = dark ? C.white : C.ink;
  const sub = dark ? C.basaltSub : C.sub;
  const dotBg = !on ? (dark ? C.basalt : C.line) : !done ? C.brand : step.ok ? C.leaf : C.warn;
  return (
    <View style={{ flexDirection: 'row', gap: 10, opacity: on ? 1 : 0.45 }}>
      <View style={{ alignItems: 'center', width: 24 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: dotBg, alignItems: 'center', justifyContent: 'center' }}>
          {done && on ? (
            step.ok ? (
              <Icon name="check" size={14} color={C.white} stroke={3} />
            ) : (
              <Txt v="captionMedium" color={C.white} style={{ fontSize: 13 }}>
                !
              </Txt>
            )
          ) : (
            <Txt v="captionMedium" color={on ? C.white : sub} style={{ fontSize: 12 }}>
              {step.no ?? '·'}
            </Txt>
          )}
        </View>
        {!last ? <View style={{ width: 2, flex: 1, minHeight: 10, backgroundColor: dark ? C.basalt : C.line }} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 2 : 10, paddingTop: 2, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Txt v="captionMedium" color={fg} style={{ fontSize: 14 }}>
            {done && step.no !== null ? <Txt v="captionMedium" color={sub} style={{ fontSize: 12 }}>{`#${step.no} `}</Txt> : null}
            {step.name}
          </Txt>
          {step.llm ? (
            <View style={{ backgroundColor: dark ? C.brand : C.basalt, borderRadius: radius.chip, paddingHorizontal: 5 }}>
              <Txt v="label" color={C.white} style={{ fontSize: 10, letterSpacing: 0.6 }}>
                AI
              </Txt>
            </View>
          ) : null}
        </View>
        <Txt v="caption" color={step.ok ? sub : C.warn} style={{ fontSize: 12 }}>
          {!done ? (current ? '확인 중…' : on ? '다음 단계로 넘겼어요' : '대기') : !step.ok ? step.note || '확인이 필요해요' : step.claims ? `주장 ${step.claims}개` : '확인 완료'}
        </Txt>
      </View>
    </View>
  );
}

function GateRow({ run, dark }: { run: RunResult; dark?: boolean }) {
  const sub = dark ? C.basaltSub : C.sub;
  const llmText = run.summary_source === 'llm' ? `AI가 말을 다듬음 · ${run.llm.model.split(':')[0]}` : '규칙 템플릿으로 요약';
  return (
    <View style={{ marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: dark ? C.basalt : C.line, gap: 2 }}>
      <Txt v="caption" color={sub} style={{ fontSize: 12 }}>
        {`게이트(근거·표현·개인정보) 통과 ${run.public_claims.length}개${run.blocked_count ? ` · 뺀 주장 ${run.blocked_count}개` : ''}`}
      </Txt>
      <Txt v="caption" color={sub} style={{ fontSize: 12 }}>
        {llmText}
      </Txt>
    </View>
  );
}
