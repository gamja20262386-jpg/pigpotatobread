// 웹: 창이 500px보다 넓으면 393×852(iPhone 14 Pro) 폰 프레임 안에, 좁으면 전체 화면으로 띄운다.
import type { ReactNode } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { color as C } from '../theme';
import { Txt } from './Txt';

const W = 393;
const H = 852;
const BEZEL = 10;
const FRAME_INSETS = { top: 54, bottom: 30, left: 0, right: 0 };

export function PhoneFrame({ children }: { children: ReactNode }) {
  const win = useWindowDimensions();
  if (Platform.OS !== 'web' || win.width <= 500) return <View style={{ flex: 1, backgroundColor: C.bg }}>{children}</View>;
  const scale = Math.min(1, (win.height - 32) / (H + BEZEL * 2), (win.width - 32) / (W + BEZEL * 2));
  return (
    <View style={{ flex: 1, backgroundColor: C.frameBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <View
        style={{
          width: W + BEZEL * 2,
          height: H + BEZEL * 2,
          borderRadius: 58,
          backgroundColor: C.basalt,
          padding: BEZEL,
          transform: [{ scale }],
          boxShadow: '0 30px 80px rgba(35,33,30,0.28)',
        }}
      >
        <View style={{ width: W, height: H, borderRadius: 48, overflow: 'hidden', backgroundColor: C.bg }}>
          <SafeAreaInsetsContext.Provider value={FRAME_INSETS}>{children}</SafeAreaInsetsContext.Provider>
          <StatusBarMock />
          <View pointerEvents="none" style={{ position: 'absolute', bottom: 8, left: (W - 134) / 2, width: 134, height: 5, borderRadius: 3, backgroundColor: C.ink }} />
        </View>
      </View>
    </View>
  );
}

function StatusBarMock() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 34 }}>
      <Txt v="captionMedium" style={{ fontSize: 15, flex: 1 }}>
        9:41
      </Txt>
      <View style={{ position: 'absolute', top: 11, left: (W - 124) / 2, width: 124, height: 36, borderRadius: 18, backgroundColor: C.black }} />
      <View style={{ flexDirection: 'row', gap: 4, alignItems: 'flex-end' }}>
        {[5, 7, 9, 11].map((h) => (
          <View key={h} style={{ width: 3, height: h, borderRadius: 1, backgroundColor: C.ink }} />
        ))}
        <View style={{ marginLeft: 6, width: 24, height: 11, borderRadius: 3, borderWidth: 1, borderColor: C.ink, padding: 1 }}>
          <View style={{ flex: 1, width: '78%', borderRadius: 1.5, backgroundColor: C.ink }} />
        </View>
      </View>
    </View>
  );
}
