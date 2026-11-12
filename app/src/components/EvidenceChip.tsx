// 근거 칩: 데이터 / 계산 / 가정 / 입력 / AI 추출 — 종류마다 색이 다르다
import { View } from 'react-native';
import type { Evidence, EvidenceKind } from '../types';
import { color as C, radius } from '../theme';
import { Txt } from './Txt';

export const EVIDENCE: Record<EvidenceKind, { label: string; bg: string; fg: string }> = {
  dataset: { label: '데이터', bg: C.seaSoft, fg: C.sea },
  calc: { label: '계산', bg: C.brandSoft, fg: C.brandDark },
  assumption: { label: '가정', bg: C.warnSoft, fg: C.warn },
  input: { label: '입력', bg: C.leafSoft, fg: C.leaf },
  llm: { label: 'AI 추출', bg: C.basalt, fg: C.white },
};

export function EvidenceChip({ ev }: { ev: Evidence }) {
  const k = EVIDENCE[ev.kind] ?? EVIDENCE.dataset;
  const detail = ev.label || ev.ref;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: k.bg, borderRadius: radius.chip, paddingHorizontal: 7, paddingVertical: 2, maxWidth: '100%' }}>
      <Txt v="captionMedium" color={k.fg} style={{ fontSize: 12, lineHeight: 17 }} numberOfLines={1}>
        {k.label}
        {detail ? <Txt v="caption" color={k.fg} style={{ fontSize: 12, lineHeight: 17, opacity: 0.85 }}>{` · ${detail}`}</Txt> : null}
      </Txt>
    </View>
  );
}
