// NavPill (JARI): basalt 알약, 활성 탭만 글자, 가운데 하르방 오브가 떠 있음
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAgent } from '../store/agent';
import { color as C, floatShadow, radius } from '../theme';
import { AgentOrb } from './AgentOrb';
import { Icon, type IconName } from './Icon';
import { Txt } from './Txt';

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: '홈', icon: 'home' },
  market: { label: '시장', icon: 'market' },
  orders: { label: '주문', icon: 'receipt' },
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
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 12) + 4, alignItems: 'center' }}>
      <View
        style={[
          { flexDirection: 'row', alignItems: 'center', backgroundColor: C.basalt, borderRadius: radius.pill, paddingHorizontal: 8, height: 64, gap: 2 },
          floatShadow,
        ]}
      >
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          if (route.name === 'agent') {
            return (
              <View key={route.key} style={{ marginHorizontal: 6, marginTop: -26 }}>
                <View style={{ borderRadius: radius.pill, borderWidth: 4, borderColor: C.bg, backgroundColor: C.bg }}>
                  <AgentOrb size={62} busy={busy} onPress={() => go(route.key, focused)} label="하르방에게 말하기" />
                </View>
              </View>
            );
          }
          const tab = TABS[route.name];
          if (!tab) return null;
          return (
            <Pressable
              key={route.key}
              onPress={() => go(route.key, focused)}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                height: 48,
                minWidth: 48,
                paddingHorizontal: focused ? 14 : 12,
                borderRadius: radius.pill,
                backgroundColor: focused ? C.basaltActive : 'transparent',
                gap: 6,
                justifyContent: 'center',
              }}
            >
              <Icon name={tab.icon} size={22} color={focused ? C.white : C.basaltSub} />
              {focused ? (
                <Txt v="captionMedium" color={C.white} style={{ fontSize: 14 }}>
                  {tab.label}
                </Txt>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
