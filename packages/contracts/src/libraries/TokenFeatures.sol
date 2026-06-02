// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TokenFeatures
/// @notice Immutable feature flags set at deployment — never modifiable after launch.
library TokenFeatures {
    uint256 internal constant MINTABLE = 1 << 0;
    uint256 internal constant BURNABLE = 1 << 1;
    uint256 internal constant PAUSABLE = 1 << 2;
    uint256 internal constant MAX_WALLET = 1 << 3;
    uint256 internal constant MAX_TX = 1 << 4;
    uint256 internal constant TRADING_SWITCH = 1 << 5;
    uint256 internal constant TAXABLE = 1 << 6;
    uint256 internal constant ANTI_BOT = 1 << 7;
    uint256 internal constant BLACKLIST = 1 << 8;
    uint256 internal constant WHITELIST = 1 << 9;

    uint256 internal constant MAX_TAX_BPS = 500; // 5%

    function has(uint256 flags, uint256 feature) internal pure returns (bool) {
        return flags & feature != 0;
    }

    function validateTaxBps(uint256 bps) internal pure {
        require(bps <= MAX_TAX_BPS, "TokenFeatures: tax exceeds 5%");
    }

    uint256 internal constant FEE_DEFAULT = 0.2 ether;
    uint256 internal constant FEE_TAXABLE = 1 ether;
    uint256 internal constant FEE_ANTI_BOT = 0.5 ether;

    function calculateCreationFee(uint256 flags, uint256 baseFee) internal pure returns (uint256 fee) {
        fee = baseFee;
        if (has(flags, MINTABLE)) fee += FEE_DEFAULT;
        if (has(flags, BURNABLE)) fee += FEE_DEFAULT;
        if (has(flags, PAUSABLE)) fee += FEE_DEFAULT;
        if (has(flags, MAX_WALLET)) fee += FEE_DEFAULT;
        if (has(flags, MAX_TX)) fee += FEE_DEFAULT;
        if (has(flags, TRADING_SWITCH)) fee += FEE_DEFAULT;
        if (has(flags, BLACKLIST)) fee += FEE_DEFAULT;
        if (has(flags, WHITELIST)) fee += FEE_DEFAULT;
        if (has(flags, TAXABLE)) fee += FEE_TAXABLE;
        if (has(flags, ANTI_BOT)) fee += FEE_ANTI_BOT;
    }
}
