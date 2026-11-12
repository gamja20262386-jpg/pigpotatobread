// 하단 탭 바(docs/DESIGN.md v0.2 A): 화면 폭 전체 흰 바, 5칸 같은 폭, 아이콘 + 글자 항상 표시.
// 활성은 색만 바뀌고 크기·위치는 그대로. 가운데 하르방 오브만 위로 떠 있다.
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAgent } from '../store/agent';
import { color as C, font, radius } from '../theme';
import { AgentOrb } from './AgentOrb';
import { Icon, type IconName } from './Icon';
import { Txt } from './Txt';

export const TAB_BAR_HEIGHT = 56;

const TABS: Record<string, { label: string; icon?: IconName }> = {
  index: { label: '홈', icon: 'home' },
  market: { label: '시장', icon: 'market' },
  agent: { label: '하르방' },
  orders: { label: '주문내역', icon: 'receipt' },
  my: { label: '마이', icon: 'user' },
};

export function NavPill({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const busy = useAgent((s) => s.busy);
  const go = (key: string, focused: boolean) => {
    const e = emitter.emit({ type: 'tabPress', target: key, canPreventDefault: true });
    if (!focused && !e.defaultPrevented) navigateToTab(key);
  };
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', height: TAB_BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.line }}
    >
      {state.routes.map((route, i) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === i;
        const tint = focused ? C.brand : C.sub;
        return (
          <Pressable
            key={route.key}
            onPress={() => go(route.key, focused)}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={tab.icon ? tab.label : '하르방에게 말하기'}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6, gap: 2 }}
          >
            {tab.icon ? (
              <Icon name={tab.icon} size={24} color={tint} />
            ) : (
              <View style={{ marginTop: -24, borderRadius: radius.pill, borderWidth: 4, borderColor: C.card, backgroundColor: C.card }}>
                <AgentOrb size={48} busy={busy} />
              </View>
            )}
            <Txt v="caption" color={tint} numberOfLines={1} style={{ fontSize: 11, lineHeight: 14, fontFamily: focused ? font.bold : font.medium }}>
              {tab.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
