# Production Deployment Checklist

## Pre-deploy

- [ ] All Foundry tests pass (`forge test`)
- [ ] Contract bytecode diff reviewed
- [ ] Admin keys in multisig (not EOA hot wallet)
- [ ] `IOPN_PRIMARY_ROUTER` address validated on-chain
- [ ] PostgreSQL backups and connection pooling configured
- [ ] `DATABASE_URL` uses SSL
- [ ] WalletConnect project ID production domain allowlist

## Deploy

- [ ] Deploy `IOPnTokenFactory` and `IOPnLiquidityRouter`
- [ ] Verify contracts on block explorer
- [ ] Set factory/router addresses in frontend env
- [ ] Run Prisma migrations on production DB
- [ ] Smoke test: create token on test wallet
- [ ] Smoke test: discovery API returns data
- [ ] Smoke test: creator verification signature

## Post-deploy

- [ ] Monitor factory `TokenCreated` events → indexer or webhook to DB
- [ ] Set up error tracking (Sentry) on Next.js
- [ ] Rate limit `/api/*` routes
- [ ] CDN for static assets and image uploads (S3/R2 if using custom upload)
- [ ] Document immutability warning for end users
- [ ] Schedule third-party audit before high-value TVL

## Security

- [ ] No secrets in git
- [ ] CORS and CSP headers configured
- [ ] Renounce ownership UI requires explicit confirmation (implemented)
- [ ] CI green on default branch
