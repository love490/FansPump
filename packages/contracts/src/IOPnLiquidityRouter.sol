// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title IOPnLiquidityRouter
/// @notice Future-ready adapter for IOPn primary liquidity + Uniswap-compatible routers.
/// @dev Does not operate a DEX — routes add-liquidity calls to configured platforms.
interface IUniswapV2Router02 {
    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);

    function WETH() external pure returns (address);
}

contract IOPnLiquidityRouter is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev AMM migration prep — not used by current add-liquidity flows.
    struct Pool {
        uint256 reserveA;
        uint256 reserveB;
    }

    /// @dev Off-chain estimate mirror for future AMM migration (does not affect swaps).
    mapping(address => uint256) public poolReserveEstimate;

    address public iopnPrimaryRouter;
    address public uniswapCompatibleRouter;

    event PrimaryRouterUpdated(address indexed router);
    event UniswapRouterUpdated(address indexed router);
    event LiquidityAdded(
        address indexed token,
        address indexed creator,
        address indexed router,
        uint256 tokenAmount,
        uint256 ethAmount,
        uint256 liquidity
    );

    constructor(address admin, address primaryRouter) Ownable(admin) {
        iopnPrimaryRouter = primaryRouter;
    }

    function setPrimaryRouter(address router) external onlyOwner {
        iopnPrimaryRouter = router;
        emit PrimaryRouterUpdated(router);
    }

    function setUniswapCompatibleRouter(address router) external onlyOwner {
        uniswapCompatibleRouter = router;
        emit UniswapRouterUpdated(router);
    }

    /// @dev Future AMM migration hooks — intentionally empty, no swap logic yet.
    function _beforeSwapHook() internal {}
    function _afterSwapHook() internal {}

    /// @notice Admin-only reserve estimate for AMM prep (does not move tokens).
    function setPoolReserveEstimate(address token, uint256 estimate) external onlyOwner {
        poolReserveEstimate[token] = estimate;
    }

    /// @notice Approve token spend then add liquidity via IOPn primary router.
    function addLiquidityViaPrimary(
        address token,
        uint256 tokenAmount,
        uint256 tokenMin,
        uint256 ethMin
    ) external payable nonReentrant returns (uint256 liquidity) {
        require(iopnPrimaryRouter != address(0), "Router: primary not set");
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokenAmount);
        IERC20(token).forceApprove(iopnPrimaryRouter, tokenAmount);

        (uint256 amountToken, uint256 amountETH, uint256 liq) = IUniswapV2Router02(iopnPrimaryRouter)
            .addLiquidityETH{value: msg.value}(token, tokenAmount, tokenMin, ethMin, msg.sender, block.timestamp + 600);

        emit LiquidityAdded(token, msg.sender, iopnPrimaryRouter, amountToken, amountETH, liq);
        return liq;
    }

    /// @notice Add liquidity via Uniswap-compatible router (future-ready).
    function addLiquidityViaUniswap(
        address token,
        uint256 tokenAmount,
        uint256 tokenMin,
        uint256 ethMin
    ) external payable nonReentrant returns (uint256 liquidity) {
        require(uniswapCompatibleRouter != address(0), "Router: uniswap not set");
        IERC20(token).safeTransferFrom(msg.sender, address(this), tokenAmount);
        IERC20(token).forceApprove(uniswapCompatibleRouter, tokenAmount);

        (uint256 amountToken, uint256 amountETH, uint256 liq) = IUniswapV2Router02(uniswapCompatibleRouter)
            .addLiquidityETH{value: msg.value}(token, tokenAmount, tokenMin, ethMin, msg.sender, block.timestamp + 600);

        emit LiquidityAdded(token, msg.sender, uniswapCompatibleRouter, amountToken, amountETH, liq);
        return liq;
    }
}
