import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { STAKING_TIER_LABELS } from "@iopn/shared";
import { corsMiddleware } from "./middleware/cors";
import { publicRateLimit } from "./middleware/rateLimit";
import prisma from "./lib/prisma";

import tokensRouter from "./routes/tokens";
import poolsRouter from "./routes/pools";
import stakingRouter from "./routes/staking";
import adminRouter from "./routes/admin";
import userRouter from "./routes/user";
import launchpoolRouter from "./routes/launchpool";
import bountiesRouter from "./routes/bounties";
import liquidityRouter from "./routes/liquidity";
import analyticsRouter from "./routes/analytics";
import announcementsRouter from "./routes/announcements";
import questsRouter from "./routes/quests";
import votesRouter from "./routes/votes";
import watchlistRouter from "./routes/watchlist";
import leaderboardRouter from "./routes/leaderboard";
import verifyRouter from "./routes/verify";
import contactRouter from "./routes/contact";
import uploadRouter from "./routes/upload";
import trustRouter from "./routes/trust";
import platformRouter from "./routes/platform";
import creatorRouter from "./routes/creator";
import cronRouter from "./routes/cron";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet());
app.use(corsMiddleware);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", async (_req, res) => {
  let dbOk = false;
  let dbError: string | undefined;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (error) {
    dbError = error instanceof Error ? error.message : "Database unavailable";
  }

  res.status(200).json({
    ok: true,
    service: "@iopn/api",
    env: process.env.NODE_ENV ?? "development",
    database: dbOk ? "connected" : "disconnected",
    ...(dbError ? { dbError } : {}),
    shared: {
      stakingTiers: Object.keys(STAKING_TIER_LABELS).length,
    },
  });
});

app.use(publicRateLimit);

app.use("/api/tokens", tokensRouter);
app.use("/api/pools", poolsRouter);
app.use("/api/staking", stakingRouter);
app.use("/api/admin", adminRouter);
app.use("/api/user", userRouter);
app.use("/api/launchpool", launchpoolRouter);
app.use("/api/bounties", bountiesRouter);
app.use("/api/liquidity", liquidityRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/announcements", announcementsRouter);
app.use("/api/quests", questsRouter);
app.use("/api/votes", votesRouter);
app.use("/api/watchlist", watchlistRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/verify", verifyRouter);
app.use("/api/contact", contactRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/trust", trustRouter);
app.use("/api/platform", platformRouter);
app.use("/api/creator", creatorRouter);
app.use("/api/cron", cronRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof Error && err.message.startsWith("CORS blocked")) {
    res.status(403).json({ error: err.message });
    return;
  }

  console.error("[api] Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`@iopn/api listening on port ${port}`);
});

export default app;
