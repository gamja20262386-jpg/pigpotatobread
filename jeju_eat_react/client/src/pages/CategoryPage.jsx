import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";
export default function CategoryPage() {
  const { categoryId } = useParams();
  const [products,setProducts] = useState([]);
  const [category,setCategory] = useState(null);
  const [message,setMessage] = useState("");
  useEffect(()=>{ api("/categories").then(d=>setCategory(d.categories.find(c=>c.id===categoryId))); api("/products?category="+encodeURIComponent(categoryId)).then(d=>setProducts(d.products)); },[categoryId]);
  async function add(id){ try{await api("/cart/items",{method:"POST",body:JSON.stringify({productId:id})});setMessage("장바구니에 담았습니다.");}catch(e){setMessage(e.message);} }
  return <section><p className="eyebrow">카테고리별 상품</p><h1>{category?.emoji} {category?.name || "상품 목록"}</h1>{message&&<p className="notice">{message}</p>}<div className="product-grid">{products.map(p=><article className="product-card" key={p.id}><div className="food-emoji">{p.emoji}</div><div><b>{p.name}</b><p>{p.store} · {p.description}</p><strong>{p.price.toLocaleString()}원</strong></div><button disabled={p.soldOut} onClick={()=>add(p.id)}>{p.soldOut?"품절":"담기"}</button></article>)}</div>{!products.length&&<p className="empty">등록된 상품이 없습니다.</p>}</section>;
}
