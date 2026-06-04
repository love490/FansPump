# Admin Access

IOPn Launch has two admin layers: **platform admin** (off-chain curation) and **factory admin** (on-chain contract control).

## Setup

Add to `apps/web/.env`:

```env
ADMIN_WALLET_ADDRESSES=0xabc...,0xdef...
FACTORY_ADMIN_ADDRESS=0xabc...   # optional; factory deployer wallet
ADMIN_MESSAGE_PREFIX="IOPn Launch Admin Authorization"
```

Restart the dev server after changing env vars.

## Using the admin dashboard

1. Connect a wallet listed in `ADMIN_WALLET_ADDRESSES`
2. Open **Admin** in the nav (link only appears for allowlisted wallets)
3. Click **Sign in as admin** and approve the wallet signature
4. Session lasts **24 hours** (stored in `sessionStorage`)

## What platform admins can do

| Action | Where |
|--------|--------|
| View stats (tokens, users, votes) | `/admin` |
| Feature / unfeature projects | `/admin` → Discovery curation |
| Search registered tokens | `/admin` |

All admin API routes require a valid signed admin message.

## Factory admin (on-chain)

If your wallet matches `FACTORY_ADMIN_ADDRESS` (or the first admin wallet if unset), the dashboard also shows:

- Pause / unpause token creation
- Update creation fee (OPN)
- Update fee recipient

These call the factory contract directly from your wallet (gas required).

## API routes

| Route | Auth | Purpose |
|-------|------|---------|
| `GET /api/admin/check?wallet=` | Public | Returns `{ isAdmin: boolean }` |
| `POST /api/admin/authorize` | Signature | Validates admin sign-in |
| `GET /api/admin/stats` | Signature query | Platform stats |
| `GET /api/admin/tokens` | Signature query | Token list / search |
| `PATCH /api/admin/tokens/[id]` | Signature body | Feature, trending score |

## Security notes

- Never commit real admin addresses to git in production repos — use deployment secrets
- Use a **multisig** as `FACTORY_ADMIN_ADDRESS` on mainnet
- Admin signatures expire after 24 hours to limit replay risk
