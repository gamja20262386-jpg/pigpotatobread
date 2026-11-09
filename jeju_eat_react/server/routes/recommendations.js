import { Router } from "express";
import { readDb } from "../lib/db.js";
import { optionalAuth } from "../middleware/auth.js";

const router = Router();
router.use(optionalAuth);
router.post("/", (req, res) => {
  const key = req.user?.id || (req.headers["x-session-id"] ? "guest:" + String(req.headers["x-session-id"]).slice(0,80) : null);
  if (!key) return res.status(400).json({ error: "세션 정보가 없습니다." });
  const db = readDb();
  const cart = db.carts[key] || [];
  const names = cart.map(line => db.products.find(p => p.id === line.productId)?.name || "").join(" ");
  const candidates = /흑돼지|고기|돈카츠/.test(names) ? ["p-9","p-10"] : /국수|육개장|몸국/.test(names) ? ["p-9"] : ["p-9","p-10"];
  const suggestions = candidates.filter(id => !cart.some(line => line.productId === id)).map(id => db.products.find(p => p.id === id)).filter(Boolean);
  res.json({ type: "rule-based-demo", message: "장바구니 상품을 바탕으로 만든 규칙 기반 추천입니다.", suggestions });
});
export default router;
