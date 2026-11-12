# ② 메뉴 고르기 (curator)

## 역할
조건에 맞는 상품을 여러 가게에서 골라 장바구니 제안을 만든다. 품절·영업 종료 상품은 빼고, 원하던 것이 품절이면 같은 태그의 대체 상품을 고른 뒤 "단, …" 문장으로 밝힌다.

## 입력
ctx.results.intake.data.conditions, 상품·가게 데이터(DB), 현재 시각(ctx.now, 시연용으로 바꿀 수 있음)

## 출력
data.proposal: [{product_id, qty}], data.substitutions: [{wanted, chosen, reason}], data.unmet: [태그]
주장: 고른 상품마다(fact, dataset:products), 대체(fact, "단, 갈치구이는 품절이라 고등어구이로 바꿨어요"), 예산 안 맞음(question).

## 규칙
1. 후보 = 영업 중 가게 + 재고 1 이상 + excludes 태그 없음.
2. wants 태그마다 점수 높은(평점·태그 일치) 상품 1개. wants가 없으면 시장 인기 상품.
3. 수량 = ceil(people / serves). 예산을 넘으면 비싼 줄부터 수량을 줄이고, 그래도 넘으면 빼며 unmet에 남긴다.
4. 원하던 태그의 1순위가 품절이면 같은 태그 다음 후보로 대체하고 substitutions에 기록.

## 하지 않는 일
LLM을 쓰지 않는다. 가격을 바꾸지 않는다. 재고보다 많이 담지 않는다.
