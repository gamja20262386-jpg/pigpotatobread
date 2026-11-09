import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { readDb, updateDb } from "../lib/db.js";
import { issueToken, requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
    return res.status(400).json({ error: "이름, 이메일과 8자 이상의 비밀번호를 입력해주세요." });
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (readDb().users.some(user => user.email === normalizedEmail)) {
    return res.status(409).json({ error: "이미 가입된 이메일입니다." });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = { id: randomUUID(), name: name.trim(), email: normalizedEmail, passwordHash, createdAt: new Date().toISOString() };
  updateDb(db => { db.users.push(user); });
  res.status(201).json({ token: issueToken(user), user: { id: user.id, name: user.name, email: user.email } });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const user = readDb().users.find(item => item.email === String(email || "").trim().toLowerCase());
  if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
    return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
  }
  res.json({ token: issueToken(user), user: { id: user.id, name: user.name, email: user.email } });
});

router.get("/me", requireAuth, (req, res) => {
  const user = readDb().users.find(item => item.id === req.user.id);
  if (!user) return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

export default router;
