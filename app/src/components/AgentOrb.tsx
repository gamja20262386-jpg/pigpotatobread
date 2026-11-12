// 하르방 오브: 주황 그라데이션 원 + 돌하르방 얼굴. 실행 중이면 1→1.12로 맥동(650ms).
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { color as C, orbGradient } from '../theme';

const native = Platform.OS !== 'web';

export function AgentOrb({ size = 56, busy = false, onPress, label = '하르방' }: { size?: number; busy?: boolean; onPress?: () => void; label?: string }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!busy) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
        Animated.timing(pulse, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [busy, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const halo = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.3] });
  const face = size * 0.56;

  const body = (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: C.brand, opacity: halo, transform: [{ scale }] }]} />
      <Animated.View style={{ transform: [{ scale: busy ? scale : 1 }] }}>
        <LinearGradient colors={orbGradient} start={{ x: 0.15, y: 0.1 }} end={{ x: 0.9, y: 1 }} style={{ width: size * 0.86, height: size * 0.86, borderRadius: size, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={face} height={face} viewBox="0 0 24 24" fill="none">
            <Path d="M6.5 10C6.5 6.6 9 4.5 12 4.5s5.5 2.1 5.5 5.5" stroke={C.white} strokeWidth={1.8} strokeLinecap="round" />
            <Path d="M5 10h14" stroke={C.white} strokeWidth={1.8} strokeLinecap="round" />
            <Circle cx={9.4} cy={13.6} r={1.4} fill={C.white} />
            <Circle cx={14.6} cy={13.6} r={1.4} fill={C.white} />
            <Path d="M9.8 17.6c1.3.9 3.1.9 4.4 0" stroke={C.white} strokeWidth={1.6} strokeLinecap="round" />
          </Svg>
        </LinearGradient>
      </Animated.View>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      {body}
    </Pressable>
  );
}
