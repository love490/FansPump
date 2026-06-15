import type { Request, Response } from "express";

export function notImplemented(req: Request, res: Response): void {
  res.status(501).json({
    error: "Not migrated",
    method: req.method,
    path: req.originalUrl,
  });
}

export function ok(req: Request, res: Response, service: string): void {
  res.json({
    ok: true,
    service,
    method: req.method,
    path: req.originalUrl,
  });
}
