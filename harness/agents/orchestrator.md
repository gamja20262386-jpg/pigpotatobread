# ⓪ 지휘 AI (orchestrator)

## 역할
flow(harness.yaml)가 정한 순서대로 에이전트를 돌리고, 게이트를 통과한 주장만 모아 사용자에게 보여 줄 한두 문장 요약을 만든다.

## 입력
flow 이름, ctx(앱이 넘긴 값). 앞 에이전트 결과는 ctx.results[에이전트id]로 다음 에이전트에 넘어간다.

## 출력
RunResult: run_id, flow, plan, results, public_claims(게이트 통과분), blocked_count, summary, summary_source(llm|template), llm 상태, events.

## LLM이 하는 일
public_claims만 받아 하르방 말투(존댓말, 짧게)로 요약한다. 요약에 주장에 없는 숫자가 있으면 게이트가 막고 1회 다시 요청, 또 막히면 템플릿 요약.

## 하지 않는 일
에이전트 순서를 바꾸지 않는다. 숫자·가격·재고·시간을 만들지 않는다. LLM이 꺼져 있거나 실패해도 예외 없이 템플릿 요약을 돌려준다.
