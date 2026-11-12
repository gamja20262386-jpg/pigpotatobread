import { useEffect, useState } from "react";
import { api } from "../api.js";
import AgentChat from "../components/AgentChat.jsx";

// 상품이 없는 카테고리(전통주)도 보여줘서 '준비 중' 상태를 확인할 수 있게 한다.
const MARKET_CATEGORIES = ["전체", "간식", "분식", "디저트", "꼬치", "기념품", "음료", "전통주"];

export default function MarketPage() {
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [storeId, setStoreId] = useState("all");
  const [subCategory, setSubCategory] = useState("전체");
  const [message, setMessage] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  useEffect(() => {
    api("/stores?category=market").then(d => setStores(d.stores)).catch(e => setMessage(e.message));
    api("/products?category=market").then(d => setProducts(d.products)).catch(e => setMessage(e.message));
  }, []);

  async function add(productId) {
    let result;
    try { await api("/cart/items", { method: "POST", body: JSON.stringify({ productId }) }); result = "장바구니에 담았습니다."; }
    catch (e) { result = e.message; }
    setMessage(result);
    return result;
  }
  function selectStore(id) { setStoreId(id); setSubCategory("전체"); }

  const store = stores.find(s => s.id === storeId);
  const list = products.filter(p => (storeId === "all" || p.storeId === storeId) && (subCategory === "전체" || p.marketCategory === subCategory));
  return <section>
    <div className="hero"><span>JEJU · DONGMUN MARKET</span><h1>동문시장 상점을<br/>AI와 함께 골라요 🏮</h1><p>예산과 취향을 말하면 품절 상품을 빼고 추천해 드려요.</p><button className="hero-button" onClick={() => setChatOpen(true)}>✦ AI 추천받기</button></div>
    <div className="section-title"><h2>시장 상점</h2><button className="subtle" onClick={() => selectStore("all")}>전체 보기</button></div>
    <div className="store-grid">{stores.map(s => <button key={s.id} className={"store-card" + (storeId === s.id ? " active" : "")} onClick={() => selectStore(s.id)}><span>{s.icon}</span><b>{s.name}</b><small>{s.marketLabel}</small></button>)}</div>
    <h2>{store ? store.name + " 상품" : "전체 상품"}</h2>
    {store && <p className="helper">{store.description}</p>}
    <div className="chips">{MARKET_CATEGORIES.map(c => <button key={c} className={subCategory === c ? "selected" : ""} onClick={() => setSubCategory(c)}>{c}</button>)}</div>
    {message && <p className="notice">{message}</p>}
    <div className="product-grid">{list.map(p => <article className="product-card" key={p.id}><div className="food-emoji">{p.emoji}</div><div><b>{p.name}</b><p>{p.store} · {p.description}</p><strong>{p.price.toLocaleString()}원</strong></div><button disabled={p.soldOut} onClick={() => add(p.id)}>{p.soldOut ? "품절" : "담기"}</button></article>)}</div>
    {products.length > 0 && !list.length && <p className="empty">준비 중인 카테고리입니다.</p>}
    <p className="helper">※ 과제 시연용 가상 매장·상품 데이터입니다. 추천은 규칙 기반 프로토타입입니다.</p>
    <AgentChat open={chatOpen} onClose={() => setChatOpen(false)} onAdd={add} />
  </section>;
}
