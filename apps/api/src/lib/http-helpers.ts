import type { Request, Response, RequestHandler } from "express";

export function getRouteParam(value: string | string[] | undefined): string {
  if (value === undefined) return "";
  return Array.isArray(value) ? value[0] : value;
}

export function queryToSearchParams(query: Request["query"]): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (typeof value === "string") {
      params.set(key, value);
    } else if (Array.isArray(value)) {
      for (const v of value) {
        if (typeof v === "string") params.append(key, v);
      }
    }
  }
  return params;
}

export function setCacheControl(res: Response, value: string): void {
  res.setHeader("Cache-Control", value);
}

export function requireAnalyticsSyncSecret(req: Request, res: Response): boolean {
  const secret = process.env.ANALYTICS_SYNC_SECRET;
  const auth = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!secret || auth !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

export function asyncHandler(
  fn: (req: Request, res: Response) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    void fn(req, res).catch(next);
  };
}
