import { Pressable, View } from 'react-native';
import { color as C, radius } from '../theme';
import { Icon } from './Icon';
import { Txt } from './Txt';

export function Stepper({ value, onChange, max, min = 0, dark }: { value: number; onChange: (n: number) => void; max?: number; min?: number; dark?: boolean }) {
  const btn = (name: 'minus' | 'plus', next: number, off: boolean) => (
    <Pressable
      onPress={() => onChange(next)}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={name === 'plus' ? '하나 더' : '하나 빼기'}
      hitSlop={4}
      style={({ pressed }) => ({ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', opacity: off ? 0.3 : pressed ? 0.6 : 1 })}
    >
      <Icon name={name} size={16} color={dark ? C.white : C.ink} />
    </Pressable>
  );
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: dark ? C.basalt : C.line,
        backgroundColor: dark ? C.basalt : C.card,
      }}
    >
      {btn('minus', value - 1, value <= min)}
      <Txt v="captionMedium" color={dark ? C.white : C.ink} style={{ minWidth: 22, textAlign: 'center', fontSize: 15 }}>
        {value}
      </Txt>
      {btn('plus', value + 1, max !== undefined && value >= max)}
    </View>
  );
}
