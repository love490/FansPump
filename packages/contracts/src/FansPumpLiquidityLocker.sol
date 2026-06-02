// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title FansPumpLiquidityLocker
/// @notice Simple, non-custodial time-lock for LP tokens.
/// @dev Depositors can withdraw only after unlock time. No admin keys.
contract FansPumpLiquidityLocker is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Lock {
        address lpToken;
        address owner;
        uint256 amount;
        uint64 unlockAt;
        bool withdrawn;
    }

    uint256 public lockCount;
    mapping(uint256 => Lock) public locks;

    event Locked(uint256 indexed lockId, address indexed lpToken, address indexed owner, uint256 amount, uint64 unlockAt);
    event Withdrawn(uint256 indexed lockId, address indexed lpToken, address indexed owner, uint256 amount);

    error InvalidAmount();
    error InvalidUnlock();
    error NotOwner();
    error TooEarly(uint64 unlockAt);
    error AlreadyWithdrawn();

    function lock(address lpToken, uint256 amount, uint64 unlockAt) external nonReentrant returns (uint256 lockId) {
        if (amount == 0) revert InvalidAmount();
        if (unlockAt <= uint64(block.timestamp)) revert InvalidUnlock();

        IERC20(lpToken).safeTransferFrom(msg.sender, address(this), amount);

        lockId = ++lockCount;
        locks[lockId] = Lock({
            lpToken: lpToken,
            owner: msg.sender,
            amount: amount,
            unlockAt: unlockAt,
            withdrawn: false
        });

        emit Locked(lockId, lpToken, msg.sender, amount, unlockAt);
    }

    function withdraw(uint256 lockId) external nonReentrant {
        Lock storage l = locks[lockId];
        if (l.owner != msg.sender) revert NotOwner();
        if (l.withdrawn) revert AlreadyWithdrawn();
        if (uint64(block.timestamp) < l.unlockAt) revert TooEarly(l.unlockAt);

        l.withdrawn = true;
        IERC20(l.lpToken).safeTransfer(msg.sender, l.amount);

        emit Withdrawn(lockId, l.lpToken, msg.sender, l.amount);
    }
}

