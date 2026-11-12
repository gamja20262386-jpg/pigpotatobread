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
