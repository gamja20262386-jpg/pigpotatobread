import { useEffect,useState } from "react";
import { Link,useNavigate } from "react-router-dom";
import { api,getToken } from "../api.js";
export default function CartPage(){
 const [cart,setCart]=useState({items:[],subtotal:0,deliveryFee:0,total:0}),[message,setMessage]=useState(""),[suggestions,setSuggestions]=useState([]);
 const navigate=useNavigate();
 async function load(){try{setCart(await api("/cart"));}catch(e){setMessage(e.message);}}
 useEffect(()=>{load();},[]);
 async function change(id,quantity){try{await api("/cart/items/"+id,{method:"PATCH",body:JSON.stringify({quantity})});await load();}catch(e){setMessage(e.message);}}
 async function recommend(){try{const d=await api("/recommendations",{method:"POST",body:JSON.stringify({})});setSuggestions(d.suggestions);setMessage(d.message);}catch(e){setMessage(e.message);}}
 async function addSuggestion(productId){try{await api("/cart/items",{method:"POST",body:JSON.stringify({productId})});await load();setSuggestions(old=>old.filter(p=>p.id!==productId));setMessage("추천 상품을 장바구니에 담았습니다.");}catch(e){setMessage(e.message);}}
 async function checkout(){if(!getToken()){navigate("/login");return;}try{const d=await api("/orders",{method:"POST",body:JSON.stringify({})});setMessage("주문이 접수되었습니다. 주문번호: "+d.order.id);await load();}catch(e){setMessage(e.message);}}
 return <section><p className="eyebrow">YOUR CART</p><h1>장바구니</h1>{message&&<p className="notice">{message}</p>}{cart.items.map(item=><article className="cart-row" key={item.id}><div><b>{item.name}</b><p>{item.store} · {item.price.toLocaleString()}원</p></div><div className="quantity"><button onClick={()=>change(item.id,item.quantity-1)}>−</button>{item.quantity}<button onClick={()=>change(item.id,item.quantity+1)}>＋</button></div></article>)}{!cart.items.length&&<p className="empty">장바구니가 비어 있습니다. <Link to="/">상품 보러 가기</Link></p>}<button className="wide" onClick={recommend} disabled={!cart.items.length}>AI 추천 상품 확인하기</button>{suggestions.map(p=><article className="cart-row" key={p.id}><div><b>{p.emoji} {p.name}</b><p>{p.price.toLocaleString()}원</p></div><button onClick={()=>addSuggestion(p.id)}>담기</button></article>)}<div className="summary"><p>상품 금액 <b>{cart.subtotal.toLocaleString()}원</b></p><p>매장별 배달팁 합계 <b>{cart.deliveryFee.toLocaleString()}원</b></p><h2>총 금액 <strong>{cart.total.toLocaleString()}원</strong></h2></div><button className="wide" disabled={!cart.items.length} onClick={checkout}>주문하기</button></section>;
}
