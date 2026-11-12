import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function HomePage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { api("/categories").then(d => setCategories(d.categories)); api("/products").then(d => setProducts(d.products)); }, []);
  async function add(productId) { try { await api("/cart/items", { method: "POST", body: JSON.stringify({ productId }) }); setMessage("장바구니에 담았습니다."); } catch(e) { setMessage(e.message); } }
  async function search(e) { e.preventDefault(); const d = await api("/products?q=" + encodeURIComponent(query)); setProducts(d.products); }
  return <section>
    <div className="hero"><span>제주도민을 위한 배달</span><h1>오늘은 제주를<br/>맛있게 즐겨요 🍊</h1><p>제주 맛집과 신선한 식자재를 한곳에서</p></div>
    <form className="search" onSubmit={search}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="먹고 싶은 메뉴를 검색하세요"/><button>검색</button></form>
    <Link className="market-banner" to="/market">🏮 동문시장 AI 추천 받기 <span>예산·취향 맞춤 →</span></Link>
    <h2>카테고리</h2><div className="category-grid">{categories.map(c=><Link className="category-tile" key={c.id} to={c.id==="market"?"/market":"/category/"+c.id}><span>{c.emoji}</span>{c.name}</Link>)}</div>
    <div className="section-title"><h2>추천 메뉴</h2><span>백엔드 상품 API 연동</span></div>
    {message && <p className="notice">{message}</p>}
    <div className="product-grid">{products.map(p=><article className="product-card" key={p.id}><div className="food-emoji">{p.emoji}</div><div><b>{p.name}</b><p>{p.store} · {p.description}</p><strong>{p.price.toLocaleString()}원</strong></div><button disabled={p.soldOut} onClick={()=>add(p.id)}>{p.soldOut?"품절":"담기"}</button></article>)}</div>
  </section>;
}
