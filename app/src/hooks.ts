// 여러 화면이 같이 쓰는 서버 값
import { api } from './api';
import { useSession } from './store/session';
import { cached, useResource } from './useResource';

export const useHarness = () => useResource('harness', () => cached('harness', api.harness));
export const useHealth = () => useResource('health', () => cached('health', api.health));
export const useMarket = () => useResource('market', () => cached('market', api.market).then((r) => r.market));

// 지금 배송지: 고른 것 → 서버 기본값 순
export function useDestination() {
  const destinationId = useSession((s) => s.destinationId);
  const market = useMarket();
  const list = market.data?.destinations ?? [];
  const id = destinationId ?? market.data?.default_destination ?? null;
  const current = list.find((d) => d.id === id) ?? null;
  return { id, current, list, market };
}

// "ax4-light:q4_K_M" → "ax4-light"
export const shortModel = (model: string) => model.split(':')[0];

// 전체 메뉴(이름·대표 메뉴용, 한 번만 부른다). 재고처럼 바뀌는 값이 필요하면 api.products()를 직접 부른다.
export const useProductIndex = () => useResource('products', () => cached('products', api.products).then((r) => r.products));

// 가게 카드에 보일 대표 메뉴 이름 2개
export function useMenuNames(storeId: string) {
  const all = useProductIndex().data ?? [];
  const mine = all.filter((p) => p.store_id === storeId);
  return [...mine.filter((p) => p.popular), ...mine.filter((p) => !p.popular)].slice(0, 2).map((p) => p.name);
}
