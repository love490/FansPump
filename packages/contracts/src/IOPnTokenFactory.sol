// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IOPnToken} from "./IOPnToken.sol";
import {IIOPnToken} from "./interfaces/IIOPnToken.sol";
import {TokenFeatures} from "./libraries/TokenFeatures.sol";

/// @title IOPnTokenFactory
/// @notice Deploys IOPnToken instances with permanently locked feature configuration.
contract IOPnTokenFactory is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    address[] public allTokens;
    mapping(address => bool) public isIOPnToken;
    mapping(address => address) public tokenCreator;

    uint256 public baseCreationFee;
    address public feeRecipient;

    event FactoryPaused(address indexed account);
    event FactoryUnpaused(address indexed account);
    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 featureFlags,
        uint256 initialSupply
    );

    event CreationFeeUpdated(uint256 fee);
    event FeeRecipientUpdated(address indexed recipient);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        feeRecipient = admin;
        baseCreationFee = 200 ether;
    }

    function calculateCreationFee(uint256 featureFlags) public view returns (uint256) {
        return TokenFeatures.calculateCreationFee(featureFlags, baseCreationFee);
    }

    function setBaseCreationFee(uint256 fee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        baseCreationFee = fee;
        emit CreationFeeUpdated(fee);
    }

    /** @dev Alias for backwards compatibility with admin tooling. */
    function setCreationFee(uint256 fee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        setBaseCreationFee(fee);
    }

    function creationFee() external view returns (uint256) {
        return baseCreationFee;
    }

    function setFeeRecipient(address recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(recipient != address(0), "Factory: zero recipient");
        feeRecipient = recipient;
        emit FeeRecipientUpdated(recipient);
    }

    function tokenCount() external view returns (uint256) {
        return allTokens.length;
    }

    function createToken(IIOPnToken.TokenConfig calldata config)
        external
        payable
        nonReentrant
        whenNotPaused
        returns (address token)
    {
        require(msg.value >= calculateCreationFee(config.featureFlags), "Factory: insufficient fee");
        if (msg.value > 0) {
            (bool sent,) = feeRecipient.call{value: msg.value}("");
            require(sent, "Factory: fee transfer failed");
        }

        require(bytes(config.name).length > 0, "Factory: empty name");
        require(bytes(config.symbol).length > 0, "Factory: empty symbol");
        require(config.initialSupply > 0, "Factory: zero supply");
        _validateFeatureConfig(config);

        IIOPnToken.TokenConfig memory cfg = config;
        cfg.owner = msg.sender;

        IOPnToken deployed = new IOPnToken(cfg);
        token = address(deployed);

        allTokens.push(token);
        isIOPnToken[token] = true;
        tokenCreator[token] = msg.sender;

        emit TokenCreated(token, msg.sender, config.name, config.symbol, config.featureFlags, config.initialSupply);
        emit IIOPnToken.TokenDeployed(token, msg.sender, config.featureFlags);
    }

    function pauseFactory() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
        emit FactoryPaused(msg.sender);
    }

    function unpauseFactory() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
        emit FactoryUnpaused(msg.sender);
    }

    function _validateFeatureConfig(IIOPnToken.TokenConfig calldata config) internal pure {
        if (TokenFeatures.has(config.featureFlags, TokenFeatures.MAX_WALLET)) {
            require(config.maxWalletAmount > 0, "Factory: max wallet required");
        }
        if (TokenFeatures.has(config.featureFlags, TokenFeatures.MAX_TX)) {
            require(config.maxTxAmount > 0, "Factory: max tx required");
        }
        if (TokenFeatures.has(config.featureFlags, TokenFeatures.TAXABLE)) {
            TokenFeatures.validateTaxBps(config.buyTaxBps);
            TokenFeatures.validateTaxBps(config.sellTaxBps);
        }
        if (TokenFeatures.has(config.featureFlags, TokenFeatures.ANTI_BOT)) {
            require(
                !config.antiBot.launchGuardEnabled
                    || (config.antiBot.maxLaunchBuy > 0 && config.antiBot.maxLaunchWallet > 0),
                "Factory: invalid anti-bot"
            );
        }
    }
}
