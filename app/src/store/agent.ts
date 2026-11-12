// 하르방 대화. 주문 문장은 plan_order(/agent/plan), 질문은 assistant_chat(/agent/chat)로 보낸다.
import { create } from 'zustand';
import { api, errorText } from '../api';
import { useSession } from './session';
import type { Proposal, RunResult } from '../types';

export type Turn = {
  id: string;
  message: string;
  kind: 'plan' | 'chat';
  status: 'pending' | 'done' | 'error';
  run?: RunResult;
  proposal?: Proposal | null;
  suggestPlan?: boolean;
  error?: string;
  accepted?: boolean;
};

type Agent = {
  turns: Turn[];
  busy: boolean;
  send: (message: string, kind?: 'plan' | 'chat') => Promise<void>;
  markAccepted: (id: string) => void;
  reset: () => void;
};

// crypto.randomUUID는 http://<LAN-IP> 같은 비보안 주소에서 없다 → Math.random으로 만든다.
export const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// 주문처럼 들리는 문장인지(인원·예산·식사·담기·먹거리 낱말). 아니면 대화 도우미에게 묻는다.
const PLAN_HINT =
  /(\d+\s*(명|인분|인|만\s*원|천\s*원|원))|저녁|점심|아침|야식|간식|안주|담아|시켜|주문해|사다|보내|숙소로|으로\s*배달|흑돼지|회\b|회랑|해산물|오메기|떡|귤|한라봉|막걸리|갈치|고등어|꼬치|김밥|국수|분식|디저트|음료|기념품|선물/;

export const looksLikeOrder = (message: string) => PLAN_HINT.test(message) && !/[?？]$|몇\s*시|언제|어디|얼마예요|됐어\?|상태/.test(message.trim());

export const useAgent = create<Agent>()((set, get) => ({
  turns: [],
  busy: false,
  send: async (raw, forced) => {
    const message = raw.trim().slice(0, 300);
    if (!message || get().busy) return;
    const kind = forced ?? (looksLikeOrder(message) ? 'plan' : 'chat');
    const id = makeId();
    set((s) => ({ busy: true, turns: [...s.turns, { id, message, kind, status: 'pending' }] }));
    const patch = (p: Partial<Turn>) => set((s) => ({ turns: s.turns.map((t) => (t.id === id ? { ...t, ...p } : t)) }));
    try {
      if (kind === 'plan') {
        const { run, proposal } = await api.plan(message, useSession.getState().destinationId);
        patch({ status: 'done', run, proposal });
      } else {
        const { run, suggest_plan } = await api.chat(message);
        patch({ status: 'done', run, suggestPlan: suggest_plan });
      }
    } catch (e) {
      patch({ status: 'error', error: errorText(e) });
    } finally {
      set({ busy: false });
    }
  },
  markAccepted: (id) => set((s) => ({ turns: s.turns.map((t) => (t.id === id ? { ...t, accepted: true } : t)) })),
  reset: () => set({ turns: [] }),
}));

export const lastTurn = (turns: Turn[]) => turns[turns.length - 1];
