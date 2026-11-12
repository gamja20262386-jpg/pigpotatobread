import { Router } from "express";
import { readDb, updateDb } from "../lib/db.js";
import { optionalAuth } from "../middleware/auth.js";
const router = Router();
router.use(optionalAuth);

// Keep the same browser session key before and after login so the cart does not disappear.
function cartKey(req) {
  const sessionId = req.headers["x-session-id"];
  return sessionId ? "guest:" + String(sessionId).slice(0, 80) : (req.user?.id || null);
}
function getCart(db, key) { return db.carts[key] || []; }
function responseCart(db, key) {
  const items = getCart(db, key).map(item => {
    const product = db.products.find(p => p.id === item.productId);
    const store = product && db.stores.find(s => s.id === product.storeId);
    return product && store ? { ...product, store: store.name, quantity: item.quantity, deliveryFee: store.deliveryFee } : null;
  }).filter(Boolean);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const feeByStore = new Map();
  for (const item of items) feeByStore.set(item.storeId, item.deliveryFee);
  const deliveryFee = [...feeByStore.values()].reduce((sum, fee) => sum + fee, 0);
  return { items, subtotal, deliveryFee, total: subtotal + deliveryFee };
}
router.get("/", (req, res) => {
  const key = cartKey(req);
  if (!key) return res.status(400).json({ error: "장바구니 세션 정보가 없습니다." });
  res.json(responseCart(readDb(), key));
});
router.post("/items", (req, res) => {
  const key = cartKey(req), { productId } = req.body || {};
  if (!key) return res.status(400).json({ error: "장바구니 세션 정보가 없습니다." });
  const product = readDb().products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: "상품을 찾을 수 없습니다." });
  if (product.soldOut) return res.status(409).json({ error: "품절된 상품입니다." });
  updateDb(db => {
    const cart = db.carts[key] ||= [];
    const existing = cart.find(item => item.productId === productId);
    if (existing) existing.quantity += 1;
    else cart.push({ productId, quantity: 1 });
  });
  res.status(201).json(responseCart(readDb(), key));
});
router.patch("/items/:productId", (req, res) => {
  const key = cartKey(req), quantity = Number(req.body?.quantity);
  if (!key || !Number.isInteger(quantity) || quantity < 0 || quantity > 99) return res.status(400).json({ error: "수량이 올바르지 않습니다." });
  updateDb(db => {
    const cart = db.carts[key] ||= [];
    const item = cart.find(x => x.productId === req.params.productId);
    if (item && quantity === 0) db.carts[key] = cart.filter(x => x.productId !== req.params.productId);
    else if (item) item.quantity = quantity;
  });
  res.json(responseCart(readDb(), key));
});
router.delete("/items/:productId", (req, res) => {
  const key = cartKey(req);
  if (!key) return res.status(400).json({ error: "장바구니 세션 정보가 없습니다." });
  updateDb(db => { db.carts[key] = (db.carts[key] || []).filter(x => x.productId !== req.params.productId); });
  res.json(responseCart(readDb(), key));
});
router.delete("/", (req, res) => {
  const key = cartKey(req);
  if (!key) return res.status(400).json({ error: "장바구니 세션 정보가 없습니다." });
  updateDb(db => { db.carts[key] = []; });
  res.json(responseCart(readDb(), key));
});
export default router;
