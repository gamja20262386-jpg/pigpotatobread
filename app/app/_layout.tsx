// 루트: 폰트 + 폰 프레임(웹) + 시트 자리 + 스택
import { NotoSansKR_400Regular } from '@expo-google-fonts/noto-sans-kr/400Regular';
import { NotoSansKR_500Medium } from '@expo-google-fonts/noto-sans-kr/500Medium';
import { NotoSansKR_700Bold } from '@expo-google-fonts/noto-sans-kr/700Bold';
import { NotoSerifKR_600SemiBold } from '@expo-google-fonts/noto-serif-kr/600SemiBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PhoneFrame } from '../src/components/PhoneFrame';
import { SheetHost } from '../src/components/Sheet';
import { color as C, font } from '../src/theme';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [loaded, error] = useFonts({
    [font.regular]: NotoSansKR_400Regular,
    [font.medium]: NotoSansKR_500Medium,
    [font.bold]: NotoSansKR_700Bold,
    [font.serif]: NotoSerifKR_600SemiBold,
  });
  // 한글 글꼴은 크다(웹에서 수 MB). 너무 늦으면 시스템 글꼴로 먼저 띄운다.
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 6000);
    return () => clearTimeout(t);
  }, []);
  const ready = loaded || !!error || waited;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  return (
    <SafeAreaProvider>
      <PhoneFrame>
        <StatusBar style="dark" />
        {ready ? (
          <>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="cart" options={{ presentation: 'modal' }} />
              <Stack.Screen name="product/[id]" options={{ presentation: 'modal' }} />
            </Stack>
            <SheetHost />
          </>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={C.brand} />
          </View>
        )}
      </PhoneFrame>
    </SafeAreaProvider>
  );
}
