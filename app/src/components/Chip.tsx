import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { color as C, radius } from '../theme';
import { Txt } from './Txt';

type Tone = 'neutral' | 'brand' | 'sea' | 'leaf' | 'warn' | 'danger' | 'dark' | 'outline';
const TONES: Record<Tone, { bg: string; fg: string; border?: string }> = {
  neutral: { bg: C.bg, fg: C.ink, border: C.line },
  brand: { bg: C.brandSoft, fg: C.brandDark },
  sea: { bg: C.seaSoft, fg: C.sea },
  leaf: { bg: C.leafSoft, fg: C.leaf },
  warn: { bg: C.warnSoft, fg: C.warn },
  danger: { bg: C.dangerSoft, fg: C.danger },
  dark: { bg: C.basalt, fg: C.white },
  outline: { bg: C.card, fg: C.ink, border: C.line },
};

export function Chip({
  label,
  tone = 'neutral',
  active,
  onPress,
  pill,
  small,
  style,
}: {
  label: string;
  tone?: Tone;
  active?: boolean;
  onPress?: () => void;
  pill?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = active ? { bg: C.basalt, fg: C.white, border: C.basalt } : TONES[tone];
  const box: ViewStyle = {
    backgroundColor: t.bg,
    borderColor: t.border ?? t.bg,
    borderWidth: 1,
    borderRadius: pill ? radius.pill : radius.chip,
    paddingHorizontal: small ? 8 : 12,
    paddingVertical: small ? 2 : 7,
    alignSelf: 'flex-start',
  };
  const text = (
    <Txt v="captionMedium" color={t.fg} numberOfLines={1} style={small ? { fontSize: 12, lineHeight: 16 } : undefined}>
      {label}
    </Txt>
  );
  if (!onPress) return <View style={[box, style]}>{text}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [box, { minHeight: 36, justifyContent: 'center', opacity: pressed ? 0.7 : 1 }, style]}
    >
      {text}
    </Pressable>
  );
}
