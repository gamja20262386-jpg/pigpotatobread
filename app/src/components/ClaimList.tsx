// 근거(v0.2 P): 주장 목록, 기본 3개 + "근거 N개 더 보기". 주장마다 수준 배지(확실/추정/확인 필요) + 근거 칩 1개 + "+N" → 누르면 작은 시트.
// "단, …" 대체 주장은 warnSoft 띠.
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { Claim } from '../types';
import { color as C, radius, space } from '../theme';
import { EVIDENCE, EvidenceChip } from './EvidenceChip';
import { Sheet } from './Sheet';
import { Txt } from './Txt';

const LEVEL: Record<Claim['level'], { label: string; fg: string; bg: string }> = {
  fact: { label: '확실', fg: C.leaf, bg: C.leafSoft },
  estimate: { label: '추정', fg: C.warn, bg: C.warnSoft },
  assumption: { label: '추정', fg: C.warn, bg: C.warnSoft },
  question: { label: '확인 필요', fg: C.danger, bg: C.dangerSoft },
};
export const isSubstitution = (text: string) => /^\s*단[,，]|\s단[,，]\s/.test(text);

export function ClaimList({ claims, initial = 3 }: { claims: Claim[]; initial?: number }) {
  const [open, setOpen] = useState(false);
  const visible = claims.filter((c) => !c.blocked);
  // "단, …" 대체 주장은 접혀 있어도 먼저 보이게 앞으로
  const ordered = [...visible.filter((c) => isSubstitution(c.text)), ...visible.filter((c) => !isSubstitution(c.text))];
  if (!ordered.length) return null;
  const shown = open ? ordered : ordered.slice(0, initial);
  const rest = ordered.length - shown.length;
  return (
    <View style={{ gap: space.s }}>
      <Txt v="label" color={C.sub}>
        근거 {ordered.length}
      </Txt>
      {shown.map((c, i) => (
        <ClaimRow key={`${c.agent_id}-${i}`} claim={c} />
      ))}
      {ordered.length > initial ? (
        <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" hitSlop={8} style={{ alignSelf: 'flex-start', paddingVertical: 6 }}>
          <Txt v="captionMedium" color={C.brandDark}>
            {open ? '근거 접기' : `근거 ${rest}개 더 보기`}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

function ClaimRow({ claim }: { claim: Claim }) {
  const [sheet, setSheet] = useState(false);
  const sub = isSubstitution(claim.text);
  const level = LEVEL[claim.level] ?? LEVEL.fact;
  const first = claim.evidence[0];
  const more = claim.evidence.length - 1;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space.s,
        paddingVertical: sub ? space.s : 2,
        paddingHorizontal: sub ? space.m : 0,
        backgroundColor: sub ? C.warnSoft : 'transparent',
        borderLeftWidth: sub ? 3 : 0,
        borderLeftColor: C.warn,
        borderRadius: sub ? radius.chip : 0,
      }}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Txt v="caption" color={sub ? C.warn : C.ink} style={{ fontSize: 14, lineHeight: 20 }}>
          {claim.text}
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ backgroundColor: level.bg, borderRadius: radius.chip, paddingHorizontal: 6, paddingVertical: 1 }}>
            <Txt v="captionMedium" color={level.fg} style={{ fontSize: 11, lineHeight: 16 }}>
              {level.label}
            </Txt>
          </View>
          {first ? (
            <Pressable onPress={() => setSheet(true)} accessibilityRole="button" accessibilityLabel={`근거 ${claim.evidence.length}개 보기`} hitSlop={6}>
              <View style={{ backgroundColor: (EVIDENCE[first.kind] ?? EVIDENCE.dataset).bg, borderRadius: radius.chip, paddingHorizontal: 6, paddingVertical: 1 }}>
                <Txt v="captionMedium" color={(EVIDENCE[first.kind] ?? EVIDENCE.dataset).fg} style={{ fontSize: 11, lineHeight: 16 }}>
                  {`${(EVIDENCE[first.kind] ?? EVIDENCE.dataset).label}${more > 0 ? ` +${more}` : ''}`}
                </Txt>
              </View>
            </Pressable>
          ) : null}
        </View>
      </View>
      {first ? (
        <Sheet visible={sheet} onClose={() => setSheet(false)} title="근거">
          <Txt v="body" style={{ fontSize: 15, lineHeight: 22 }}>
            {claim.text}
          </Txt>
          <View style={{ gap: space.s, alignItems: 'flex-start' }}>
            {claim.evidence.map((e, i) => (
              <EvidenceChip key={`${e.kind}-${e.ref}-${i}`} ev={e} />
            ))}
          </View>
        </Sheet>
      ) : null}
    </View>
  );
}
