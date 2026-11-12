// 에이전트 팀(v0.2 K·P): 목표 한 줄 → "어떻게 일하나요 ›" → 팀 지도(지휘 오브 → 4팀, svg 선) →
// 팀별 접힌 목록(펼치면 에이전트: 번호·이름·역할 한 줄·AI/규칙, 누르면 카드 전체 시트) → 흐름 세그먼트 + 가로 스텝퍼(끝에 '사람 승인')
import { useRef, useState } from 'react';
import { Pressable, ScrollView, View, type ScrollViewInstance } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AgentOrb } from '../src/components/AgentOrb';
import { Chip } from '../src/components/Chip';
import { Icon, type IconName } from '../src/components/Icon';
import { Screen, StackHeader } from '../src/components/Screen';
import { Sheet } from '../src/components/Sheet';
import { ErrorView, Loading } from '../src/components/States';
import { Txt } from '../src/components/Txt';
import { useHarness } from '../src/hooks';
import type { HarnessAgent } from '../src/types';
import { color as C, font, radius, space } from '../src/theme';

const FLOW_LABEL: Record<string, string> = {
  plan_order: '한 문장 주문',
  cart_check: '장바구니 점검',
  assistant_chat: '대화',
  care_nudges: '먼저 챙기기',
  stock_intake: '상인 입력',
};
const APPROVAL: Record<string, string> = {
  plan_order: '이대로 담기',
  cart_check: '주문하기',
  assistant_chat: '다음 말',
  care_nudges: '맡기기',
  stock_intake: '반영하기',
};

const TEAM_LOOK: Record<string, { icon: IconName; fg: string; bg: string; short: string }> = {
  command: { icon: 'spark', fg: C.brandDark, bg: C.brandSoft, short: '지휘' },
  order: { icon: 'bag', fg: C.sea, bg: C.seaSoft, short: '주문 설계' },
  care: { icon: 'heart', fg: C.leaf, bg: C.leafSoft, short: '신선·챙김' },
  merchant: { icon: 'store', fg: C.warn, bg: C.warnSoft, short: '상인 도우미' },
};
const lookOf = (id: string) => TEAM_LOOK[id] ?? { icon: 'team' as IconName, fg: C.ink, bg: C.bg, short: id };

