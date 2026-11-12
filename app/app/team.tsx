// 에이전트 팀(하네스): /harness 팀별 묶음, 에이전트 카드(번호, 이름, LLM, 역할 첫 문단 → 펼치면 전체), 흐름
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AgentOrb } from '../src/components/AgentOrb';
import { Chip } from '../src/components/Chip';
import { Icon } from '../src/components/Icon';
import { Screen, StackHeader } from '../src/components/Screen';
import { ErrorView, Loading } from '../src/components/States';
import { Txt } from '../src/components/Txt';
import { useHarness } from '../src/hooks';
import type { HarnessAgent } from '../src/types';
import { color as C, radius, space } from '../src/theme';

const FLOW_LABEL: Record<string, string> = {
  plan_order: '한 문장 주문 → 장바구니 제안',
  cart_check: '직접 담은 장바구니 점검',
  assistant_chat: '앱 대화',
  care_nudges: '먼저 챙기기',
  stock_intake: '상인 말 → 재고·가격 제안',
};

// 카드 마크다운에서 "## 역할" 첫 문단
function roleOf(md: string | undefined) {
  if (!md) return '';
  const m = md.split(/\n## 역할\s*\n/)[1];
  const body = (m ?? md.replace(/^#.*\n/, '')).trim();
  return body.split(/\n\s*\n|\n## /)[0].replace(/\n/g, ' ').trim();
}

export default function TeamScreen() {
  const h = useHarness();
  const data = h.data;
  // 번호(no)가 없으면 하네스 목록 순서로 대신한다
  const byId = new Map((data?.agents ?? []).map((a, i) => [a.id, { ...a, no: typeof a.no === 'number' ? a.no : i }]));
  return (
    <Screen header={<StackHeader title="에이전트 팀" />} onRefresh={h.reload}>
      {h.loading && !data ? <Loading label="하르방 팀을 불러오는 중이에요" /> : null}
      {h.error && !data ? <ErrorView message={h.error} onRetry={h.reload} /> : null}
      {data ? (
        <>
          <View style={{ flexDirection: 'row', gap: space.l, alignItems: 'center' }}>
            <AgentOrb size={64} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="label" color={C.sub}>
                AGENT HARNESS
              </Txt>
              <Txt v="display" style={{ fontSize: 24, lineHeight: 30 }}>
                {`${data.persona?.name ?? '하르방'} 팀 ${data.agents.length}명`}
              </Txt>
              <Txt v="caption" color={C.sub}>
                {data.persona?.tagline ?? data.name}
              </Txt>
            </View>
          </View>
          <View style={{ backgroundColor: C.basalt, borderRadius: radius.card, padding: space.l, gap: 4 }}>
            <Txt v="captionMedium" color={C.white}>
              코드가 숫자를 만들고, AI는 말만 다듬어요
            </Txt>
            <Txt v="caption" color={C.basaltSub}>
              가격·재고·배달비·시간은 전부 코드가 계산해요. 주장마다 근거가 있어야 하고, 게이트를 통과한 주장만 화면에 나와요. AI는 제안만 하고 담기·주문은 사람이 눌러야 돼요.
            </Txt>
          </View>

          {data.teams.map((t) => (
            <View key={t.id} style={{ gap: space.m }}>
              <Txt v="title">{t.name}</Txt>
              {t.agents
                .map((id) => byId.get(id))
                .filter((a): a is HarnessAgent => !!a)
                .sort((a, b) => a.no - b.no)
                .map((a) => (
                  <AgentCardView key={a.id} agent={a} md={data.cards?.[a.id]} />
                ))}
            </View>
          ))}

          <View style={{ gap: space.m }}>
            <Txt v="title">흐름</Txt>
            {Object.entries(data.flows).map(([flow, ids]) => (
              <View key={flow} style={{ backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, padding: space.l, gap: space.s }}>
                <Txt v="bodyMedium">{FLOW_LABEL[flow] ?? flow}</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
                  {ids.map((id, i) => (
                    <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Chip small label={`${byId.get(id)?.no ?? ''} ${byId.get(id)?.name ?? id}`} tone="brand" />
                      {i < ids.length - 1 ? <Icon name="right" size={14} color={C.sub} /> : null}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function AgentCardView({ agent, md }: { agent: HarnessAgent; md?: string }) {
  const [open, setOpen] = useState(false);
  const role = roleOf(md);
  return (
    <Pressable
      onPress={() => setOpen(!open)}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      style={{ backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, padding: space.l, gap: space.s }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
          <Txt v="captionMedium" color={C.white} style={{ fontSize: 14 }}>
            {agent.no}
          </Txt>
        </View>
        <Txt v="bodyMedium" style={{ flex: 1 }}>
          {agent.name}
        </Txt>
        <Chip small label={agent.llm ? 'AI 사용' : '규칙'} tone={agent.llm ? 'dark' : 'neutral'} />
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <Icon name="down" size={16} color={C.sub} />
        </View>
      </View>
      {role ? (
        <Txt v="caption" color={C.sub} style={{ fontSize: 14, lineHeight: 21 }}>
          {role}
        </Txt>
      ) : null}
      {open && md ? <Markdown md={md} /> : null}
    </Pressable>
  );
}

// 카드용 아주 작은 마크다운 표시(제목·목록·본문)
function Markdown({ md }: { md: string }) {
  return (
    <View style={{ gap: 4, paddingTop: space.s, borderTopWidth: 1, borderTopColor: C.line }}>
      {md
        .split('\n')
        .filter((l) => l.trim() && !/^\|?\s*-{3,}/.test(l.trim()))
        .map((line, i) => {
          const t = line.trim();
          if (t.startsWith('# ')) return null;
          if (t.startsWith('## '))
            return (
              <Txt key={i} v="captionMedium" style={{ marginTop: 6, fontSize: 14 }}>
                {t.slice(3)}
              </Txt>
            );
          return (
            <Txt key={i} v="caption" color={C.sub} style={{ fontSize: 13 }}>
              {t.replace(/^[-*]\s+/, '· ').replace(/\*\*/g, '').replace(/`/g, '')}
            </Txt>
          );
        })}
    </View>
  );
}
