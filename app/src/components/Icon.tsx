// 선 아이콘 몇 개(react-native-svg). 24 격자, 굵기 2.
import Svg, { Circle, Path } from 'react-native-svg';
import { color as C } from '../theme';

const PATHS = {
  home: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h5v-6h4v6h5V9.5'],
  market: ['M3 9h18l-1.5-5h-15z', 'M3 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3', 'M5 12v9h14v-9', 'M10 21v-5h4v5'],
  receipt: ['M6 3h12v18l-3-2-3 2-3-2-3 2z', 'M9 8h6', 'M9 12h6'],
  user: ['M4 21c0-4 3.6-7 8-7s8 3 8 7'],
  bag: ['M5 8h14l-1 13H6z', 'M9 8V6a3 3 0 0 1 6 0v2'],
  back: ['M15 18l-6-6 6-6'],
  close: ['M18 6 6 18', 'M6 6l12 12'],
  send: ['M12 19V5', 'M5 12l7-7 7 7'],
  check: ['M20 6 9 17l-5-5'],
  down: ['M6 9l6 6 6-6'],
  right: ['M9 6l6 6-6 6'],
  pin: ['M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  clock: ['M12 7v5l3 2'],
  team: ['M3 20c0-3 2.5-5 6-5s6 2 6 5', 'M15 14c3 0 6 1.8 6 5'],
  store: ['M4 10v10h16V10', 'M2 10l2-6h16l2 6z', 'M9 20v-6h6v6'],
  search: ['M20 20l-4.2-4.2'],
  info: ['M12 11v5', 'M12 8h.01'],
  heart: ['M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z'],
  spark: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z'],
} as const;

const CIRCLES: Partial<Record<keyof typeof PATHS, [number, number, number][]>> = {
  user: [[12, 8, 4]],
  pin: [[12, 10, 2.5]],
  clock: [[12, 12, 9]],
  search: [[11, 11, 6.5]],
  info: [[12, 12, 9]],
  team: [[9, 8, 3.5], [16, 7, 2.8]],
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, color = C.ink, stroke = 2, fill = 'none' }: { name: IconName; size?: number; color?: string; stroke?: number; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {PATHS[name].map((d) => (
        <Path key={d} d={d} fill={fill} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {CIRCLES[name]?.map(([cx, cy, r]) => (
        <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} stroke={color} strokeWidth={stroke} />
      ))}
    </Svg>
  );
}
