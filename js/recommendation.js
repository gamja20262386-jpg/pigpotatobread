import { products, stores } from "./data.js";

// 금액 표현 예: 1만원, 1만 5천원, 5천원, 15000원, 15,000원
export function parseBudget(message) {
  const text = String(message ?? "").replace(/,/g, "").replace(/\s+/g, "");
  const man = text.match(/(\d+)만(?:(\d+)천)?원?/);
  if (man) return Number(man[1]) * 10000 + Number(man[2] || 0) * 1000;
  const cheon = text.match(/(\d+)천원?/);
  if (cheon) return Number(cheon[1]) * 1000;
  const won = text.match(/(\d{3,})원/);
  return won ? Number(won[1]) : Infinity;
}

const keywordGroups = [
  ["간식", ["간식", "타르트", "초콜릿"]],
  ["분식", ["분식", "떡볶이", "김밥"]],
  ["디저트", ["디저트", "마카롱", "쿠키"]],
  ["꼬치", ["꼬치", "흑돼지", "새우"]],
  ["기념품", ["기념품", "선물", "키링", "자석"]],
  ["음료", ["음료", "에이드", "주스", "마실"]]
];
const genericWords = ["추천", "상품", "뭐", "무엇", "아무거나", "골라", "제주", "시장", "만원", "원", "이하", "미만", "정도", "내", "예산", "저렴", "싼", "맛있는", "먹을", "찾아", "줘", "주세요", "해줘", "싶어", "어떤", "좋아"];
export function recommendProducts(message) {
  const text = String(message ?? "").toLowerCase().trim();
  if (!text) return [];
  const budget = parseBudget(text);
  const matchedCategories = keywordGroups.filter(([, words]) => words.some(word => text.includes(word))).map(([category]) => category);
  const matchedNames = products.filter(p => text.includes(p.name.toLowerCase()));
  const hasSpecificKeyword = matchedCategories.length > 0 || matchedNames.length > 0;
  // 모르는 상품명을 입력했을 때 무관한 상품을 무조건 추천하지 않는다.
  const stripped = text.replace(/[\d\s,]+/g, "").replace(/만|천|원/g, "");
  const remainder = genericWords.reduce((s, word) => s.split(word).join(""), stripped).replace(/[!?.,~]/g, "");
  if (!hasSpecificKeyword && remainder.length >= 2) return [];
  return products
    .filter(p => !p.soldOut && p.price <= budget)
    .filter(p => !hasSpecificKeyword || matchedCategories.includes(p.category) || matchedNames.some(m => m.id === p.id))
    .sort((a, b) => a.price - b.price)
    .slice(0, 3)
    .map(p => ({ ...p, store: stores.find(s => s.id === p.storeId)?.name ?? "알 수 없는 상점" }));
}
export function recommendationReply(message) {
  if (!String(message ?? "").trim()) return "원하는 상품이나 예산을 입력해 주세요.";
  const items = recommendProducts(message);
  if (!items.length) return "조건에 맞는 상품을 찾지 못했어요. 예산을 높이거나 다른 상품 종류를 입력해 주세요.";
  return "조건에 맞는 상품을 골랐어요.\n" +
    items.map(p => "• " + p.name + " — " + p.price.toLocaleString("ko-KR") + "원 (" + p.store + ")").join("\n") +
    "\n\n※ 품절 상품은 제외했어요. 규칙 기반 추천 결과입니다.";
}
