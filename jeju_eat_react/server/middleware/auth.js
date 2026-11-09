import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET || "local-development-secret-change-me";

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try { req.user = jwt.verify(token, secret); } catch { req.user = null; }
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user?.id) return res.status(401).json({ error: "로그인이 필요합니다." });
  next();
}

export function issueToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, secret, { expiresIn: "7d" });
}
