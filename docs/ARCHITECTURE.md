# 제주잇 아키텍처 계약 (v0.1)

백엔드(`backend/`)와 앱(`app/`)이 함께 지키는 계약이다. 이 문서와 코드가 다르면 이 문서를 고치고 양쪽을 맞춘다.

## 0. 원칙 (대승보 하네스 방식)
- **코드가 숫자·사실을 만들고 LLM은 말만 다듬는다.** 가격·재고·배달비·시간은 전부 코드 계산.
- 에이전트 결과는 **주장(claim) + 근거(evidence)**. 게이트를 통과한 주장만 화면에 나간다.
- LLM이 꺼져 있거나 실패해도 **규칙·템플릿으로 끝까지 동작**한다(run_flow는 예외를 내지 않는다).
- AI는 **제안만** 한다. 장바구니 담기·주문·재고 반영은 사람이 버튼을 눌러야 된다.

## 1. 폴더
```
harness/   harness.yaml(단일 기준), agents/*.md(에이전트 카드), policies/
data/      categories·stores·products·market·sources .json (시연용 가상 데이터, DB 시드 원본)
backend/   FastAPI (app/, tests/, pyproject.toml)
app/       Expo React Native (expo-router), 웹 내보내기, 기준 화면 iPhone 14 Pro 393×852
docs/      ARCHITECTURE.md(이 문서), DESIGN.md(화면 기준)
deploy/    run_local.sh
```

## 2. 공통 타입 (JSON)
```ts
Evidence  = { kind: "dataset"|"calc"|"input"|"assumption"|"llm", ref: string, label?: string }
Claim     = { agent_id: string, text: string, level: "fact"|"estimate"|"assumption"|"question",
              evidence: Evidence[], blocked: boolean, block_reasons: string[] }
AgentResult = { agent_id, ok: boolean, claims: Claim[], data: object, used_llm: boolean, error: string|null }
RunEvent  = { seq: number, type: "plan"|"agent_start"|"agent_done"|"gate"|"llm"|"summary"|"done"|"error", payload: object }
RunResult = { run_id, flow, plan: string[], results: AgentResult[], public_claims: Claim[], blocked_count: number,
              summary: string, summary_source: "llm"|"template",
              llm: { provider: string, model: string, available: boolean }, events: RunEvent[] }

Store   = { id, name, kind: "restaurant"|"market", category, label, icon, story, open: "HH:MM", close: "HH:MM",
            prep_min, lat, lng, rating, delivery_fee, is_open: boolean, closes_in_min: number|null }
Product = { id, store_id, store_name, name, description, price, emoji, temp: "cold"|"hot"|"room",
            stock, sold_out: boolean, serves, tags: string[] }
CartItem = { product_id: string, qty: number }
Quote   = { lines: [{product_id, name, store_id, store_name, price, qty, line_total, temp, sold_out}],
            groups: [{store_id, store_name, kind, subtotal, prep_min}],
            bags: [{temp, label, items: string[]}],          // label: "냉장 보냉팩" | "따뜻한 보온백" | "상온 봉투"
            fees: { market: number, restaurants: number, total: number },
            subtotal, total, eta_min, distance_km, in_zone: boolean, destination: {id, name},
            warnings: string[] }
Nudge   = { id, kind, title, body, action: { type: "ask", prompt: string } | { type: "open", route: string } | null }
Order   = { id, created_at, status, status_label, destination: {id,name}, quote: Quote, agent_run_id: string|null,
            history: [{status, status_label, at}] }
```
시간: ISO 8601. 서버 기준 시각은 `now()`이며 시연을 위해 요청 헤더 `X-Demo-Time: HH:MM`(KST)으로 바꿀 수 있다(영업시간·마감 임박·식사 시간 판단에만 쓰임).

