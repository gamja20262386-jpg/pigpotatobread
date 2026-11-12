// 승한 제주마켓 AI 추천 테스트를 서버 추천 로직 + 실제 db.json 데이터로 옮김
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseBudget, recommendProducts, recommendationReply } from "../server/lib/recommendation.js";

const db = JSON.parse(fs.readFileSync(new URL("../server/data/db.json", import.meta.url), "utf8"));
const data = { products: db.products.filter(p => p.category === "market"), stores: db.stores };
const recommend = message => recommendProducts(message, data);

test("동문시장 데이터: 상점 6곳, 상품 12개", () => {
  assert.equal(db.stores.filter(s => s.category === "market").length, 6);
  assert.equal(data.products.length, 12);
});
test("금액 표현을 원 단위로 변환", () => {
  assert.equal(parseBudget("1만원 이하"), 10000);
  assert.equal(parseBudget("1만 5천원"), 15000);
  assert.equal(parseBudget("5천원"), 5000);
  assert.equal(parseBudget("15,000원"), 15000);
  assert.equal(parseBudget("간식 추천"), Infinity);
});
test("추천 결과는 최대 3개", () => assert.ok(recommend("간식 추천해줘").length <= 3));
test("품절 상품은 추천하지 않음", () => {
  const items = recommend("1만원 이하");
  assert.ok(items.length > 0);
  assert.ok(items.every(p => !p.soldOut));
});
test("예산 상한을 지킴", () => assert.ok(recommend("1만원 이하 간식").every(p => p.price <= 10000)));
test("기념품 키워드 필터", () => {
  const items = recommend("기념품 추천");
  assert.ok(items.length > 0);
  assert.ok(items.every(p => p.marketCategory === "기념품"));
});
test("모르는 상품명은 무관한 상품을 추천하지 않음", () => assert.equal(recommend("양갱 추천해줘").length, 0));
test("추천 결과에 상점 이름 포함", () => assert.ok(recommend("음료 추천").every(p => p.store && p.store !== "알 수 없는 상점")));
test("추천 응답 문구 생성", () => {
  assert.match(recommendationReply("음료 추천", recommend("음료 추천")), /골랐어요/);
  assert.match(recommendationReply("양갱", []), /찾지 못했어요/);
});
