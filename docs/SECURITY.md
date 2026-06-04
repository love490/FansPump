# Security Model

## Smart contract guarantees

| Control | Implementation |
|---------|----------------|
| Reentrancy | `ReentrancyGuard` on token transfers and liquidity router |
| Pausable | Optional per-token pause; factory-level pause |
| Access control | Factory `DEFAULT_ADMIN_ROLE`, `OPERATOR_ROLE` |
| Ownership | OpenZeppelin `Ownable`; explicit irreversible `renounceOwnership` |
| Feature immutability | `immutable FEATURE_FLAGS` — no setter |
| Tax cap | `MAX_TAX_BPS = 500` enforced in library and constructor |
| Tax allocation | Must equal 100% at deploy |

## Explicit non-features

The platform and token template **do not** include:

- Hidden minting (mint only if `MINTABLE` flag set, owner-only)
- Rebasing
- Reflections
- Auto-liquidity
- Unsafe `delegatecall`
- Owner backdoors beyond declared optional features

## Operational security

- Store `DEPLOYER_PRIVATE_KEY` and `DATABASE_URL` in secrets managers
- Run `forge test` and Slither in CI before mainnet deploy
- Verify all contracts on IOPn explorer after deploy
- Use multisig for factory admin on mainnet

## Audit checklist

- [ ] Feature flag bitmask matches frontend encoding
- [ ] Tax distribution rounding (dust) acceptable to project
- [ ] Pair/router addresses for sell-tax detection (production config)
- [ ] Liquidity router router addresses trusted
- [ ] API rate limiting and SIWE for sensitive mutations