// 카드 마크다운 "## 역할" 첫 문장, 30자 넘으면 말줄임
function roleLine(md: string | undefined) {
  if (!md) return '';
  const m = md.split(/\n## 역할\s*\n/)[1] ?? md.replace(/^#.*\n/, '');
  const para = m.trim().split(/\n\s*\n|\n## /)[0].replace(/\n/g, ' ').trim();
  const first = para.split(/(?:다|요)\.\s|\.\s/)[0].replace(/[.]$/, '');
  return first.length > 30 ? `${first.slice(0, 30)}…` : first;
}

export default function TeamScreen() {
  const h = useHarness();
  const data = h.data;
  const scroll = useRef<ScrollViewInstance>(null);
  const teamsY = useRef(0);
  const teamY = useRef<Record<string, number>>({});
  const [openTeams, setOpenTeams] = useState<string[]>([]);
  const [how, setHow] = useState(false);
  const [flow, setFlow] = useState('plan_order');
  const [sheet, setSheet] = useState<HarnessAgent | null>(null);
  const [mapW, setMapW] = useState(0);

  // 번호(no)가 없으면 하네스 목록 순서로 대신한다
  const byId = new Map((data?.agents ?? []).map((a, i) => [a.id, { ...a, no: typeof a.no === 'number' ? a.no : i }]));
  const teams = data?.teams ?? [];
  const toggleTeam = (id: string) => setOpenTeams((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const goTeam = (id: string) => {
    setOpenTeams((s) => (s.includes(id) ? s : [...s, id]));
    const y = teamY.current[id];
    if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, teamsY.current + y - space.s), animated: true });
  };
  const flowIds = data?.flows[flow] ?? [];

  return (
    <Screen header={<StackHeader title="에이전트 팀" />} onRefresh={h.reload} scrollRef={scroll}>
      {h.loading && !data ? <Loading label="하르방 팀을 불러오는 중이에요" /> : null}
      {h.error && !data ? <ErrorView message={h.error} onRetry={h.reload} /> : null}
      {data ? (
        <>
          {/* 머리: 목표 한 줄 */}
          <View style={{ flexDirection: 'row', gap: space.m, alignItems: 'center' }}>
            <AgentOrb size={52} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="display" style={{ fontSize: 22, lineHeight: 30 }}>
                {`${data.persona?.name ?? '하르방'} 팀 ${data.agents.length}명`}
              </Txt>
              <Txt v="caption" color={C.sub} numberOfLines={1}>
                한 문장 → 장바구니 → 사람이 승인
              </Txt>
            </View>
          </View>

          {/* 어떻게 일하나요 › */}
          <View style={{ backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line }}>
            <Pressable onPress={() => setHow(!how)} accessibilityRole="button" accessibilityState={{ expanded: how }} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: space.l }}>
              <Txt v="bodyMedium" style={{ flex: 1, fontSize: 15 }}>
                어떻게 일하나요
              </Txt>
              <View style={{ transform: [{ rotate: how ? '90deg' : '0deg' }] }}>
                <Icon name="right" size={16} color={C.sub} />
              </View>
            </Pressable>
            {how ? (
              <View style={{ paddingHorizontal: space.l, paddingBottom: space.m, gap: 4 }}>
                {['숫자는 코드가 계산해요', '근거 있는 주장만 보여요', 'AI는 말만 다듬어요', '담기·주문은 사람이 눌러요'].map((t) => (
                  <Txt key={t} v="caption" color={C.sub} style={{ fontSize: 14 }}>{`· ${t}`}</Txt>
                ))}
              </View>
            ) : null}
          </View>

          {/* 팀 지도 */}
          <View onLayout={(e) => setMapW(e.nativeEvent.layout.width)} style={{ height: 140 }}>
            {mapW > 0 ? (
              <Svg width={mapW} height={140} style={{ position: 'absolute', left: 0, top: 0 }}>
                {teams.map((t, i) => {
                  const cx = (mapW * (2 * i + 1)) / (2 * teams.length);
                  return <Path key={t.id} d={`M ${mapW / 2} 46 C ${mapW / 2} 62, ${cx} 58, ${cx} 74`} stroke={C.line} strokeWidth={2} fill="none" />;
                })}
              </Svg>
            ) : null}
            <View style={{ alignItems: 'center' }}>
              <AgentOrb size={46} />
            </View>
            <View style={{ flexDirection: 'row', marginTop: 28 }}>
              {teams.map((t) => {
                const look = lookOf(t.id);
                return (
                  <Pressable key={t.id} onPress={() => goTeam(t.id)} accessibilityRole="button" accessibilityLabel={`${t.name} 보기`} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: look.bg, borderWidth: 2, borderColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={look.icon} size={20} color={look.fg} />
                    </View>
                    <Txt v="captionMedium" numberOfLines={1} style={{ fontSize: 12, lineHeight: 16 }}>
                      {look.short}
                    </Txt>
                    <Txt v="caption" color={C.sub} style={{ fontSize: 11, lineHeight: 14 }}>
                      {`${t.agents.length}명`}
                    </Txt>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 팀별 목록(펼쳤을 때만 이름) */}
          <View
            onLayout={(e) => {
              teamsY.current = e.nativeEvent.layout.y;
            }}
            style={{ gap: space.s }}
          >
            {teams.map((t) => {
              const look = lookOf(t.id);
              const open = openTeams.includes(t.id);
              const members = t.agents
                .map((id) => byId.get(id))
                .filter((a): a is HarnessAgent & { no: number } => !!a)
                .sort((a, b) => a.no - b.no);
              return (
                <View
                  key={t.id}
                  onLayout={(e) => {
                    teamY.current[t.id] = e.nativeEvent.layout.y;
                  }}
                  style={{ backgroundColor: C.card, borderRadius: radius.card, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}
                >
                  <Pressable onPress={() => toggleTeam(t.id)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 52, paddingHorizontal: space.l }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: look.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={look.icon} size={16} color={look.fg} />
                    </View>
                    <Txt v="bodyMedium" style={{ flex: 1, fontSize: 15, fontFamily: font.bold }} numberOfLines={1}>
                      {t.name}
                    </Txt>
                    <Txt v="caption" color={C.sub}>{`${members.length}명`}</Txt>
                    <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
                      <Icon name="right" size={16} color={C.sub} />
                    </View>
                  </Pressable>
                  {open
                    ? members.map((a) => (
                        <Pressable
                          key={a.id}
                          onPress={() => setSheet(a)}
                          accessibilityRole="button"
                          accessibilityLabel={`${a.name} 카드 보기`}
                          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.m, paddingHorizontal: space.l, paddingVertical: space.m, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: pressed ? C.bg : C.card })}
                        >
                          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
                            <Txt v="captionMedium" color={C.white} style={{ fontSize: 13 }}>
                              {a.no}
                            </Txt>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Txt v="bodyMedium" style={{ fontSize: 15, lineHeight: 21 }} numberOfLines={1}>
                              {a.name}
                            </Txt>
                            <Txt v="caption" color={C.sub} numberOfLines={1}>
                              {roleLine(data.cards?.[a.id])}
                            </Txt>
                          </View>
                          <Chip small label={a.llm ? 'AI' : '규칙'} tone={a.llm ? 'dark' : 'neutral'} />
                        </Pressable>
                      ))
                    : null}
                </View>
              );
            })}
          </View>

          {/* 흐름: 세그먼트 + 가로 스텝퍼 */}
          <View style={{ gap: space.m }}>
            <Txt v="title">흐름</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.screen }} contentContainerStyle={{ paddingHorizontal: space.screen, gap: 6 }}>
              {Object.keys(data.flows).map((f) => (
                <Chip key={f} label={FLOW_LABEL[f] ?? f} pill active={flow === f} onPress={() => setFlow(f)} />
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row' }}>
              {[...flowIds, '__human'].map((id, i, all) => {
                const human = id === '__human';
                const a = byId.get(id);
                return (
                  <View key={id} style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 6 }}>
                    <View style={{ width: '100%', height: 32, alignItems: 'center', justifyContent: 'center' }}>
                      {i > 0 ? <View style={{ position: 'absolute', left: 0, right: '50%', height: 2, backgroundColor: C.line }} /> : null}
                      {i < all.length - 1 ? <View style={{ position: 'absolute', left: '50%', right: 0, height: 2, backgroundColor: C.line }} /> : null}
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: human ? C.card : C.brand,
                          borderWidth: human ? 2 : 0,
                          borderColor: C.brand,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {human ? (
                          <Icon name="user" size={16} color={C.brand} />
                        ) : (
                          <Txt v="captionMedium" color={C.white} style={{ fontSize: 13 }}>
                            {a?.no ?? i + 1}
                          </Txt>
                        )}
                      </View>
                    </View>
                    <Txt v="caption" numberOfLines={2} style={{ fontSize: 11.5, lineHeight: 15, textAlign: 'center', fontFamily: human ? font.bold : font.regular }} color={human ? C.brandDark : C.ink}>
                      {human ? '사람 승인' : a?.name ?? id}
                    </Txt>
                    {human ? (
                      <Txt v="caption" color={C.sub} numberOfLines={1} style={{ fontSize: 10.5, lineHeight: 14, marginTop: -4 }}>
                        {APPROVAL[flow] ?? '확인'}
                      </Txt>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>

          <Sheet visible={!!sheet} onClose={() => setSheet(null)} title={sheet ? `${sheet.no}. ${sheet.name}` : ''}>
            {sheet ? <Markdown md={data.cards?.[sheet.id] ?? ''} /> : null}
          </Sheet>
        </>
      ) : null}
    </Screen>
  );
}

// 카드용 아주 작은 마크다운 표시(제목·목록·본문)
function Markdown({ md }: { md: string }) {
  if (!md.trim()) return <Txt v="caption" color={C.sub}>카드 내용이 없어요</Txt>;
  return (
    <View style={{ gap: 4 }}>
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
