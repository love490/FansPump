// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IIOPnToken {
    struct TaxDistribution {
        address marketingWallet;
        address developmentWallet;
        address treasuryWallet;
        address communityWallet;
        address operationsWallet;
        address liquidityWallet;
        uint16 marketingBps;
        uint16 developmentBps;
        uint16 treasuryBps;
        uint16 communityBps;
        uint16 operationsBps;
        uint16 liquidityBps;
    }

    struct AntiBotConfig {
        bool launchGuardEnabled;
        uint256 maxLaunchBuy;
        uint256 maxLaunchWallet;
        uint256 protectionDuration;
    }

    struct TokenConfig {
        string name;
        string symbol;
        uint256 initialSupply;
        uint256 featureFlags;
        uint256 maxWalletAmount;
        uint256 maxTxAmount;
        uint16 buyTaxBps;
        uint16 sellTaxBps;
        TaxDistribution taxDistribution;
        AntiBotConfig antiBot;
        address owner;
    }

    function featureFlags() external view returns (uint256);
    function tradingEnabled() external view returns (bool);
    function launchProtectionEndsAt() external view returns (uint256);

    event TradingEnabledUpdated(bool enabled);
    event OwnershipRenounced(address indexed previousOwner);
    event TokenDeployed(address indexed token, address indexed creator, uint256 featureFlags);
}
