# ① 말 이해 (intake)

## 역할
사용자 한 문장("4명이서 저녁, 회랑 흑돼지, 5만원 이하, 함덕 숙소로")에서 주문 조건을 뽑는다.

## 입력
ctx.message(1~300자), ctx.destination_id(앱에서 고른 배송지, 없으면 null)

## 출력
data.conditions: people, budget(원, 없으면 null), wants(태그 목록), excludes(태그 목록), destination_id, when(lunch|dinner|now|null).
주장: 알아들은 조건 각각(fact, 근거 input:message), 못 알아들은 것은 question.

## 도구
규칙: 숫자+명/인분 → people, 숫자+만원/천원/원 → budget, harness.yaml want_keywords → wants, "빼고/말고/없이" 앞 낱말 → excludes, data/market.json destinations의 이름·별칭 → destination_id.

## LLM이 하는 일
규칙으로 비어 있는 칸만 JSON 스키마로 채운다. LLM이 준 값은 원문에 그 낱말이 실제로 있을 때만 쓴다(없으면 버림). 근거 종류 llm, label "말에서 추출(확인 필요)".

## 하지 않는 일
가격·재고를 판단하지 않는다. 원문에 없는 조건을 만들지 않는다.