## 3. API (접두어 `/v1`, JSON, 오류는 `{detail: "한국어 문장"}`)
| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| GET | /health | - | `{status:"ok", llm:{provider,model,available}}` (available은 실제 확인: Ollama `/api/tags` 1초) |
| POST | /auth/demo | - | `{role:"customer"\|"merchant"}` → `{token, user}` 시연 로그인. merchant는 `dongmun-hoe` 가게 상인 |
| POST | /auth/signup | - | `{name,email,password(8자+)}` → `{token,user}` (409 중복) |
| POST | /auth/login | - | `{email,password}` → `{token,user}` (401) |
| GET | /me | 필요 | `{user}`; user = `{id,name,email,role,store_id\|null,prefs:{destination_id,likes:string[]}}` |
| PATCH | /me/prefs | 필요 | `{destination_id?, likes?}` → `{user}` (개인화: 자주 찾는 태그) |
| GET | /catalog/categories | - | `{categories}` |
| GET | /catalog/stores?kind=&category= | - | `{stores: Store[]}` |
| GET | /catalog/stores/{id} | - | `{store: Store, products: Product[]}` |
| GET | /catalog/products?q=&store_id=&tag= | - | `{products: Product[]}` (q는 이름·설명·태그·가게명) |
| GET | /market | - | `{market}` = data/market.json + 집하장 |
| POST | /cart/quote | - | `{items: CartItem[], destination_id?}` → `{quote: Quote, run: RunResult}` (flow cart_check) |
| POST | /agent/plan | - | `{message, destination_id?}` → `{run: RunResult, proposal: {items: CartItem[], quote: Quote}\|null}` (flow plan_order) |
| POST | /agent/chat | 선택 | `{message}` → `{run: RunResult, suggest_plan: boolean}` (flow assistant_chat, 로그인 시 내 주문 사용) |
| POST | /agent/nudges | 선택 | `{cart: CartItem[], destination_id?, dismissed: string[]}` → `{nudges: Nudge[], run_id}` (flow care_nudges) |
| GET | /harness | - | `{name, persona, teams, agents, flows, cards:{id: markdown}}` (LLM 주소·가정값은 내보내지 않음) |
| GET | /agent-runs/{run_id} | - | RunResult (최근 200개 메모리 + DB) |
| POST | /orders | 필요(고객) | `{items, destination_id, agent_run_id?}` → `{order}`. 서버가 quote를 다시 계산, 품절·범위 밖이면 409, 재고 차감 |
| GET | /orders | 필요 | `{orders: Order[]}` 내 주문(최신순) |
| GET | /orders/{id} | 필요 | `{order}` |
| POST | /orders/{id}/advance | 필요 | 시연용 다음 상태로 → `{order}` |
| GET | /merchant/store | 필요(상인) | `{store, products, orders: [{id, status_label, created_at, lines(내 가게 것만)}]}` |
| PATCH | /merchant/products/{id} | 필요(상인) | `{price?, stock?}` (내 가게 상품만, 아니면 403) → `{product}` |
| POST | /merchant/intake | 필요(상인) | `{message}` → `{run: RunResult, changes: [{product_id,name,before:{price,stock},after:{price?,stock?}}]}` (반영 안 함) |

인증: `Authorization: Bearer <JWT>`. 비밀번호는 해시 저장. JWT_SECRET 환경변수(없으면 개발용 임의값을 만들어 경고).

## 4. 주문 상태
`received(주문 접수) → preparing(가게 준비 중) → hub_packed(집하장 포장 완료) → delivering(배달 중) → delivered(도착)`.
맛집만 있는 주문은 `hub_packed`를 건너뛴다. 전이는 앞으로만, `/advance`로 한 칸씩.

## 5. 흐름과 에이전트 (harness.yaml)
| flow | 에이전트 | 앱이 쓰는 결과 |
|---|---|---|
| plan_order | intake → curator → bundler → delivery → freshness | proposal(장바구니 제안), 타임라인, 근거, 대체("단, …") |
| cart_check | bundler → delivery → freshness | Quote의 groups·bags·fees·eta·warnings |
| assistant_chat | concierge | summary + 근거, suggest_plan |
| care_nudges | care | nudges |
| stock_intake | stock_intake | changes(확인 후 PATCH) |

계산 규칙(가정값은 harness.yaml `assumptions`):
- 시장 묶음 배송비 = min(max, base + per_extra_stall × (시장 가게 수 − 1)), 시장 상품이 없으면 0.
- 맛집 배달비 = 맛집 가게마다 store.delivery_fee 합.
- 거리 = 집하장(맛집은 그 가게) → 배송지 haversine 직선거리, 여러 출발지면 최댓값.
- ready_min = 가게 prep_min 최댓값 + (시장 상품 있으면 hub_pack_min).
- eta_min = ready_min + ceil(distance_km × min_per_km).
- in_zone = distance_km ≤ delivery_radius_km.
- 냉장(cold) 상품이 있고 eta_min(주문부터 도착까지 전체)이 cold_max_transit_min을 넘으면 freshness 경고(warnings에 문장 추가).

## 6. 화면에서 에이전트가 보이는 곳 (앱 계약)
1. 모든 탭 위 **에이전트 카드**(JARI): 하르방 오브, 들은 말, 큰 답 문장, 입력창, 제안 칩.
2. **작업 과정 타임라인**: RunResult.events를 에이전트 이름(GET /harness)으로 단계 표시 ✓/!, LLM 사용 여부 표시.
3. **근거 칩**: 주장마다 근거 종류(데이터·계산·가정·입력·AI 추출) 칩, "근거 N개 보기" 접기.
4. **제안 승인 시트**: 장바구니 제안 → "이대로 담기"/"고쳐서 담기". 자동 주문 없음.
5. **먼저 챙겼어요 카드**: /agent/nudges, 닫은 id는 다시 보내 반복하지 않음.
6. **상인 말 입력**: 이전→이후 표 확인 후 반영.
7. **에이전트 팀 화면**: /harness 팀·카드.

## 7. v0.2 추가 (2026-11-13)
- Store에 `min_order`, `pickup`, `image` 추가. 목록·상세 응답에는 배송지 기준 `eta_min`, `distance_km`, `delivery_tip`(시장 가게 = 묶음 배송 기본료), `in_zone`이 붙는다.
- Product에 `group`("대표 메뉴"|"메뉴"|"사이드·음료"), `popular`, `image` 추가.
- `GET /catalog/stores?kind=&category=&sort=default|fast|rating|fee&open_only=&destination_id=` → `{stores, destination}` (잘못된 sort·배송지는 400)
- `GET /catalog/stores/{id}?destination_id=` → store에 배달 정보 포함
- `GET /catalog/products/{id}` → `{product, store}` (404)
- 데이터: 맛집 카테고리마다 가게 3곳(총 42곳, 상품 82개). 가상 데이터.
