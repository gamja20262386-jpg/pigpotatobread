// 로그인·배송지·시연 시각·닫은 nudge. 기기에 남긴다(AsyncStorage).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { User } from '../types';

type Session = {
  token: string | null;
  user: User | null;
  destinationId: string | null; // 고른 배송지(없으면 서버 기본값)
  demoTime: string | null; // "HH:MM" → X-Demo-Time 헤더
  dismissed: string[]; // 닫은 nudge id
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
  setDestination: (id: string) => void;
  setDemoTime: (t: string | null) => void;
  dismiss: (id: string) => void;
};

export const useSession = create<Session>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      destinationId: null,
      demoTime: null,
      dismissed: [],
      setAuth: (token, user) =>
        // 이미 고른 배송지(예: 하르방 제안의 배송지)가 있으면 로그인해도 그대로 둔다
        set((s) => ({ token, user, destinationId: s.destinationId ?? user.prefs?.destination_id ?? null })),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
      setDestination: (destinationId) => set({ destinationId }),
      setDemoTime: (demoTime) => set({ demoTime }),
      dismiss: (id) => set((s) => ({ dismissed: s.dismissed.includes(id) ? s.dismissed : [...s.dismissed, id] })),
    }),
    {
      name: 'jejueat:session',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ token, user, destinationId, demoTime, dismissed }) => ({ token, user, destinationId, demoTime, dismissed }),
    },
  ),
);
