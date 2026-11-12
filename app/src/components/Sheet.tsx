// 아래에서 올라오는 시트. 웹 폰 프레임 밖으로 나가지 않게 RN Modal 대신 루트의 SheetHost에 그린다.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { color as C, floatShadow, radius, space } from '../theme';
import { Icon } from './Icon';
import { Txt } from './Txt';

const usePortal = create<{ nodes: Record<string, ReactNode>; put: (k: string, n: ReactNode) => void; drop: (k: string) => void }>()((set) => ({
  nodes: {},
  put: (k, n) => set((s) => ({ nodes: { ...s.nodes, [k]: n } })),
  drop: (k) =>
    set((s) => {
      if (!(k in s.nodes)) return s;
      const { [k]: _gone, ...rest } = s.nodes;
      return { nodes: rest };
    }),
}));

export function SheetHost() {
  const nodes = usePortal((s) => s.nodes);
  return (
    <>
      {Object.entries(nodes).map(([k, n]) => (
        <View key={k} style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {n}
        </View>
      ))}
    </>
  );
}

let counter = 0;

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const [key] = useState(() => `sheet-${++counter}`);
  const put = usePortal((s) => s.put);
  const drop = usePortal((s) => s.drop);
  useEffect(() => {
    if (visible) put(key, <SheetView title={title} onClose={onClose}>{children}</SheetView>);
    else drop(key);
  });
  useEffect(() => () => drop(key), [drop, key]);
  return null;
}

function SheetView({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(y, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
  }, [y]);
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.scrim, opacity: y.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="닫기" />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: '86%',
            backgroundColor: C.card,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            paddingBottom: insets.bottom + space.l,
            transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, 500] }) }],
          },
          floatShadow,
        ]}
      >
        <View style={{ alignItems: 'center', paddingTop: 8 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: C.line }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.screen, paddingTop: space.m, paddingBottom: space.s }}>
          <Txt v="serifTitle" style={{ flex: 1 }}>
            {title}
          </Txt>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="닫기" hitSlop={8} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={20} color={C.sub} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: space.s, gap: space.m }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  );
}
