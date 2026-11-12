// 온도 배지: 냉장 = sea, 따뜻 = brand, 상온 = leaf
import type { Temp } from '../types';
import { Chip } from './Chip';

const MAP: Record<Temp, { label: string; tone: 'sea' | 'brand' | 'leaf' }> = {
  cold: { label: '냉장', tone: 'sea' },
  hot: { label: '따뜻', tone: 'brand' },
  room: { label: '상온', tone: 'leaf' },
};

export const tempTone = (t: Temp) => MAP[t]?.tone ?? 'leaf';

export function TempBadge({ temp }: { temp: Temp }) {
  const m = MAP[temp] ?? MAP.room;
  return <Chip label={m.label} tone={m.tone} small />;
}
