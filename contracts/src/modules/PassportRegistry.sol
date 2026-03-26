// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IPassportNFT} from "../interfaces/IPassportNFT.sol";
import {IPassportRegistry} from "../interfaces/IPassportRegistry.sol";
import {FeeVault} from "./FeeVault.sol";

/// @title  PassportRegistry
/// @notice Single source of truth for passport ownership and subscription state.
///         Mint fee + monthly subscription collected here and forwarded to FeeVault.
///         One passport per wallet (enforced). Soulbound via PassportNFT.
contract PassportRegistry is Initializable, AccessControlUpgradeable, UUPSUpgradeable, ReentrancyGuard, IPassportRegistry {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant ROUTER_ROLE = keccak256("ROUTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 constant SUBSCRIPTION_PERIOD = 30 days;
    uint256 constant GRACE_PERIOD = 7 days;

    IPassportNFT public nft;
    FeeVault public feeVault;
    uint256 public minFeeWei;
    uint256 public monthlyFeeWei;

    mapping(address => PassportData) private _passports;
    mapping(uint256 => address) private _tokenOwner;

    uint256[48] private __gap;

    // ============ Events ============
    event SubscriptionRenewed(address user, uint256 tokenId, uint48 expiresAt);
    event PassportMinted(address indexed user, uint256 tokenId, uint256 fee);
    event SubscriptionCancelled(address indexed user, uint256 indexed tokenId);
    event FeesUpdated(uint256 mintFee, uint256 monthlyFee);

    // ============ Errors ============
    error ZeroAddress();
    error AlreadyHasPassport();
    error NoPassport();
    error InsufficientFee();
    error NotPassportOwner();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address admin, address nft_, address payable feeVault_, uint256 minFeeWei_, uint256 monthlyFeeWei_) external initializer {
        if (nft_ == address(0) || feeVault_ == address(0)) revert ZeroAddress();

        __AccessControl_init();

        nft = IPassportNFT(nft_);
        feeVault = FeeVault(feeVault_);
        minFeeWei = minFeeWei_;
        monthlyFeeWei = monthlyFeeWei_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(ROUTER_ROLE, admin);
    }

    // =========== External Functions ============

    function mint() external payable nonReentrant returns (uint256 tokenId) {
        if (_passports[msg.sender].tokenId != 0) revert AlreadyHasPassport();
        if (msg.value < minFeeWei) revert InsufficientFee();

        tokenId = nft.mint(msg.sender);

        uint48 now48 = uint48(block.timestamp);
        uint48 expires48 = uint48(block.timestamp + SUBSCRIPTION_PERIOD);

        _passports[msg.sender] = PassportData({
            tokenId: tokenId,
            mintedAt: now48,
            lastPayment: now48,
            expiresAt: expires48,
            active: true
        });
        _tokenOwner[tokenId] = msg.sender;

        // Forward fee to vault
        _depositFee();

        emit PassportMinted(msg.sender, tokenId, msg.value);
    }

    function renewSubscription() external payable nonReentrant {
        PassportData storage p = _passports[msg.sender];
        if (p.tokenId == 0) revert NoPassport();
        if (msg.value < monthlyFeeWei) revert InsufficientFee();

        uint48 base = p.expiresAt > uint48(block.timestamp) ? p.expiresAt : uint48(block.timestamp);
        p.lastPayment = uint48(block.timestamp);
        p.expiresAt = uint48(uint256(base) + SUBSCRIPTION_PERIOD);
        p.active = true;

        _depositFee();

        emit SubscriptionRenewed(msg.sender, p.tokenId, p.expiresAt);
    }

    function cancelSubscription(uint256 tokenId) external {
        address owner = _tokenOwner[tokenId];
        if (owner != msg.sender && !hasRole(ADMIN_ROLE, msg.sender)) revert NotPassportOwner();
        PassportData storage p = _passports[owner];
        p.active = false;
        emit SubscriptionCancelled(owner, tokenId);
    }

    // ============ View Functions ============
    function passportOf(address user) external view returns (uint256) {
        return _passports[user].tokenId;
    }

    function passportData(address user) external view returns (PassportData memory) {
        return _passports[user];
    }

    function passportDataByToken(uint256 tokenId) external view returns (address) {
        return _tokenOwner[tokenId];
    }

    function isSubscriptionActive(address user) external view returns (bool) {
        PassportData memory p = _passports[user];
        if (!p.active) return false;
        return block.timestamp <= uint256(p.expiresAt) + GRACE_PERIOD;
    }

    function subscriptionExpiresAt(address user) external view returns (uint48) {
        return _passports[user].expiresAt;
    }

    // ============ Admin Functions ============

    function setFees(uint256 mintFee, uint256 monthlyFee) external onlyRole(ADMIN_ROLE) {
        minFeeWei = mintFee;
        monthlyFeeWei = monthlyFee;
        emit FeesUpdated(mintFee, monthlyFee);
    }

    function _depositFee() internal {
        (bool ok, ) = address(feeVault).call{value: msg.value}("");
        if (!ok) revert TransferFailed();
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}