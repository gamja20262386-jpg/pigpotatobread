import { Platform, Text, type TextProps, type TextStyle } from 'react-native';
import { color as C, type as T } from '../theme';

type Variant = keyof typeof T;

// 웹에서 한글이 글자 단위로 끊기지 않게(어절 단위 줄바꿈)
const webBreak = Platform.OS === 'web' ? ({ wordBreak: 'keep-all' } as unknown as TextStyle) : null;

export function Txt({ v = 'body', color, style, ...rest }: TextProps & { v?: Variant; color?: string }) {
  return <Text {...rest} style={[T[v], webBreak, { color: color ?? C.ink }, style]} />;
}
