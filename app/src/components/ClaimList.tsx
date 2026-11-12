// 근거: 주장 목록. 주장마다 근거 칩, 기본 3개 + "근거 N개 더 보기". "단, …" 대체 주장은 warnSoft 띠.
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import type { Claim } from '../types';
import { color as C, radius, space } from '../theme';
import { EvidenceChip } from './EvidenceChip';
import { Txt } from './Txt';

const LEVEL: Partial<Record<Claim['level'], string>> = { estimate: '추정', assumption: '가정', question: '확인 필요' };
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
  const sub = isSubstitution(claim.text);
  const level = LEVEL[claim.level];
  return (
    <View
      style={{
        gap: 6,
        paddingVertical: sub ? space.s : 2,
        paddingHorizontal: sub ? space.m : 0,
        backgroundColor: sub ? C.warnSoft : 'transparent',
        borderLeftWidth: sub ? 3 : 0,
        borderLeftColor: C.warn,
        borderRadius: sub ? radius.chip : 0,
      }}
    >
      <Txt v="caption" color={sub ? C.warn : C.ink} style={{ fontSize: 14, lineHeight: 20 }}>
        {level ? <Txt v="captionMedium" color={C.sub} style={{ fontSize: 12 }}>{`${level}  `}</Txt> : null}
        {claim.text}
      </Txt>
      {claim.evidence.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {claim.evidence.map((e, i) => (
            <EvidenceChip key={`${e.kind}-${e.ref}-${i}`} ev={e} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
