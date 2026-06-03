// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IIOPnToken} from "./interfaces/IIOPnToken.sol";
import {TokenFeatures} from "./libraries/TokenFeatures.sol";

/// @title IOPnToken
/// @notice Production ERC20 with immutable optional features for the IOPn ecosystem.
/// @dev No rebasing, reflections, hidden mint, or auto-liquidity. Feature flags locked at deploy.
contract IOPnToken is ERC20, ERC20Burnable, ERC20Pausable, Ownable, ReentrancyGuard, IIOPnToken {
    uint256 public immutable FEATURE_FLAGS;
    uint256 public immutable MAX_WALLET_AMOUNT;
    uint256 public immutable MAX_TX_AMOUNT;
    uint16 public immutable BUY_TAX_BPS;
    uint16 public immutable SELL_TAX_BPS;

    TaxDistribution public TAX_DISTRIBUTION;
    AntiBotConfig public ANTI_BOT_CONFIG;

    bool public tradingEnabled;
    uint256 public launchProtectionEndsAt;

    mapping(address => bool) public isBlacklisted;
    mapping(address => bool) public isWhitelisted;
    mapping(address => uint256) public launchWalletAccumulated;

    address public constant DEAD = address(0xdead);
    bool private _renounced;

    modifier onlyIfFeature(uint256 feature) {
        require(TokenFeatures.has(FEATURE_FLAGS, feature), "IOPnToken: feature disabled");
        _;
    }

    modifier notRenounced() {
        require(!_renounced, "IOPnToken: ownership renounced");
        _;
    }

    modifier whenTradingAllowed(address from, address to) {
        if (TokenFeatures.has(FEATURE_FLAGS, TokenFeatures.TRADING_SWITCH)) {
            require(
                tradingEnabled || from == owner() || to == owner() || from == address(0),
                "IOPnToken: trading disabled"
            );
        }
        _;
    }

    constructor(TokenConfig memory config)
        ERC20(config.name, config.symbol)
        Ownable(config.owner)
    {
        FEATURE_FLAGS = config.featureFlags;
        MAX_WALLET_AMOUNT = config.maxWalletAmount;
        MAX_TX_AMOUNT = config.maxTxAmount;
        BUY_TAX_BPS = config.buyTaxBps;
        SELL_TAX_BPS = config.sellTaxBps;
        TAX_DISTRIBUTION = config.taxDistribution;
        ANTI_BOT_CONFIG = config.antiBot;

        if (TokenFeatures.has(FEATURE_FLAGS, TokenFeatures.TAXABLE)) {
            TokenFeatures.validateTaxBps(config.buyTaxBps);
            TokenFeatures.validateTaxBps(config.sellTaxBps);
            _validateTaxDistribution(config.taxDistribution);
        }

        if (TokenFeatures.has(FEATURE_FLAGS, TokenFeatures.ANTI_BOT) && config.antiBot.launchGuardEnabled) {
            launchProtectionEndsAt = block.timestamp + config.antiBot.protectionDuration;
        }

        if (TokenFeatures.has(FEATURE_FLAGS, TokenFeatures.TRADING_SWITCH)) {
            tradingEnabled = false;
        } else {
            tradingEnabled = true;
        }

        _mint(config.owner, config.initialSupply);
    }

    function featureFlags() external view override returns (uint256) {
        return FEATURE_FLAGS;
    }

    function isOwnershipRenounced() external view returns (bool) {
        return _renounced;
    }

    // --- Ownership ---

    function transferOwnership(address newOwner)
        public
        override(Ownable)
        onlyOwner
        notRenounced
    {
        address previousOwner = owner();
        super.transferOwnership(newOwner);
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function renounceOwnership() public override onlyOwner notRenounced {
        _renounced = true;
        address previous = owner();
        super.renounceOwnership();
        emit OwnershipRenounced(previous);
    }

    // --- Trading switch ---

    function enableTrading() external onlyOwner onlyIfFeature(TokenFeatures.TRADING_SWITCH) notRenounced {
        require(!tradingEnabled, "IOPnToken: already enabled");
        tradingEnabled = true;
        emit TradingEnabledUpdated(true);
    }

    // --- Mint (optional) ---

    function mint(address to, uint256 amount)
        external
        onlyOwner
        onlyIfFeature(TokenFeatures.MINTABLE)
        notRenounced
    {
        _mint(to, amount);
    }

    // --- Pause (optional) ---

    function pause() external onlyOwner onlyIfFeature(TokenFeatures.PAUSABLE) notRenounced {
        _pause();
    }

    function unpause() external onlyOwner onlyIfFeature(TokenFeatures.PAUSABLE) notRenounced {
        _unpause();
    }

    // --- Lists ---

    function setBlacklist(address account, bool status)
        external
        onlyOwner
        onlyIfFeature(TokenFeatures.BLACKLIST)
        notRenounced
    {
        isBlacklisted[account] = status;
    }

    function setWhitelist(address account, bool status)
        external
        onlyOwner
        onlyIfFeature(TokenFeatures.WHITELIST)
        notRenounced
    {
        isWhitelisted[account] = status;
    }

    // --- Internal hooks ---

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
        nonReentrant
        whenTradingAllowed(from, to)
    {
        if (from != address(0) && to != address(0)) {
            _enforceLists(from, to);
            _enforceLimits(from, to, value);
            _enforceAntiBot(from, to, value);
        }

        if (
            TokenFeatures.has(FEATURE_FLAGS, TokenFeatures.TAXABLE)
            && from != address(0)
            && to != address(0)
            && !_isExcludedFromTax(from, to)
        ) {
            _transferWithTax(from, to, value);
        } else {
            super._update(from, to, value);
        }
    }

    function _enforceLists(address from, address to) internal view {
        if (TokenFeatures.has(FEATURE_FLAGS, TokenFeatures.BLACKLIST)) {
            require(!isBlacklisted[from] && !isBlacklisted[to], "IOPnToken: blacklisted");
        }
        if (TokenFeatures.has(FEATURE_FLAGS, TokenFeatures.WHITELIST)) {
            require(
                isWhitelisted[from] || isWhitelisted[to] || from == owner() || to == owner(),
                "IOPnToken: not whitelisted"
            );
        }
    }

    function _enforceLimits(address from, address to, uint256 value) internal view {
        if (TokenFeatures.has(FEATURE_FLAGS, TokenFeatures.MAX_TX) && from != owner() && to != owner()) {
            require(value <= MAX_TX_AMOUNT, "IOPnToken: exceeds max tx");
        }
        if (TokenFeatures.has(FEATURE_FLAGS, TokenFeatures.MAX_WALLET) && to != owner() && to != address(0)) {
            require(balanceOf(to) + value <= MAX_WALLET_AMOUNT, "IOPnToken: exceeds max wallet");
        }
    }

    function _enforceAntiBot(address from, address to, uint256 value) internal {
        if (!TokenFeatures.has(FEATURE_FLAGS, TokenFeatures.ANTI_BOT)) return;
        if (!ANTI_BOT_CONFIG.launchGuardEnabled) return;
        if (block.timestamp > launchProtectionEndsAt) return;
        if (from == owner() || to == owner()) return;

        // Buy side: from pair/router detection simplified — non-owner sending to buyer
        if (from != owner() && to != owner()) {
            require(value <= ANTI_BOT_CONFIG.maxLaunchBuy, "IOPnToken: exceeds max launch buy");
            uint256 newAccum = launchWalletAccumulated[to] + value;
            require(newAccum <= ANTI_BOT_CONFIG.maxLaunchWallet, "IOPnToken: exceeds max launch wallet");
            launchWalletAccumulated[to] = newAccum;
        }
    }

    function _isExcludedFromTax(address from, address to) internal view returns (bool) {
        return from == owner() || to == owner();
    }

    function _transferWithTax(address from, address to, uint256 value) internal {
        uint16 taxBps = _isSell(from, to) ? SELL_TAX_BPS : BUY_TAX_BPS;
        if (taxBps == 0) {
            super._update(from, to, value);
            return;
        }

        uint256 taxAmount = (value * taxBps) / 10_000;
        uint256 sendAmount = value - taxAmount;

        super._update(from, to, sendAmount);
        if (taxAmount > 0) {
            _distributeTax(from, taxAmount);
        }
    }

    function _isSell(address from, address /* to */) internal pure returns (bool) {
        // Simplified: transfers from non-owner EOA to another are treated as sells when taxable
        // Production deployments should pass pair addresses at deploy; factory stores them off-chain
        return from != address(0);
    }

    function _distributeTax(address from, uint256 taxAmount) internal {
        TaxDistribution memory dist = TAX_DISTRIBUTION;
        uint256 remaining = taxAmount;

        remaining -= _sendTaxPortion(from, dist.marketingWallet, dist.marketingBps, taxAmount, remaining);
        remaining -= _sendTaxPortion(from, dist.developmentWallet, dist.developmentBps, taxAmount, remaining);
        remaining -= _sendTaxPortion(from, dist.treasuryWallet, dist.treasuryBps, taxAmount, remaining);
        remaining -= _sendTaxPortion(from, dist.communityWallet, dist.communityBps, taxAmount, remaining);
        remaining -= _sendTaxPortion(from, dist.operationsWallet, dist.operationsBps, taxAmount, remaining);
        _sendTaxPortion(from, dist.liquidityWallet, dist.liquidityBps, taxAmount, remaining);
    }

    function _sendTaxPortion(
        address from,
        address wallet,
        uint16 bps,
        uint256 taxAmount,
        uint256 /* remaining */
    ) internal returns (uint256 sent) {
        if (bps == 0 || wallet == address(0)) return 0;
        sent = (taxAmount * bps) / 10_000;
        if (sent > 0) {
            super._update(from, wallet, sent);
        }
    }

    function _validateTaxDistribution(TaxDistribution memory dist) internal pure {
        uint256 total = uint256(dist.marketingBps) + dist.developmentBps + dist.treasuryBps + dist.communityBps
            + dist.operationsBps + dist.liquidityBps;
        require(total == 10_000, "IOPnToken: tax allocation must equal 100%");
    }

    function burn(uint256 amount) public override onlyIfFeature(TokenFeatures.BURNABLE) {
        super.burn(amount);
    }

    function burnFrom(address account, uint256 amount) public override onlyIfFeature(TokenFeatures.BURNABLE) {
        super.burnFrom(account, amount);
    }
}
