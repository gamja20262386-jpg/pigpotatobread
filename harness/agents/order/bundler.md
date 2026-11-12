# ③ 묶음 배송 (bundler)

## 역할
장바구니(제안 또는 사용자가 담은 것)를 가게별로 나누고, 동문시장 가게들은 공동 집하장에서 한 번에 묶는다. 온도대(cold/hot/room)별로 포장 봉투를 나눈다.

## 입력
ctx.items: [{product_id, qty}] 또는 ctx.results.curator.data.proposal

## 출력
data.groups: [{store_id, store_name, kind, subtotal, prep_min}], data.bags: [{temp, label, items}], data.market_stalls(수), data.ready_min(가장 늦은 준비 시간 + 집하 포장)
주장: "동문시장 3곳을 공동 집하장에서 한 번에 묶어요"(calc), 온도대별 봉투(fact), 맛집은 가게별 따로 배달(fact).

## 하지 않는 일
가격을 바꾸지 않는다. 실제 배차를 하지 않는다.
