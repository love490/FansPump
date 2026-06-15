import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { authRateLimit } from "./rateLimit";

export type AdminAuthenticatedRequest = Request & {
  admin?: {
    id: string;
    email: string;
    role: string;
  };
};

function getAdminToken(req: Request): string | null {
  const cookieToken = req.cookies?.admin_token;
  if (typeof cookieToken === "string" && cookieToken.trim()) return cookieToken.trim();

  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    if (token) return token;
  }

  return null;
}

export function adminAuthMiddleware(
  req: AdminAuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const secret = process.env.ADMIN_JWT_SECRET?.trim() || process.env.JWT_SECRET?.trim();
  if (!secret) {
    res.status(500).json({ error: "Admin authentication is not configured" });
    return;
  }

  const token = getAdminToken(req);
  if (!token) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as {
      sub?: string;
      email?: string;
      role?: string;
    };

    if (!payload.sub) {
      res.status(401).json({ error: "Invalid admin token" });
      return;
    }

    req.admin = {
      id: payload.sub,
      email: payload.email ?? "",
      role: payload.role ?? "admin",
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired admin token" });
  }
}

export function adminAuthStrictStack() {
  return [authRateLimit, adminAuthMiddleware];
}

export function signAdminToken(payload: { id: string; email: string; role: string }): string {
  const secret = process.env.ADMIN_JWT_SECRET?.trim() || process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error("ADMIN_JWT_SECRET is not configured");
  return jwt.sign(
    { sub: payload.id, email: payload.email, role: payload.role },
    secret,
    { expiresIn: "12h" }
  );
}
