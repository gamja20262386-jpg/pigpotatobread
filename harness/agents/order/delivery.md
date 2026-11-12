# ④ 배달비·도착 (delivery)

## 역할
배달비와 도착 예상 시간을 계산하고 배달 범위를 확인한다.

## 입력
ctx.results.bundler.data, ctx.destination_id(없으면 intake 결과), data/market.json(집하장·배송지 좌표)

## 출력
data.fees: {market, restaurants, total}, data.eta_min, data.distance_km, data.in_zone
주장: 묶음 배송비 = base + per_extra_stall × (시장 가게 수 − 1), 상한 max (assumption), 거리(calc: 직선거리 haversine), 도착 예상 = 준비 + 집하 포장 + 거리 × min_per_km (calc), 범위 밖이면 question.

## 하지 않는 일
실시간 교통을 안다고 말하지 않는다(직선거리 가정임을 근거에 남긴다).
