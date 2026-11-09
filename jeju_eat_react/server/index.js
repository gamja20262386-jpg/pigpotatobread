import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/auth.js";
import catalogRoutes from "./routes/catalog.js";
import cartRoutes from "./routes/cart.js";
import orderRoutes from "./routes/orders.js";
import recommendationRoutes from "./routes/recommendations.js";
import { optionalAuth } from "./middleware/auth.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const origin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use(cors({ origin, credentials: true }));
app.use(express.json({ limit: "100kb" }));
// Decode the JWT once so protected routes such as /auth/me and /orders can identify the user.
app.use(optionalAuth);
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "jeju-eat-api" }));
app.use("/api/auth", authRoutes);
app.use("/api", catalogRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/recommendations", recommendationRoutes);

const here = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(here, "../client/dist");
app.use(express.static(distPath));
app.get("*", (_req, res, next) => {
  res.sendFile(path.join(distPath, "index.html"), err => { if (err) next(); });
});
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "서버 내부 오류가 발생했습니다." });
});
app.listen(port, () => console.log(`JejuEat API listening on http://localhost:${port}`));
