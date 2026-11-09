const SESSION_KEY = "jeju-eat-session";
const TOKEN_KEY = "jeju-eat-token";
export const AUTH_CHANGED_EVENT = "jeju-eat-auth-changed";
function sessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(SESSION_KEY, id); }
  return id;
}
export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}
export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", "X-Session-Id": sessionId(), ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`/api${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "요청을 처리하지 못했습니다.");
  return data;
}
