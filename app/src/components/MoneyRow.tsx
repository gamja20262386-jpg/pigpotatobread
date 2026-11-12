import { View } from 'react-native';
import { color as C, won } from '../theme';
import { Txt } from './Txt';

export function MoneyRow({ label, value, strong, dark, note }: { label: string; value: number; strong?: boolean; dark?: boolean; note?: string }) {
  const fg = dark ? C.white : C.ink;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
      <Txt v={strong ? 'bodyMedium' : 'caption'} color={strong ? fg : dark ? C.basaltSub : C.sub} style={{ flexShrink: 1 }}>
        {label}
        {note ? <Txt v="caption" color={dark ? C.basaltSub : C.sub}>{`  ${note}`}</Txt> : null}
      </Txt>
      <Txt v={strong ? 'title' : 'captionMedium'} color={strong ? (dark ? C.white : C.brand) : fg} style={strong ? undefined : { fontSize: 14 }}>
        {won(value)}
      </Txt>
    </View>
  );
}
