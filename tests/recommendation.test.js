import test from "node:test";
import assert from "node:assert/strict";
import {recommendProducts,recommendationReply} from "../js/recommendation.js";
test("추천 결과는 최대 3개",()=>assert.ok(recommendProducts("간식 추천해줘").length<=3));
test("품절 상품은 추천하지 않음",()=>assert.ok(recommendProducts("1만원 이하").every(p=>!p.soldOut)));
test("예산 상한을 지킴",()=>assert.ok(recommendProducts("1만원 이하 간식").every(p=>p.price<=10000)));
test("기념품 키워드 필터",()=>assert.ok(recommendProducts("기념품 추천").every(p=>p.category==="기념품")));
test("추천 응답 문구 생성",()=>assert.match(recommendationReply("음료 추천"),/추천|찾지 못했어요/));
