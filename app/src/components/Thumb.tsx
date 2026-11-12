// 사진 칸(docs/DESIGN.md v0.2 I): image가 있으면 사진(cover), 없거나 못 불러오면 같은 크기·반경의 카테고리 틴트 + 큰 이모지.
import { useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { color as C, radius } from '../theme';
import { Txt } from './Txt';

const CATEGORY_TINT: Record<string, string> = {
  japanese: C.seaSoft,
  pork: C.brandSoft,
  soup: C.warnSoft,
  chicken: C.warnSoft,
  cafe: C.leafSoft,
  snack: C.brandSoft,
  western: C.dangerSoft,
  chinese: C.dangerSoft,
  seafood: C.seaSoft,
  grocery: C.leafSoft,
  market: C.brandSoft,
};
export const categoryTint = (category?: string) => (category && CATEGORY_TINT[category]) || C.brandSoft;

export function Thumb({
  image,
  emoji,
  category,
  emojiSize = 36,
  style,
}: {
  image?: string | null;
  emoji: string;
  category?: string;
  emojiSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [failed, setFailed] = useState(false);
  const photo = !!image && !failed;
  return (
    <View style={[{ borderRadius: radius.card, overflow: 'hidden', backgroundColor: categoryTint(category), alignItems: 'center', justifyContent: 'center' }, style]}>
      {photo ? (
        <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
      ) : (
        <Txt style={{ fontSize: emojiSize, lineHeight: Math.round(emojiSize * 1.25) }}>{emoji}</Txt>
      )}
    </View>
  );
}
