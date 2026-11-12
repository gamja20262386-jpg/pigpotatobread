import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

const QUICK_PROMPTS = [
  { label: "1만원 이하 간식", prompt: "1만원 이하 간식 추천해줘" },
  { label: "기념품 추천", prompt: "제주 기념품 추천해줘" },
  { label: "음료 추천", prompt: "시원한 음료 추천해줘" }
];

// 동문시장 추천 채팅. 닫아도 대화 내용은 유지된다(컴포넌트는 계속 마운트됨).
export default function AgentChat({ open, onClose, onAdd }) {
  const [log, setLog] = useState([{ role: "bot", text: "안녕하세요! 어떤 상품을 찾으세요? 예: 1만원 이하 제주 간식 추천해줘." }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef(null);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log, open]);

  async function send(text) {
    const message = text.trim();
    if (!message || busy) return;
    setLog(l => [...l, { role: "user", text: message }]);
    setBusy(true);
    try {
      const d = await api("/recommendations/chat", { method: "POST", body: JSON.stringify({ message }) });
      setLog(l => [...l, { role: "bot", text: d.reply, items: d.items }]);
    } catch (e) {
      setLog(l => [...l, { role: "bot", text: e.message }]);
    } finally {
      setBusy(false);
    }
  }
  async function add(product) {
    const result = await onAdd(product.id);
    setLog(l => [...l, { role: "bot", text: product.name + ": " + result }]);
  }

  if (!open) return null;
  return <aside className="chat-panel" aria-label="AI 추천 채팅">
    <div className="chat-head"><div><b>✦ 동문시장 AI 추천</b><small>예산과 취향을 알려주세요.</small></div><button className="chat-close" aria-label="채팅 닫기" onClick={onClose}>✕</button></div>
    <div className="chat-log" ref={logRef} aria-live="polite">
      {log.map((m, i) => <div key={i} className={"bubble " + m.role}>{m.text}
        {m.items?.length > 0 && <div className="chat-items">{m.items.map(p => <button key={p.id} onClick={() => add(p)}>{p.emoji} {p.name} 담기</button>)}</div>}
      </div>)}
    </div>
    <div className="quick-prompts">{QUICK_PROMPTS.map(q => <button key={q.label} onClick={() => send(q.prompt)} disabled={busy}>{q.label}</button>)}</div>
    <form className="chat-form" onSubmit={e => { e.preventDefault(); send(input); setInput(""); }}>
      <input value={input} onChange={e => setInput(e.target.value)} placeholder="예산이나 원하는 상품을 입력하세요" />
      <button disabled={busy}>보내기</button>
    </form>
  </aside>;
}
