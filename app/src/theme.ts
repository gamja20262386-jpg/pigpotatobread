// 제주잇 디자인 토큰 (docs/DESIGN.md §1·§2). 색·반경·간격·글꼴은 여기서만 정한다.
import { Platform } from 'react-native';

export const color = {
  brand: '#FF6B00',
  brandDark: '#E05D00',
  brandSoft: '#FFF1E6',
  bg: '#FAF7F2',
  card: '#FFFFFF',
  ink: '#1B1A17',
  sub: '#6E6A63',
  line: '#E7E1D7',
  basalt: '#23211E',
  basaltLine: '#3A3732',
  basaltSub: '#B9B3A9',
  basaltActive: 'rgba(255,255,255,0.14)',
  sea: '#1E6F6B',
  seaSoft: '#E6F1F0',
  leaf: '#4F7A3A',
  leafSoft: '#EDF3E8',
  warn: '#B45309',
  warnSoft: '#FEF3C7',
  danger: '#D93025',
  dangerSoft: '#FDECEA',
  white: '#FFFFFF',
  scrim: 'rgba(27,26,23,0.45)',
  frameBg: '#E9E3D8',
  black: '#000000',
} as const;

// 하르방 오브 그라데이션(주황 → 진한 주황)
export const orbGradient = ['#FFA040', '#FF6B00', '#C94F00'] as const;

export const radius = { chip: 8, card: 16, sheet: 24, pill: 999 } as const;
export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 20, xxl: 24, xxxl: 32, screen: 20 } as const;
export const size = { touch: 44, button: 52, navPill: 64 } as const;

export const font = {
  serif: 'NotoSerifKR_600SemiBold',
  regular: 'NotoSansKR_400Regular',
  medium: 'NotoSansKR_500Medium',
  bold: 'NotoSansKR_700Bold',
} as const;

export const type = {
  display: { fontFamily: font.serif, fontSize: 28, lineHeight: 34 },
  title: { fontFamily: font.bold, fontSize: 20, lineHeight: 26 },
  serifTitle: { fontFamily: font.serif, fontSize: 20, lineHeight: 26 },
  reply: { fontFamily: font.bold, fontSize: 19, lineHeight: 26 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: font.medium, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  captionMedium: { fontFamily: font.medium, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: font.bold, fontSize: 11, lineHeight: 14, letterSpacing: 1.2, textTransform: 'uppercase' as const },
} as const;

// 떠 있는 것(NavPill, 시트, 에이전트 카드)만 부드러운 그림자
export const floatShadow = Platform.select({
  web: { boxShadow: '0 10px 30px rgba(35,33,30,0.14)' },
  default: { shadowColor: '#23211E', shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
}) as object;

export const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;
