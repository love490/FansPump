// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IOPnToken} from "../src/IOPnToken.sol";
import {IOPnTokenFactory} from "../src/IOPnTokenFactory.sol";
import {IIOPnToken} from "../src/interfaces/IIOPnToken.sol";
import {TokenFeatures} from "../src/libraries/TokenFeatures.sol";

contract IOPnTokenTest is Test {
    IOPnTokenFactory factory;
    address admin = makeAddr("admin");
    address creator = makeAddr("creator");

    function setUp() public {
        vm.prank(admin);
        factory = new IOPnTokenFactory(admin);
    }

    function _baseConfig() internal pure returns (IIOPnToken.TokenConfig memory) {
        return IIOPnToken.TokenConfig({
            name: "IOPn Test",
            symbol: "IOT",
            initialSupply: 1_000_000 ether,
            featureFlags: 0,
            maxWalletAmount: 0,
            maxTxAmount: 0,
            buyTaxBps: 0,
            sellTaxBps: 0,
            taxDistribution: IIOPnToken.TaxDistribution({
                marketingWallet: address(0),
                developmentWallet: address(0),
                treasuryWallet: address(0),
                communityWallet: address(0),
                operationsWallet: address(0),
                liquidityWallet: address(0),
                marketingBps: 0,
                developmentBps: 0,
                treasuryBps: 0,
                communityBps: 0,
                operationsBps: 0,
                liquidityBps: 0
            }),
            antiBot: IIOPnToken.AntiBotConfig({
                launchGuardEnabled: false,
                maxLaunchBuy: 0,
                maxLaunchWallet: 0,
                protectionDuration: 0
            }),
            owner: address(0)
        });
    }

  function _requiredFee(uint256 flags) internal view returns (uint256) {
        return factory.calculateCreationFee(flags);
    }

    function _create(IIOPnToken.TokenConfig memory cfg) internal returns (address) {
        vm.deal(creator, 10_000 ether);
        vm.prank(creator);
        return factory.createToken{value: _requiredFee(cfg.featureFlags)}(cfg);
    }

    function test_CreateBasicToken() public {
        IIOPnToken.TokenConfig memory cfg = _baseConfig();
        address tokenAddr = _create(cfg);
        IOPnToken token = IOPnToken(tokenAddr);
        assertEq(token.balanceOf(creator), 1_000_000 ether);
        assertEq(token.featureFlags(), 0);
        assertTrue(factory.isIOPnToken(tokenAddr));
    }

    function test_FeatureFlagsImmutable() public {
        uint256 flags = TokenFeatures.MINTABLE | TokenFeatures.BURNABLE | TokenFeatures.PAUSABLE;
        IIOPnToken.TokenConfig memory cfg = _baseConfig();
        cfg.featureFlags = flags;
        address tokenAddr = _create(cfg);
        IOPnToken token = IOPnToken(tokenAddr);
        assertEq(token.featureFlags(), flags);
    }

    function test_MintableOnlyWhenEnabled() public {
        IIOPnToken.TokenConfig memory cfg = _baseConfig();
        cfg.featureFlags = TokenFeatures.MINTABLE;
        address tokenAddr = _create(cfg);
        IOPnToken token = IOPnToken(tokenAddr);
        vm.prank(creator);
        token.mint(creator, 100 ether);
        assertEq(token.balanceOf(creator), 1_000_000 ether + 100 ether);
    }

    function test_RevertMintWhenNotMintable() public {
        IIOPnToken.TokenConfig memory cfg = _baseConfig();
        address tokenAddr = _create(cfg);
        IOPnToken token = IOPnToken(tokenAddr);
        vm.prank(creator);
        vm.expectRevert();
        token.mint(creator, 100 ether);
    }

    function test_TradingSwitch() public {
        IIOPnToken.TokenConfig memory cfg = _baseConfig();
        cfg.featureFlags = TokenFeatures.TRADING_SWITCH;
        address tokenAddr = _create(cfg);
        IOPnToken token = IOPnToken(tokenAddr);
        assertFalse(token.tradingEnabled());
        address user = makeAddr("user");
        vm.prank(creator);
        token.transfer(user, 100 ether);
        vm.prank(user);
        vm.expectRevert();
        token.transfer(creator, 50 ether);
        vm.prank(creator);
        token.enableTrading();
        vm.prank(user);
        token.transfer(creator, 50 ether);
    }

    function test_RenounceOwnershipIrreversible() public {
        IIOPnToken.TokenConfig memory cfg = _baseConfig();
        cfg.featureFlags = TokenFeatures.MINTABLE;
        address tokenAddr = _create(cfg);
        IOPnToken token = IOPnToken(tokenAddr);
        vm.prank(creator);
        token.renounceOwnership();
        assertTrue(token.isOwnershipRenounced());
        vm.prank(creator);
        vm.expectRevert();
        token.mint(creator, 1 ether);
    }

    function test_TaxMaxFivePercent() public {
        IIOPnToken.TokenConfig memory cfg = _baseConfig();
        cfg.featureFlags = TokenFeatures.TAXABLE;
        cfg.buyTaxBps = 600;
        vm.deal(creator, 10_000 ether);
        vm.prank(creator);
        vm.expectRevert();
        factory.createToken{value: _requiredFee(cfg.featureFlags)}(cfg);
    }

    function test_TaxDistributionMustEqual100() public {
        address wallet = makeAddr("wallet");
        IIOPnToken.TokenConfig memory cfg = _baseConfig();
        cfg.featureFlags = TokenFeatures.TAXABLE;
        cfg.buyTaxBps = 250;
        cfg.sellTaxBps = 250;
        cfg.taxDistribution = IIOPnToken.TaxDistribution({
            marketingWallet: wallet,
            developmentWallet: wallet,
            treasuryWallet: wallet,
            communityWallet: wallet,
            operationsWallet: wallet,
            liquidityWallet: wallet,
            marketingBps: 5000,
            developmentBps: 5000,
            treasuryBps: 0,
            communityBps: 0,
            operationsBps: 0,
            liquidityBps: 0
        });
        _create(cfg);
    }

    function test_CreationFeeTiered() public view {
        assertEq(factory.calculateCreationFee(0), 200 ether);
        assertEq(factory.calculateCreationFee(TokenFeatures.MINTABLE), 250 ether);
        assertEq(
            factory.calculateCreationFee(TokenFeatures.MINTABLE | TokenFeatures.TAXABLE | TokenFeatures.ANTI_BOT),
            390 ether
        );
    }

    function test_FactoryPause() public {
        vm.prank(admin);
        factory.pauseFactory();
        IIOPnToken.TokenConfig memory cfg = _baseConfig();
        vm.deal(creator, 10_000 ether);
        vm.prank(creator);
        vm.expectRevert();
        factory.createToken{value: _requiredFee(cfg.featureFlags)}(cfg);
    }
}
