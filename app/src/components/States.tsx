// 불러오는 중 / 오류(다시 시도) / 비었음
import { ActivityIndicator, View } from 'react-native';
import { color as C, radius, space } from '../theme';
import { AgentOrb } from './AgentOrb';
import { Button } from './Button';
import { Txt } from './Txt';

export function Loading({ label = '불러오는 중이에요' }: { label?: string }) {
  return (
    <View style={{ paddingVertical: 40, alignItems: 'center', gap: 12 }} accessibilityRole="progressbar">
      <ActivityIndicator color={C.brand} />
      <Txt v="caption" color={C.sub}>
        {label}
      </Txt>
    </View>
  );
}

export function ErrorView({ message, onRetry, compact }: { message: string; onRetry?: () => void; compact?: boolean }) {
  return (
    <View
      style={{
        backgroundColor: C.card,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: C.line,
        padding: compact ? space.l : space.xxl,
        alignItems: compact ? 'flex-start' : 'center',
        gap: space.m,
      }}
      accessibilityRole="alert"
    >
      {!compact && <AgentOrb size={48} />}
      <Txt v={compact ? 'bodyMedium' : 'title'} style={{ textAlign: compact ? 'left' : 'center' }}>
        잠깐 연결이 끊겼어요
      </Txt>
      <Txt v="caption" color={C.sub} style={{ textAlign: compact ? 'left' : 'center' }}>
        {message}
      </Txt>
      {onRetry && <Button label="다시 시도" kind="outline" small onPress={onRetry} />}
    </View>
  );
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={{ paddingVertical: 36, paddingHorizontal: space.xxl, alignItems: 'center', gap: space.s }}>
      <Txt v="serifTitle" style={{ textAlign: 'center' }}>
        {title}
      </Txt>
      {body ? (
        <Txt v="caption" color={C.sub} style={{ textAlign: 'center' }}>
          {body}
        </Txt>
      ) : null}
      {action && <Button label={action.label} kind="outline" small onPress={action.onPress} style={{ marginTop: space.s }} />}
    </View>
  );
}
