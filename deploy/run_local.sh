#!/usr/bin/env bash
# 제주잇 로컬 실행 (Linux·WSL): 백엔드(FastAPI :8040) + 앱 웹(Expo :8081)
# 사용: bash deploy/run_local.sh        (끝내려면 Ctrl+C)
# 환경변수: LLM_PROVIDER(ollama|claude|mock|off, 기본 harness.yaml), OLLAMA_URL, OLLAMA_MODEL, JWT_SECRET
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -x "$ROOT/backend/.venv/bin/python" ]; then
  echo "▶ 백엔드 가상환경 만들기 (uv 필요)"
  (cd "$ROOT/backend" && uv venv .venv --python 3.12 && uv pip install --python .venv/bin/python -r pyproject.toml --extra dev)
fi
if [ ! -d "$ROOT/app/node_modules" ]; then
  echo "▶ 앱 의존성 설치"
  (cd "$ROOT/app" && npm install)
fi

# 재시작해도 로그인이 유지되게 한 번 만든 무작위 비밀값을 파일에 보관(.gitignore). 추측 가능한 값은 쓰지 않는다.
SECRET_FILE="$ROOT/backend/.jwt_secret"
if [ -z "${JWT_SECRET:-}" ]; then
  [ -s "$SECRET_FILE" ] || (umask 077 && openssl rand -hex 32 > "$SECRET_FILE")
  JWT_SECRET="$(cat "$SECRET_FILE")"
fi
export JWT_SECRET
(cd "$ROOT/backend" && .venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8040) &
API_PID=$!
trap 'kill $API_PID 2>/dev/null' EXIT

for _ in $(seq 1 60); do curl -sf http://localhost:8040/v1/health >/dev/null && break; sleep 0.5; done
echo "▶ API: $(curl -s http://localhost:8040/v1/health)"
echo "▶ 앱: http://localhost:8081  (시연은 마이 → 시연 시각 18:30 권장)"
cd "$ROOT/app" && npx expo start --web --port 8081
