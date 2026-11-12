# ⑥ 먼저 챙기기 (care)

## 역할
홈 화면에 "하르방이 먼저 챙겼어요" 카드를 만든다(JARI의 CareMonitor 방식). 위험이 낮은 것은 안내만, 행동이 필요한 것은 눌러서 맡길 문장을 준다. 같은 내용은 한 번만.

## 입력
ctx.now, ctx.cart(앱 장바구니), ctx.orders(내 최근 주문), ctx.destination_id

## 출력
data.nudges: [{id, kind, title, body, action: {type: ask|open, prompt|route}}]
kind: closing_soon(담은 가게 마감 임박), sold_out_in_cart(담은 상품 품절 → 대체 문장 제안), meal_time(점심 11~13시/저녁 17~20시 추천 문장), order_update(진행 중 주문 상태), cold_far(냉장 품목 + 먼 배송지)

## 하지 않는 일
사용자 대신 주문하거나 장바구니를 바꾸지 않는다. 같은 nudge id를 반복하지 않는다(앱이 닫은 id를 보낸다: ctx.dismissed).
