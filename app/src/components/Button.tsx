import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { color as C, font, radius, size } from '../theme';
import { Txt } from './Txt';

type Kind = 'primary' | 'outline' | 'dark' | 'ghost';

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  busy,
  small,
  style,
}: {
  label: string;
  onPress?: () => void;
  kind?: Kind;
  disabled?: boolean;
  busy?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const off = disabled || busy;
  const bg = kind === 'primary' ? C.brand : kind === 'dark' ? C.basalt : kind === 'outline' ? C.card : 'transparent';
  const fg = kind === 'primary' || kind === 'dark' ? C.white : kind === 'ghost' ? C.brandDark : C.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      style={({ pressed }) => [
        {
          height: small ? size.touch : size.button,
          paddingHorizontal: small ? 14 : 20,
          borderRadius: radius.card,
          backgroundColor: kind === 'primary' && pressed ? C.brandDark : bg,
          borderWidth: kind === 'outline' ? 1 : 0,
          borderColor: C.line,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          opacity: off ? 0.5 : pressed && kind !== 'primary' ? 0.75 : 1,
        },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={fg} size="small" /> : null}
      <Txt v={small ? 'captionMedium' : 'bodyMedium'} color={fg} style={small ? { fontSize: 14 } : { fontFamily: font.bold }} numberOfLines={1}>
        {label}
      </Txt>
    </Pressable>
  );
}
