// 상품 행: 이모지 타일 64, 이름, 설명, 온도 배지, 재고 5개 이하 "N개 남음", 품절 흐리게, 가격, 담기/수량
import { View } from 'react-native';
import type { Product } from '../types';
import { color as C, radius, space, won } from '../theme';
import { Button } from './Button';
import { Chip } from './Chip';
import { Stepper } from './Stepper';
import { TempBadge } from './TempBadge';
import { Txt } from './Txt';

export function ProductRow({ product: p, qty, onQty, disabled }: { product: Product; qty: number; onQty: (n: number) => void; disabled?: boolean }) {
  const out = p.sold_out || p.stock <= 0;
  return (
    <View style={{ flexDirection: 'row', gap: space.m, paddingVertical: space.m, borderBottomWidth: 1, borderBottomColor: C.line, opacity: out ? 0.5 : 1 }}>
      <View style={{ width: 64, height: 64, borderRadius: radius.card, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' }}>
        <Txt style={{ fontSize: 30, lineHeight: 38 }}>{p.emoji}</Txt>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Txt v="bodyMedium" numberOfLines={2}>
          {p.name}
        </Txt>
        <Txt v="caption" color={C.sub} numberOfLines={2}>
          {p.description}
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          <TempBadge temp={p.temp} />
          {out ? <Chip small label="품절" tone="danger" /> : p.stock <= 5 ? <Chip small label={`${p.stock}개 남음`} tone="warn" /> : null}
          {p.serves > 1 ? <Chip small label={`${p.serves}인분`} /> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          <Txt v="bodyMedium" color={C.brand}>
            {won(p.price)}
          </Txt>
          {out ? null : qty > 0 ? (
            <Stepper value={qty} onChange={onQty} max={p.stock} />
          ) : (
            <Button label="담기" small kind="outline" onPress={() => onQty(1)} disabled={disabled} />
          )}
        </View>
      </View>
    </View>
  );
}
