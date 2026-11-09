import {products,stores} from "./data.js";
export function recommendProducts(message){
const text=String(message??"").toLowerCase();
const m=text.match(/([0-9]+)\s*만\s*원/);
const budget=m?Number(m[1])*10000:(/만원 이하|1만 이하/.test(text)?10000:Infinity);
const terms=[["간식",["간식","타르트","초콜릿"]],["분식",["분식","떡볶이","김밥"]],["디저트",["디저트","마카롱","쿠키"]],["꼬치",["꼬치","흑돼지"]],["기념품",["기념품","선물","키링","자석"]],["음료",["음료","에이드","주스","마실"]]];
const matched=terms.filter(([,words])=>words.some(w=>text.includes(w))).map(([cat])=>cat);
return products.filter(p=>!p.soldOut&&p.price<=budget&&(!matched.length||matched.includes(p.category))).sort((a,b)=>a.price-b.price).slice(0,3).map(p=>({...p,store:stores.find(s=>s.id===p.storeId)?.name}));
}
export function recommendationReply(message){
const items=recommendProducts(message);
if(!items.length)return "조건에 맞는 상품을 찾지 못했어요. 예산을 조금 높이거나 다른 상품 종류를 입력해 주세요.";
return "요청하신 조건에 맞는 상품을 골랐어요.\n"+items.map(p=>"• "+p.name+" — "+p.price.toLocaleString("ko-KR")+"원 ("+p.store+")").join("\n")+"\n\n※ 품절 상품은 제외했어요.";
}
