# Deployment Guide

## 1. Contracts (Foundry)

```bash
cd packages/contracts
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts --no-commit
forge test
export DEPLOYER_PRIVATE_KEY=<key>
export IOPN_RPC_URL=https://testnet-rpc2.iopn.tech/
export IOPN_CHAIN_ID=984
export IOPN_EXPLORER_API_URL=https://testnet.iopn.tech/api
export IOPN_PRIMARY_ROUTER=<uniswap-v2-style-router>  # optional
forge script script/Deploy.s.sol --rpc-url $IOPN_RPC_URL --broadcast
```

Verify:

```bash
chmod +x script/Verify.sh
IOPN_CHAIN_ID=984 ./script/Verify.sh <factory_address> src/IOPnTokenFactory.sol:IOPnTokenFactory
```

## 2. Database

```bash
export DATABASE_URL=postgresql://user:pass@host:5432/iopn_launch
pnpm db:generate
pnpm db:migrate   # or db:push for dev
```

## 3. Frontend (Railway)

Configure environment variables in Railway (see [RAILWAY.md](./RAILWAY.md)) or `apps/web/.env.local` for local dev:

```env
DATABASE_URL=...
NEXT_PUBLIC_CHAIN_ID=984
NEXT_PUBLIC_RPC_URL=https://testnet-rpc2.iopn.tech/
NEXT_PUBLIC_BLOCK_EXPLORER_URL=https://testnet.iopn.tech/
NEXT_PUBLIC_FACTORY_ADDRESS=
NEXT_PUBLIC_LIQUIDITY_ROUTER_ADDRESS=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
VERIFICATION_MESSAGE_PREFIX=IOPn Launch Creator Verification
```

```bash
pnpm build
pnpm --filter @iopn/web start
```

## 4. Production checklist

See [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md).
