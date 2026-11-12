// docs/ARCHITECTURE.md §2 공통 타입
export type EvidenceKind = 'dataset' | 'calc' | 'input' | 'assumption' | 'llm';
export type Evidence = { kind: EvidenceKind; ref: string; label?: string };
export type Claim = {
  agent_id: string;
  text: string;
  level: 'fact' | 'estimate' | 'assumption' | 'question';
  evidence: Evidence[];
  blocked: boolean;
  block_reasons: string[];
};
export type AgentResult = {
  agent_id: string;
  ok: boolean;
  claims: Claim[];
  data: Record<string, unknown>;
  used_llm: boolean;
  error: string | null;
};
export type RunEvent = {
  seq: number;
  type: 'plan' | 'agent_start' | 'agent_done' | 'gate' | 'llm' | 'summary' | 'done' | 'error';
  payload: Record<string, unknown>;
};
export type LlmInfo = { provider: string; model: string; available: boolean };
export type RunResult = {
  run_id: string;
  flow: string;
  plan: string[];
  results: AgentResult[];
  public_claims: Claim[];
  blocked_count: number;
  summary: string;
  summary_source: 'llm' | 'template';
  llm: LlmInfo;
  events: RunEvent[];
};

export type Temp = 'cold' | 'hot' | 'room';
export type Store = {
  id: string;
  name: string;
  kind: 'restaurant' | 'market';
  category: string;
  label: string;
  icon: string;
  story: string;
  open: string;
  close: string;
  prep_min: number;
  lat: number;
  lng: number;
  rating: number;
  delivery_fee: number;
  is_open: boolean;
  closes_in_min: number | null;
  min_order: number;
  pickup: boolean;
  image: string | null;
  // 배송지 기준(목록·상세 응답에만 붙는다)
  eta_min?: number;
  distance_km?: number;
  delivery_tip?: number;
  in_zone?: boolean;
};
export type StoreSort = 'default' | 'fast' | 'rating' | 'fee';
export type MenuGroup = '대표 메뉴' | '메뉴' | '사이드·음료';
export type Product = {
  id: string;
  store_id: string;
  store_name: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  temp: Temp;
  stock: number;
  sold_out: boolean;
  serves: number;
  tags: string[];
  group: MenuGroup;
  popular: boolean;
  image: string | null;
};
export type Category = { id: string; name: string; emoji: string };
export type CartItem = { product_id: string; qty: number };
export type Destination = { id: string; name: string; aliases?: string[]; lat?: number; lng?: number };

export type QuoteLine = {
  product_id: string;
  name: string;
  store_id: string;
  store_name: string;
  price: number;
  qty: number;
  line_total: number;
  temp: Temp;
  sold_out: boolean;
};
export type Quote = {
  lines: QuoteLine[];
  groups: { store_id: string; store_name: string; kind: 'restaurant' | 'market'; subtotal: number; prep_min: number }[];
  bags: { temp: Temp; label: string; items: string[] }[];
  fees: { market: number; restaurants: number; total: number };
  subtotal: number;
  total: number;
  eta_min: number;
  distance_km: number;
  in_zone: boolean;
  destination: { id: string; name: string };
  warnings: string[];
};
export type Proposal = { items: CartItem[]; quote: Quote };
export type NudgeAction = { type: 'ask'; prompt: string } | { type: 'open'; route: string } | null;
export type Nudge = { id: string; kind: string; title: string; body: string; action: NudgeAction };

export type OrderStatus = 'received' | 'preparing' | 'hub_packed' | 'delivering' | 'delivered';
export type Order = {
  id: string;
  created_at: string;
  status: OrderStatus;
  status_label: string;
  destination: { id: string; name: string };
  quote: Quote;
  agent_run_id: string | null;
  history: { status: OrderStatus; status_label: string; at: string }[];
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'merchant';
  store_id: string | null;
  prefs: { destination_id: string | null; likes: string[] };
};

export type Market = {
  name: string;
  hub: { id: string; name: string; lat: number; lng: number };
  hours: { open: string; close: string; night_market?: string };
  destinations: Destination[];
  default_destination: string;
  // 계약에는 없지만 서버가 묶음 배송비 가정값을 같이 주면 그대로 보여 준다
  bundle_fee?: { base: number; per_extra_stall: number; max: number };
};

export type HarnessAgent = { id: string; team: string; no: number; name: string; card?: string; llm: boolean };
export type Harness = {
  name: string;
  persona: { name: string; tagline?: string };
  teams: { id: string; name: string; agents: string[] }[];
  agents: HarnessAgent[];
  flows: Record<string, string[]>;
  cards: Record<string, string>;
};

export type StockChange = {
  product_id: string;
  name: string;
  before: { price: number; stock: number };
  after: { price?: number; stock?: number };
};
export type MerchantOrder = {
  id: string;
  status_label: string;
  created_at: string;
  lines: { product_id?: string; name: string; qty: number; line_total?: number }[];
};
