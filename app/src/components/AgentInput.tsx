// 한 줄 입력 + 보내기 + 제안 칩 가로 스크롤
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { color as C, font, radius, space } from '../theme';
import { Chip } from './Chip';
import { Icon } from './Icon';

export function AgentInput({
  onSend,
  busy,
  suggestions,
  placeholder = '한 문장으로 말해 보세요',
}: {
  onSend: (text: string) => void;
  busy?: boolean;
  suggestions?: { label: string; message: string }[];
  placeholder?: string;
}) {
  const [text, setText] = useState('');
  const send = () => {
    const t = text.trim();
    if (!t || busy) return;
    onSend(t);
    setText('');
  };
  return (
    <View style={{ gap: space.s }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={send}
          placeholder={placeholder}
          placeholderTextColor={C.sub}
          returnKeyType="send"
          maxLength={300}
          accessibilityLabel="하르방에게 말하기"
          style={{
            flex: 1,
            height: 48,
            borderRadius: radius.card,
            backgroundColor: C.bg,
            borderWidth: 1,
            borderColor: C.line,
            paddingHorizontal: space.l,
            fontFamily: font.regular,
            fontSize: 15,
            color: C.ink,
          }}
        />
        <Pressable
          onPress={send}
          disabled={busy || !text.trim()}
          accessibilityRole="button"
          accessibilityLabel="보내기"
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: radius.card,
            backgroundColor: pressed ? C.brandDark : C.brand,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: busy || !text.trim() ? 0.45 : 1,
          })}
        >
          <Icon name="send" color={C.white} size={20} stroke={2.4} />
        </Pressable>
      </View>
      {suggestions?.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
          {suggestions.map((s) => (
            <Chip key={s.label} label={s.label} tone="brand" pill onPress={busy ? undefined : () => onSend(s.message)} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
