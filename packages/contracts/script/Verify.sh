#!/usr/bin/env bash
set -euo pipefail

# Usage: ./script/Verify.sh <contract_address> <contract_path>
# Requires: IOPN_EXPLORER_API_KEY, IOPN_EXPLORER_API_URL, IOPN_RPC_URL

CONTRACT_ADDRESS="${1:?Contract address required}"
CONTRACT_PATH="${2:?Contract path required e.g. src/IOPnTokenFactory.sol:IOPnTokenFactory}"

forge verify-contract \
  --chain-id "${IOPN_CHAIN_ID:-984}" \
  --watch \
  --etherscan-api-key "${IOPN_EXPLORER_API_KEY}" \
  --verifier-url "${IOPN_EXPLORER_API_URL}" \
  "${CONTRACT_ADDRESS}" \
  "${CONTRACT_PATH}"
