# 제주잇 백엔드

FastAPI + SQLite + 하르방 에이전트 하네스. 계약은 `../docs/ARCHITECTURE.md`, 에이전트·흐름·가정값은 `../harness/harness.yaml`, 시드 데이터는 `../data/*.json`.

## 설치
```bash
cd backend
uv venv .venv --python 3.12
uv pip install --python .venv/bin/python -r pyproject.toml --extra dev      # Claude를 쓰려면 --extra claude 추가
```

## 실행
```bash
.venv/bin/uvicorn app.main:app --port 8040 --reload
# http://localhost:8040/v1/health , /docs
```
처음 켤 때 `backend/jejueat.db`를 만들고 가게 22·상품 40·시연 계정(고객, `dongmun-hoe` 상인)을 넣는다. 초기화하려면 파일을 지운다.
시연 로그인: `POST /v1/auth/demo {"role": "customer" | "merchant"}`. 시각 바꾸기: 요청 헤더 `X-Demo-Time: 20:30`(KST).

## 테스트
```bash
.venv/bin/python -m pytest -q
```
테스트는 메모리 DB를 쓰고 LLM을 끈다(`LLM_PROVIDER=off`, 필요한 테스트만 MockProvider). 네트워크를 쓰지 않는다.

## 환경변수
| 이름 | 기본 | 설명 |
|---|---|---|
| `LLM_PROVIDER` | harness.yaml (`ollama`) | `ollama` \| `claude` \| `mock` \| `off` |
| `OLLAMA_URL` | harness.yaml | 예: `http://172.20.32.1:11434` (WSL → Windows Ollama) |
| `OLLAMA_MODEL` | harness.yaml | 예: `ax4-light:q4_K_M` |
| `LLM_DEADLINE_S` | harness.yaml (`20`) | LLM 호출 1번 전체 시간 상한(초) |
| `ANTHROPIC_API_KEY` | - | `LLM_PROVIDER=claude`일 때 |
| `JWT_SECRET` | 임의값(경고) | 없으면 켤 때마다 바뀌어 로그인이 풀린다 |
| `DATABASE_URL` | `sqlite:///backend/jejueat.db` | SQLAlchemy URL |

LLM이 꺼져 있거나 실패해도 모든 흐름은 규칙·템플릿으로 끝까지 동작한다(`summary_source: "template"`).
