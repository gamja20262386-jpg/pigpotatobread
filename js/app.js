import {stores,products,categories} from "./data.js";
import {recommendationReply} from "./recommendation.js";
const $=id=>document.getElementById(id);let selectedStore="all",selectedCategory="전체";const cart=new Map();
const won=n=>n.toLocaleString("ko-KR")+"원";
function renderStores(){
$("store-list").innerHTML=stores.map(s=>'<button class="store-card '+(selectedStore===s.id?"active":"")+'" data-store="'+s.id+'"><span class="store-icon">'+s.icon+'</span><strong>'+s.name+'</strong><small>'+s.category+'</small></button>').join("");
document.querySelectorAll("[data-store]").forEach(b=>b.addEventListener("click",()=>{selectedStore=b.dataset.store;selectedCategory="전체";render();}));
}
function renderCategories(){
const available=[...new Set(products.filter(p=>selectedStore==="all"||p.storeId===selectedStore).map(p=>p.category))];
const shown=categories.filter(c=>c==="전체"||available.includes(c));if(!shown.includes(selectedCategory))selectedCategory="전체";
$("category-list").innerHTML=shown.map(c=>'<button class="'+(selectedCategory===c?"active":"")+'" data-category="'+c+'">'+c+'</button>').join("");
document.querySelectorAll("[data-category]").forEach(b=>b.addEventListener("click",()=>{selectedCategory=b.dataset.category;renderProducts();renderCategories();}));
}
function renderProducts(){
const store=stores.find(s=>s.id===selectedStore);$("product-heading").textContent=store?store.name+" 상품":"전체 상품";$("product-subtitle").textContent=store?store.description:"마음에 드는 상품을 골라보세요.";
const list=products.filter(p=>(selectedStore==="all"||p.storeId===selectedStore)&&(selectedCategory==="전체"||p.category===selectedCategory));
$("product-list").innerHTML=list.length?list.map(p=>'<article class="product-card"><div class="product-emoji">'+p.emoji+'</div><h3>'+p.name+'</h3><p>'+p.description+'</p><div class="product-bottom"><strong>'+won(p.price)+'</strong><button data-add="'+p.id+'" '+(p.soldOut?"disabled":"")+'>'+(p.soldOut?"품절":"담기")+'</button></div></article>').join(""):'<div class="empty">준비 중인 카테고리입니다.</div>';
document.querySelectorAll("[data-add]").forEach(b=>b.addEventListener("click",()=>{const p=products.find(x=>x.id===b.dataset.add);if(p&&!p.soldOut){cart.set(p.id,(cart.get(p.id)||0)+1);renderCart();}}));
}
function renderCart(){
const entries=[...cart.entries()];$("cart-items").innerHTML=entries.length?entries.map(([id,count])=>{const p=products.find(x=>x.id===id);return '<div class="cart-item"><span>'+p.name+' × '+count+'</span><b>'+won(p.price*count)+'</b></div>';}).join(""):'<p class="muted">담긴 상품이 없습니다.</p>';
$("cart-total").textContent=won(entries.reduce((sum,[id,count])=>sum+products.find(p=>p.id===id).price*count,0));
}
function render(){renderStores();renderCategories();renderProducts();renderCart();}
function addMessage(text,kind){const p=document.createElement("p");p.className="bubble "+kind;p.textContent=text;$("chat-log").append(p);$("chat-log").scrollTop=$("chat-log").scrollHeight;}
function sendPrompt(message){if(!message.trim())return;addMessage(message,"user");addMessage(recommendationReply(message),"bot");}
$("all-stores").addEventListener("click",()=>{selectedStore="all";selectedCategory="전체";render();});
$("open-chat").addEventListener("click",()=>{$("chat-panel").hidden=false;$("chat-input").focus();});
$("close-chat").addEventListener("click",()=>{$("chat-panel").hidden=true;});
$("chat-form").addEventListener("submit",e=>{e.preventDefault();sendPrompt($("chat-input").value);$("chat-input").value="";});
document.querySelectorAll("[data-prompt]").forEach(b=>b.addEventListener("click",()=>sendPrompt(b.dataset.prompt)));render();
