# Deploy FansPump Web on Vercel

## Project settings

| Setting | Value |
|---------|--------|
| Framework | Next.js |
| Root Directory | `apps/web` |
| Include source files outside Root Directory | **Enabled** (required for `workspace:*` packages) |

`apps/web/vercel.json` runs install and build from the monorepo root.

## Required environment variables

Set these in Vercel → Project → Settings → Environment Variables:

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | PostgreSQL connection string (e.g. Neon, Supabase, Vercel Postgres) |
| `NEXT_PUBLIC_CHAIN_ID` | `984` for OPNChain Testnet |
| `NEXT_PUBLIC_RPC_URL` | `https://testnet-rpc2.iopn.tech/` |
| `NEXT_PUBLIC_BLOCK_EXPLORER_URL` | `https://testnet.iopn.tech/` |
| `NEXT_PUBLIC_FACTORY_ADDRESS` | Deployed factory |
| `NEXT_PUBLIC_LIQUIDITY_ROUTER_ADDRESS` | Deployed liquidity router |
| `NEXT_PUBLIC_DEX_ROUTER_ADDRESS` | DEX router for swaps |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | [WalletConnect Cloud](https://cloud.walletconnect.com) |
| `ADMIN_WALLET_ADDRESSES` | Comma-separated admin wallets (server) |

Optional: `NEXT_PUBLIC_USDT_ADDRESS`, `NEXT_PUBLIC_USDC_ADDRESS`, social URLs — see `apps/web/.env.example`.

## After first deploy

Run migrations against production DB (from your machine or CI):

```bash
DATABASE_URL="your-production-url" pnpm db:push
```

## Troubleshooting

- **Build fails on TypeScript** — run `pnpm --filter @iopn/web build` locally and fix errors before pushing.
- **Prisma client missing** — build runs `pnpm db:generate`; ensure `DATABASE_URL` is set (any valid URL works for `generate`).
- **Workspace packages not found** — enable “Include source files outside of Root Directory” and keep Root Directory as `apps/web`.
