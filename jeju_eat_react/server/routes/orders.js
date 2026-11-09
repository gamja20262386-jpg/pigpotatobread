import { Router } from "express";
import { randomUUID } from "node:crypto";
import { readDb, updateDb } from "../lib/db.js";
import { requireAuth } from "../middleware/auth.js";
const router = Router();
router.use(requireAuth);
router.get("/", (req, res) => {
  const orders = readDb().orders.filter(order => order.userId === req.user.id).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ orders });
});
router.post("/", (req, res) => {
  const sessionId = String(req.headers["x-session-id"] || "").slice(0, 80);
  const cartKey = sessionId ? "guest:" + sessionId : req.user.id;
  const db = readDb();
  const cart = db.carts[cartKey] || [];
  if (!cart.length) return res.status(400).json({ error: "장바구니가 비어 있습니다." });
  const items = cart.map(line => {
    const product = db.products.find(p => p.id === line.productId);
    const store = product && db.stores.find(s => s.id === product.storeId);
    return product && store ? { productId: product.id, name: product.name, storeId: store.id, store: store.name, price: product.price, quantity: line.quantity, deliveryFee: store.deliveryFee } : null;
  }).filter(Boolean);
  if (!items.length) return res.status(400).json({ error: "주문할 상품을 확인할 수 없습니다." });
  const grouped = Object.values(items.reduce((groups, item) => {
    const group = groups[item.storeId] ||= { storeId: item.storeId, store: item.store, items: [], subtotal: 0, deliveryFee: item.deliveryFee };
    group.items.push(item); group.subtotal += item.price * item.quantity; return groups;
  }, {}));
  const order = { id: "JE-" + randomUUID().slice(0, 8).toUpperCase(), userId: req.user.id, createdAt: new Date().toISOString(), status: "접수 완료(데모)", stores: grouped, total: grouped.reduce((sum,g) => sum + g.subtotal + g.deliveryFee, 0) };
  updateDb(data => { data.orders.push(order); data.carts[cartKey] = []; });
  res.status(201).json({ order });
});
export default router;
