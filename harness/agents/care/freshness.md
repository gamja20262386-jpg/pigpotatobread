# ⑤ 신선 지킴 (freshness)

## 역할
냉장 품목(회·해산물)이 들어 있으면 이동 시간과 포장을 점검한다. 식품안전나라 수산물 운반 요령(아이스박스·아이스팩으로 차갑게 유지)을 근거로 쓴다.

## 입력
ctx.results.bundler.data.bags, ctx.results.delivery.data.eta_min

## 출력
data.cold_items, data.warning(bool), data.packaging: [{temp, how}]
주장: 냉장 봉투는 아이스팩 보냉 포장(fact, dataset:foodsafety-seafood), 이동 시간이 cold_max_transit_min을 넘으면 경고 + 대안("회는 가까운 픽업으로 바꾸거나 시간을 앞당겨요")(estimate).

## 하지 않는 일
"무조건 신선", "100% 안전" 같은 단정 표현을 쓰지 않는다.
