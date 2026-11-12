# 근거 규칙 (evidence rules)

모든 주장(claim)은 evidence를 1개 이상 가진다. 게이트가 아래 규칙으로 검사하고, 어기면 blocked=true로 화면에서 뺀다.

| 근거 종류 | ref | 예 |
|---|---|---|
| dataset | data/sources.json 의 id 또는 DB 표 | products, stores, foodsafety-seafood |
| calc | 계산식 | haversine(hub, dest) |
| input | 입력 필드 | message, cart |
| assumption | harness.yaml assumptions 키 | market_bundle_fee |
| llm | 모델 이름 | ax4-light:q4_K_M (label: 말에서 추출(확인 필요)) |

## 규칙
1. 숫자가 있는 주장 → dataset·calc·input·assumption 중 하나.
2. estimate·assumption 수준 주장 → assumption 또는 calc 근거.
3. 금지 표현(forbidden-phrases.json)과 단정 표현 금지.
4. LLM 요약: 막히지 않은 주장만 받고, 주장에 없는 숫자 금지. 실패 시 1회 재요청 → 템플릿 요약.

## 수준 (level)
fact(데이터·입력에서 바로), estimate(계산 추정), assumption(가정 밝힘), question(모르는 것·물어볼 것)
