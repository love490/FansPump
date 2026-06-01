# FansPump

Production-grade token launch, discovery, swap, and liquidity onboarding on **OPNChain**.

> Not a DEX · Not a bonding curve · Not a meme coin casino

## Monorepo structure

```
iopn-launch/
├── apps/web/              # Next.js App Router frontend
├── packages/contracts/    # Foundry + Solidity (OpenZeppelin)
├── packages/database/     # Prisma + PostgreSQL
├── packages/shared/       # Shared types & feature flags
├── docs/                  # Architecture, security, deployment
└── .github/workflows/     # CI/CD
```

## Quick start

### Prerequisites

- Node.js 20+
- pnpm 9+
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- PostgreSQL 15+

### Install

```bash
pnpm install
cd packages/contracts && forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts --no-commit
forge build && forge test
cd ../..
cp apps/web/.env.example apps/web/.env
# Set DATABASE_URL, NEXT_PUBLIC_* addresses after deploy
pnpm db:generate
pnpm db:push
pnpm dev
```

### Deploy contracts (OPNChain Testnet)

| Setting | Value |
|---------|--------|
| Network | OPNChain Testnet |
| Chain ID | `984` |
| RPC | `https://testnet-rpc2.iopn.tech/` |
| Currency | OPN |
| Explorer | `https://testnet.iopn.tech/` |

```bash
cd packages/contracts
export DEPLOYER_PRIVATE_KEY=0x...
export IOPN_RPC_URL=https://testnet-rpc2.iopn.tech/
export IOPN_CHAIN_ID=984
forge script script/Deploy.s.sol --rpc-url $IOPN_RPC_URL --broadcast
```

Set `NEXT_PUBLIC_FACTORY_ADDRESS` and `NEXT_PUBLIC_LIQUIDITY_ROUTER_ADDRESS` in `apps/web/.env`.

Configure platform admins — see [docs/ADMIN.md](docs/ADMIN.md).

## Core features

| Area | Capabilities |
|------|----------------|
| **Token creation** | ERC20 via factory, immutable feature flags, metadata |
| **Optional features** | Mintable, burnable, pausable, max wallet/tx, trading switch, tax, anti-bot, lists |
| **Ownership** | Transfer, irreversible renounce |
| **Liquidity** | Approve + add via IOPn primary / Uniswap-compatible router adapter |
| **Discovery** | New, trending, views, holders, updated, featured |
| **Community** | Watchlist, bullish/neutral/bearish votes |
| **Verification** | Sign-message creator badge |

## Security

- ReentrancyGuard, Pausable factory, AccessControl, Ownable tokens
- Immutable on-chain feature flags at deploy
- No rebasing, reflections, hidden mint, auto-liquidity, or delegatecall backdoors
- Hard-coded 5% max buy/sell tax

See [docs/SECURITY.md](docs/SECURITY.md).

## Deploy to Vercel

See [docs/VERCEL.md](docs/VERCEL.md) for Root Directory, env vars, and monorepo settings.

## License

MIT