
import ollama
import json

MODEL = 'llama3.2:3b'
MAX_ATTEMPTS = 2

# Ollama 연결 및 응답 시간 제한
client = ollama.Client(timeout=60)


# 공통 LLM 호출 함수
def run_agent(system_prompt, user_message):

    for attempt in range(1, MAX_ATTEMPTS + 1):

        try:
            response = client.chat(
                model=MODEL,
                format='json',
                messages=[
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_message}
                ]
            )

            result = response['message']['content']

            if not result.strip():
                raise ValueError("AI 응답이 비어 있습니다.")

            return json.loads(result)

        except json.JSONDecodeError:
            print(f"JSON 형식 오류! ({attempt}/{MAX_ATTEMPTS})")

            if attempt == MAX_ATTEMPTS:
                raise

        except ollama.ResponseError as e:
            if e.status_code == 404:
                raise RuntimeError(
                    f"모델을 찾을 수 없습니다: {MODEL}"
                ) from e

            raise RuntimeError(
                f"Ollama 응답 오류: {e}"
            ) from e

        except Exception as e:
            if attempt == MAX_ATTEMPTS:
                raise RuntimeError(
                    f"LLM 호출 실패: {e}"
                ) from e

            print(f"호출 오류! 재시도합니다. ({attempt}/{MAX_ATTEMPTS})")


# 1. 음식 추천 Agent
def food_agent(user_message):
    system_prompt = """
    너는 배달앱의 음식 추천 전문가야.
    음식 3가지를 추천하고 이유를 알려줘.
    반드시 JSON 형식으로 답변해.

    {
        "agent": "food_recommendation",
        "status": "success",
        "recommendations": [
            {"menu": "음식 이름", "reason": "추천 이유"}
        ]
    }
    """
    return run_agent(system_prompt, user_message)


# 2. 주문 도우미 Agent
def order_agent(user_message):
    system_prompt = """
    너는 배달앱의 주문 도우미야.
    메뉴, 수량, 옵션을 정리해.
    빠진 정보가 있으면 확인을 요청해.
    실제 주문을 완료했다고 말하지 마.

    반드시 JSON 형식으로 답변해.

    {
        "agent": "order_assistant",
        "status": "success",
        "order": [
            {"menu": "메뉴 이름", "quantity": 1, "option": "옵션"}
        ],
        "message": "주문 확인 안내"
    }
    """
    return run_agent(system_prompt, user_message)


# 3. 리뷰 분석 Agent
def review_agent(user_message):
    system_prompt = """
    너는 배달앱의 리뷰 분석 전문가야.
    리뷰의 장점과 단점을 분석해.
    없는 내용을 만들어 내지 마.

    반드시 JSON 형식으로 답변해.

    {
        "agent": "review_analysis",
        "status": "success",
        "advantages": ["장점"],
        "disadvantages": ["단점"],
        "summary": "전체 리뷰 요약"
    }
    """
    return run_agent(system_prompt, user_message)


# 결과 출력 함수
def print_result(title, result):
    print(f"\n===== {title} =====")
    print(json.dumps(result, ensure_ascii=False, indent=4))


# Agent 실행 및 오류 처리
try:
    food_result = food_agent(
        "나는 매운 음식을 좋아해. 저녁 메뉴 추천해 줘."
    )
    print_result("음식 추천 Agent", food_result)

    order_result = order_agent(
        "치킨 한 마리와 콜라 하나 주문하고 싶어."
    )
    print_result("주문 도우미 Agent", order_result)

    review_result = review_agent(
        "음식이 맛있어요. 배달이 빨라요. 양이 조금 적어요."
    )
    print_result("리뷰 분석 Agent", review_result)

except RuntimeError as e:
    print("\n프로그램 오류:", e)

except ValueError as e:
    print("\n응답 데이터 오류:", e)

except Exception as e:
    print("\n예상하지 못한 오류:", e)