// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title  FeeVault
/// @notice Accumulates mint + subscription fees in ETH.
///         Admin can sweep to treasury at any time.
///         Separate from Registry so fee logic can be upgraded independently.
contract FeeVault is Initializable, AccessControlUpgradeable, UUPSUpgradeable, ReentrancyGuard {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant DEPOSITOR_ROLE = keccak256("DEPOSITOR_ROLE");
    bytes32 public constant SWEEPER_ROLE = keccak256("SWEEPER_ROLE");

    address payable public treasury;

    uint256 public totalDeposited;
    uint256 public totalWithdrawn;

    uint256[47] private __gap;

    // ============ Events ============
    event Deposited(address indexed from, uint256 amount, string reason);
    event Swept(address indexed to, uint256 amount);
    event TreasuryUpdated(address indexed prev, address indexed next);

    // ============ Errors ============
    error ZeroAddress();
    error ZeroAmount();
    error TransferFailed();
    error InsufficientBalance();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address admin, address payable treasury_) external initializer {
        if (treasury_ == address(0)) revert ZeroAddress();

        __AccessControl_init();

        treasury = treasury_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(SWEEPER_ROLE, admin);
    }

    // ============ External Functions ============

    /// @notice Called by PassportRegistry on mint/renewal
    function deposit(string calldata reason) external payable onlyRole(DEPOSITOR_ROLE) {
        if (msg.value == 0) revert ZeroAmount();
        totalDeposited += msg.value;
        emit Deposited(msg.sender, msg.value, reason);
    }

    /// @notice Sweep accumulated ETH to treasury.
    function sweep() external nonReentrant onlyRole(SWEEPER_ROLE) {
        uint256 bal = address(this).balance;
        if (bal == 0) revert InsufficientBalance();

        totalWithdrawn += bal;
        (bool success, ) = treasury.call{value: bal}("");
        if (!success) revert TransferFailed();

        emit Swept(treasury, bal);
    }

    /// @notice Sweep a specific amount.
    function sweepAmount(uint256 amount) external nonReentrant onlyRole(SWEEPER_ROLE) {
        if (amount == 0) revert ZeroAmount();
        if (address(this).balance < amount) revert InsufficientBalance();
        totalWithdrawn += amount;
        (bool success, ) = treasury.call{value: amount}("");
        if (!success) revert TransferFailed();
        emit Swept(treasury, amount);
    }

    function setTreasury(address payable next) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (next == address(0)) revert ZeroAddress();
        emit TreasuryUpdated(treasury, next);
        treasury = next;
    }

    function balance() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {
        totalDeposited += msg.value;
        emit Deposited(msg.sender, msg.value, "direct");
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}
