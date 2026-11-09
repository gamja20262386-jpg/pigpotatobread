import { Router } from "express";
import { readDb } from "../lib/db.js";

const router = Router();

router.get("/categories", (_req, res) => res.json({ categories: readDb().categories }));
router.get("/stores", (req, res) => {
  const db = readDb();
  const stores = req.query.category ? db.stores.filter(s => s.category === req.query.category) : db.stores;
  res.json({ stores });
});
router.get("/products", (req, res) => {
  const db = readDb();
  const query = String(req.query.q || "").trim().toLowerCase();
  let products = db.products;
  if (req.query.category) products = products.filter(p => p.category === req.query.category);
  if (req.query.storeId) products = products.filter(p => p.storeId === req.query.storeId);
  if (query) products = products.filter(p => (p.name + " " + p.description).toLowerCase().includes(query));
  res.json({ products: products.map(p => ({ ...p, store: db.stores.find(s => s.id === p.storeId)?.name || "제주잇" })) });
});
export default router;
