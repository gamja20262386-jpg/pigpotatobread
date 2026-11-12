import { Tabs } from 'expo-router/js-tabs';
import { NavPill } from '../../src/components/NavPill';
import { color as C } from '../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <NavPill {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg } }}>
      <Tabs.Screen name="index" options={{ title: '홈' }} />
      <Tabs.Screen name="market" options={{ title: '시장' }} />
      <Tabs.Screen name="agent" options={{ title: '하르방' }} />
      <Tabs.Screen name="orders" options={{ title: '주문' }} />
      <Tabs.Screen name="my" options={{ title: '마이' }} />
    </Tabs>
  );
}
