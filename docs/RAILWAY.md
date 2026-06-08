# Deploy FansPump Web on Railway

## Project setup

1. Create a project on [Railway](https://railway.app).
2. Connect the GitHub repo (`love490/FansPump`) and deploy from the `main` branch.
3. Add a **PostgreSQL** service (or use an external DB and set `DATABASE_URL`).

Build and start commands are defined in `railway.json` at the repo root:

| Step | Command |
|------|---------|
| Build | `pnpm db:generate && pnpm --filter @iopn/web build` |
| Start | `pnpm --filter @iopn/web start` |
| Node | 22 |

Railway uses Nixpacks and runs from the monorepo root (required for `workspace:*` packages).

## Required environment variables

Set these in Railway → web service → **Variables**:

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | PostgreSQL connection string (Railway Postgres or external) |
| `NEXT_PUBLIC_CHAIN_ID` | `984` for OPNChain Testnet |
| `NEXT_PUBLIC_RPC_URL` | `https://testnet-rpc2.iopn.tech/` |
| `NEXT_PUBLIC_BLOCK_EXPLORER_URL` | `https://testnet.iopn.tech/` |
| `NEXT_PUBLIC_FACTORY_ADDRESS` | Deployed factory |
| `NEXT_PUBLIC_LIQUIDITY_ROUTER_ADDRESS` | Deployed liquidity router |
| `NEXT_PUBLIC_DEX_ROUTER_ADDRESS` | DEX router for swaps |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | [WalletConnect Cloud](https://cloud.walletconnect.com) |
| `ADMIN_WALLET_ADDRESSES` | Comma-separated admin wallets (server) |

Optional image uploads (Cloudflare R2):

| Variable | Notes |
|----------|--------|
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_BUCKET_NAME` | Bucket name |
| `R2_PUBLIC_URL` | Public base URL for uploaded files |

Without R2, token creation still works — image uploads return `{ url: null }`.

See `apps/web/.env.example` for the full list.

## After first deploy

Run schema sync against the production database:

```bash
DATABASE_URL="your-production-url" pnpm db:push
```

## Troubleshooting

- **Build fails on TypeScript** — run `pnpm --filter @iopn/web build` locally and fix errors before pushing.
- **Prisma client missing** — build runs `pnpm db:generate`; ensure `DATABASE_URL` is set (any valid URL works for `generate`).
- **500 on `/api/tokens`** — run `pnpm db:push` on production DB; check Railway logs for Prisma `detail` in API responses.
- **"Database error" / stats show dashes** — Postgres credentials are wrong or stale. In Railway → Postgres → **Connect**, copy the current `DATABASE_URL`, paste it into the **web service** Variables (or use **Add reference** to link Postgres). Redeploy. Update GitHub secret `DATABASE_URL` for CI too.
- **Local dev cannot connect** — do not use `postgres.railway.internal` in `.env.local`; use the **Public Network** URL from Railway.
- **Analytics sync** — after deploy run `pnpm db:push`, set `ANALYTICS_SYNC_SECRET`, and schedule `POST /api/analytics/sync` with `Authorization: Bearer <secret>` (indexes future `SwapExecuted` / `FeeCollected` events when emitted).
- **Workspace packages not found** — deploy from repo root, not `apps/web` alone.
