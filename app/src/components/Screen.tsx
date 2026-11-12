// 화면 틀: 안전 영역 + 미색 바탕 + 세로 스크롤. tab=true면 NavPill 높이만큼 아래 여백.
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color as C, radius, space } from '../theme';
import { Icon } from './Icon';
import { Txt } from './Txt';

export const NAV_SPACE = 112;

export function Screen({
  children,
  tab,
  footer,
  header,
  onRefresh,
}: {
  children: ReactNode;
  tab?: boolean;
  footer?: ReactNode;
  header?: ReactNode;
  onRefresh?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      {header}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: space.screen, paddingTop: space.m, paddingBottom: (tab ? NAV_SPACE : space.xxl) + (footer ? 0 : insets.bottom), gap: space.xl }}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={C.brand} /> : undefined}
      >
        {children}
      </ScrollView>
      {footer ? <View style={{ paddingHorizontal: space.screen, paddingTop: space.m, paddingBottom: insets.bottom + space.m, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.line }}>{footer}</View> : null}
    </View>
  );
}

export function StackHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.s, height: 52, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.bg }}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        accessibilityRole="button"
        accessibilityLabel="뒤로"
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="back" />
      </Pressable>
      <Txt v="bodyMedium" numberOfLines={1} style={{ flex: 1, fontSize: 17 }}>
        {title}
      </Txt>
      <View style={{ minWidth: 44, alignItems: 'flex-end', paddingRight: space.s }}>{right}</View>
    </View>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: -space.s }}>
      <Txt v="title">{title}</Txt>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={10}>
          <Txt v="captionMedium" color={C.brandDark}>
            {action}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Card({ children, style, dark }: { children: ReactNode; style?: object; dark?: boolean }) {
  return (
    <View
      style={[
        { backgroundColor: dark ? C.basalt : C.card, borderRadius: radius.card, borderWidth: 1, borderColor: dark ? C.basalt : C.line, padding: space.l, gap: space.m },
        style,
      ]}
    >
      {children}
    </View>
  );
}
