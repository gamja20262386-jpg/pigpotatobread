// 로그인·배송지·시연 시각·닫은 nudge·홈 서비스 탭·찜·최근 검색어. 기기에 남긴다(AsyncStorage). 정렬은 앱을 켜 둔 동안만.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { StoreSort, User } from '../types';

export type Service = 'delivery' | 'market' | 'pickup';

type Session = {
  token: string | null;
  user: User | null;
  destinationId: string | null; // 고른 배송지(없으면 서버 기본값)
  demoTime: string | null; // "HH:MM" → X-Demo-Time 헤더
  dismissed: string[]; // 닫은 nudge id
  service: Service; // 홈 서비스 탭(마지막 선택)
  sort: StoreSort; // 카테고리 목록 정렬(저장 안 함)
  favorites: string[]; // 찜한 가게 id
  recent: string[]; // 최근 검색어(최신 먼저)
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
  setDestination: (id: string) => void;
  setDemoTime: (t: string | null) => void;
  dismiss: (id: string) => void;
  setService: (s: Service) => void;
  setSort: (s: StoreSort) => void;
  toggleFavorite: (storeId: string) => void;
  addRecent: (q: string) => void;
  clearRecent: () => void;
};

export const useSession = create<Session>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      destinationId: null,
      demoTime: null,
      dismissed: [],
      service: 'delivery',
      sort: 'default',
      favorites: [],
      recent: [],
      setAuth: (token, user) =>
        // 이미 고른 배송지(예: 하르방 제안의 배송지)가 있으면 로그인해도 그대로 둔다
        set((s) => ({ token, user, destinationId: s.destinationId ?? user.prefs?.destination_id ?? null })),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
      setDestination: (destinationId) => set({ destinationId }),
      setDemoTime: (demoTime) => set({ demoTime }),
      dismiss: (id) => set((s) => ({ dismissed: s.dismissed.includes(id) ? s.dismissed : [...s.dismissed, id] })),
      setService: (service) => set({ service }),
      setSort: (sort) => set({ sort }),
      toggleFavorite: (id) => set((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((x) => x !== id) : [id, ...s.favorites] })),
      addRecent: (q) => set((s) => ({ recent: [q, ...s.recent.filter((x) => x !== q)].slice(0, 8) })),
      clearRecent: () => set({ recent: [] }),
    }),
    {
      name: 'jejueat:session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ token, user, destinationId, demoTime, dismissed, service, favorites, recent }) => ({ token, user, destinationId, demoTime, dismissed, service, favorites, recent }),
    },
  ),
);
