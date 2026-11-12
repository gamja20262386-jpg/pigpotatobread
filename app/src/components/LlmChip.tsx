// LLM 상태 칩: `로컬 AI · ax4-light`(초록) / `규칙 모드`(회색)
import { shortModel, useHealth } from '../hooks';
import { Chip } from './Chip';

export function LlmChip() {
  const h = useHealth();
  if (h.loading && !h.data) return <Chip small pill label="AI 확인 중" />;
  const llm = h.data?.llm;
  if (!llm || !llm.available) return <Chip small pill label={h.error ? '서버 연결 안 됨' : '규칙 모드'} tone={h.error ? 'danger' : 'neutral'} onPress={h.error ? h.reload : undefined} />;
  const where = llm.provider === 'ollama' ? '로컬 AI' : 'AI';
  return <Chip small pill label={`${where} · ${shortModel(llm.model)}`} tone="leaf" />;
}
