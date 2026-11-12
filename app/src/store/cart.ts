// 장바구니. 서버에는 {product_id, qty}만 보내고, 화면용 정보(이름·가격·가게)는 같이 들고 있는다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CartItem, Temp } from '../types';

export type CartLine = CartItem & {
  name: string;
  price: number;
  store_id: string;
  store_name: string;
  emoji?: string;
  temp?: Temp;
};

type Cart = {
  lines: CartLine[];
  runId: string | null; // 하르방 제안으로 담았으면 그 run id(주문에 같이 보냄)
  add: (line: Omit<CartLine, 'qty'>, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  replace: (lines: CartLine[], runId?: string | null) => void;
  clear: () => void;
};

export const useCart = create<Cart>()(
  persist(
    (set) => ({
      lines: [],
      runId: null,
      add: (line, qty = 1) =>
        set((s) => {
          const found = s.lines.find((l) => l.product_id === line.product_id);
          if (found) return { lines: s.lines.map((l) => (l === found ? { ...l, qty: l.qty + qty } : l)) };
          return { lines: [...s.lines, { ...line, qty }] };
        }),
      setQty: (productId, qty) =>
        set((s) => ({
          lines: qty <= 0 ? s.lines.filter((l) => l.product_id !== productId) : s.lines.map((l) => (l.product_id === productId ? { ...l, qty } : l)),
        })),
      replace: (lines, runId = null) => set({ lines: lines.filter((l) => l.qty > 0), runId }),
      clear: () => set({ lines: [], runId: null }),
    }),
    { name: 'jejueat:cart', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const cartItems = (lines: CartLine[]): CartItem[] => lines.map(({ product_id, qty }) => ({ product_id, qty }));
export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0);
