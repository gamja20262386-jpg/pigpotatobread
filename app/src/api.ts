// 백엔드 /v1 클라이언트 (docs/ARCHITECTURE.md §3). 오류는 한국어 문장으로 바꿔 던진다.
import { useSession } from './store/session';
import type {
  CartItem,
  Category,
  Harness,
  LlmInfo,
  Market,
  MerchantOrder,
  Nudge,
  Order,
  Product,
  Proposal,
  Quote,
  RunResult,
  StockChange,
  Store,
  StoreSort,
  User,
} from './types';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8040/v1';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  400: '입력한 내용을 다시 확인해 주세요.',
  401: '로그인이 필요해요.',
  403: '이 작업을 할 권한이 없어요.',
  404: '찾는 항목이 없어요.',
  409: '그사이 상태가 바뀌었어요. 다시 확인해 주세요.',
  422: '입력한 내용을 다시 확인해 주세요.',
  429: '요청이 많아요. 잠시 후 다시 시도해 주세요.',
};

const TIMEOUT_MS = 30000;
// 하르방 에이전트 요청은 로컬 LLM이 여러 번 불릴 수 있어 더 기다린다(서버는 run당 LLM 시간 예산 30초 + 계산).
const AGENT_TIMEOUT_MS = 75000;

async function request<T>(path: string, method = 'GET', body?: unknown, timeoutMs = TIMEOUT_MS): Promise<T> {
  const { token, demoTime } = useSession.getState();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (demoTime) headers['X-Demo-Time'] = demoTime;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    const aborted = (e as Error)?.name === 'AbortError';
    throw new ApiError(0, aborted ? '하르방 답이 너무 늦어요. 잠시 후 다시 시도해 주세요.' : '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let detail: unknown = null;
    try {
      detail = ((await res.json()) as { detail?: unknown }).detail;
    } catch {
      detail = null;
    }
    if (res.status === 401 && token) useSession.getState().logout();
    const message =
      typeof detail === 'string' && detail.trim()
        ? detail
        : STATUS_MESSAGES[res.status] ?? (res.status >= 500 ? '서버에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.' : '요청을 처리하지 못했어요.');
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const errorText = (e: unknown) => (e instanceof Error ? e.message : '알 수 없는 문제가 생겼어요.');

export const api = {
  health: () => request<{ status: string; llm: LlmInfo }>('/health'),

  demoLogin: (role: 'customer' | 'merchant') => request<{ token: string; user: User }>('/auth/demo', 'POST', { role }),
  me: () => request<{ user: User }>('/me'),
  setPrefs: (prefs: { destination_id?: string; likes?: string[] }) => request<{ user: User }>('/me/prefs', 'PATCH', prefs),

  categories: () => request<{ categories: Category[] }>('/catalog/categories'),
  stores: (q: { kind?: string; category?: string; sort?: StoreSort; open_only?: boolean; destination_id?: string | null } = {}) => {
    const qs = new URLSearchParams(Object.entries(q).filter(([, v]) => !!v).map(([k, v]) => [k, String(v)])).toString();
    return request<{ stores: Store[]; destination: { id: string; name: string } }>(`/catalog/stores${qs ? `?${qs}` : ''}`);
  },
  store: (id: string, destination_id?: string | null) =>
    request<{ store: Store; products: Product[] }>(`/catalog/stores/${encodeURIComponent(id)}${destination_id ? `?destination_id=${encodeURIComponent(destination_id)}` : ''}`),
  product: (id: string) => request<{ product: Product; store: Store }>(`/catalog/products/${encodeURIComponent(id)}`),
  products: () => request<{ products: Product[] }>('/catalog/products'),
  market: () => request<{ market: Market }>('/market'),

  quote: (items: CartItem[], destination_id?: string | null) =>
    request<{ quote: Quote; run: RunResult }>('/cart/quote', 'POST', { items, destination_id: destination_id ?? undefined }),
  plan: (message: string, destination_id?: string | null) =>
    request<{ run: RunResult; proposal: Proposal | null }>('/agent/plan', 'POST', { message, destination_id: destination_id ?? undefined }, AGENT_TIMEOUT_MS),
  chat: (message: string) => request<{ run: RunResult; suggest_plan: boolean }>('/agent/chat', 'POST', { message }, AGENT_TIMEOUT_MS),
  nudges: (cart: CartItem[], destination_id: string | null, dismissed: string[]) =>
    request<{ nudges: Nudge[]; run_id: string }>('/agent/nudges', 'POST', { cart, destination_id: destination_id ?? undefined, dismissed }),
  harness: () => request<Harness>('/harness'),

  createOrder: (items: CartItem[], destination_id: string, agent_run_id?: string | null) =>
    request<{ order: Order }>('/orders', 'POST', { items, destination_id, agent_run_id: agent_run_id ?? undefined }),
  orders: () => request<{ orders: Order[] }>('/orders'),
  order: (id: string) => request<{ order: Order }>(`/orders/${encodeURIComponent(id)}`),
  advance: (id: string) => request<{ order: Order }>(`/orders/${encodeURIComponent(id)}/advance`, 'POST'),

  merchantStore: () => request<{ store: Store; products: Product[]; orders: MerchantOrder[] }>('/merchant/store'),
  patchProduct: (id: string, patch: { price?: number; stock?: number; expected_stock?: number }) =>
    request<{ product: Product }>(`/merchant/products/${encodeURIComponent(id)}`, 'PATCH', patch),
  intake: (message: string) => request<{ run: RunResult; changes: StockChange[] }>('/merchant/intake', 'POST', { message }, AGENT_TIMEOUT_MS),
};
