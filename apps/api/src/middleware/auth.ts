import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type AuthenticatedRequest = Request & {
  user?: {
    wallet: string;
    sub: string;
  };
};

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

function getWalletFromQuery(req: Request): string | null {
  const wallet = req.query.wallet;
  if (typeof wallet === "string" && wallet.trim()) return wallet.trim().toLowerCase();
  return null;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const secret = process.env.JWT_SECRET?.trim();
  const token = getBearerToken(req);

  if (token && secret) {
    try {
      const payload = jwt.verify(token, secret) as { sub?: string; wallet?: string };
      const wallet = (payload.wallet ?? payload.sub)?.toLowerCase();
      if (wallet) {
        req.user = { wallet, sub: wallet };
        next();
        return;
      }
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
  }

  const wallet = getWalletFromQuery(req);
  if (wallet) {
    req.user = { wallet, sub: wallet };
    next();
    return;
  }

  res.status(401).json({ error: "Authentication required" });
}

export function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const secret = process.env.JWT_SECRET?.trim();
  const token = getBearerToken(req);

  if (token && secret) {
    try {
      const payload = jwt.verify(token, secret) as { sub?: string; wallet?: string };
      const wallet = (payload.wallet ?? payload.sub)?.toLowerCase();
      if (wallet) {
        req.user = { wallet, sub: wallet };
      }
    } catch {
      // ignore invalid optional token
    }
  } else {
    const wallet = getWalletFromQuery(req);
    if (wallet) {
      req.user = { wallet, sub: wallet };
    }
  }

  next();
}

export function signUserToken(wallet: string): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return jwt.sign({ sub: wallet.toLowerCase(), wallet: wallet.toLowerCase() }, secret, {
    expiresIn: "7d",
  });
}
