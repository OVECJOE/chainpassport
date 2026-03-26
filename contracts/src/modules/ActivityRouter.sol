// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IActivityAdapter} from "../interfaces/IActivityAdapter.sol";
import {ActivityEmitter} from "./ActivityEmitter.sol";
import {PassportRegistry} from "./PassportRegistry.sol";
import {PartnerRegistry} from "./PartnerRegistry.sol";
import {ScoreLib} from "../lib/ScoreLib.sol";

/// @title  ActivityRouter
/// @notice Entry point for submitting activity to the passport system.
///         1. Looks up adapter for partnerId
///         2. Decodes raw data into normalised fields
///         3. Checks registry: user must have active passport + subscription
///         4. Applies partner multiplier to base points
///         5. Calls ActivityEmitter to emit LOG4
///         6. Updates stored score on PassportRegistry (via ScoreEngine call)
contract ActivityRouter is Initializable, AccessControlUpgradeable, UUPSUpgradeable, ReentrancyGuard {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    PassportRegistry public registry;
    ActivityEmitter public emitter;
    PartnerRegistry public partnerRegistry;

    mapping(uint32 => address) public adapters;

    uint256[46] private __gap;

    // ============ Events ============
    event ActivityRouted(
        address indexed user,
        uint256 indexed tokenId,
        uint32 indexed partnerId,
        uint256 points
    );
    event AdapterSet(uint32 indexed partnerId, address adapter);

    // ============ Errors ============
    error NoPassport();
    error SubscriptionExpired();
    error NoAdapter();
    error PartnerInactive();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        address admin,
        address registry_,
        address emitter_,
        address partnerRegistry_
    ) external initializer {
        __AccessControl_init();

        registry = PassportRegistry(registry_);
        emitter = ActivityEmitter(emitter_);
        partnerRegistry = PartnerRegistry(partnerRegistry_);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    // ================= External Functions ==================

    /// @notice Submit raw activity data for a user.
    /// @param user      Wallet that performed the on-chain action.
    /// @param partnerId Protocol id (must match a registered adapter).
    /// @param data      Raw bytes forwarded to the adapter for decoding.
    function route(address user, uint32 partnerId, bytes calldata data) external nonReentrant onlyRole(OPERATOR_ROLE) returns (uint256 points) {
        // 1. Check passport
        uint256 tokenId = registry.passportOf(user);
        if (tokenId == 0) revert NoPassport();
        if (!registry.isSubscriptionActive(user)) revert SubscriptionExpired();

        // 2. Check partner + adapter
        if (!partnerRegistry.isActive(partnerId)) revert PartnerInactive();
        address adapterAddr = adapters[partnerId];
        if (adapterAddr == address(0)) revert NoAdapter();

        // 3. Decode via adapter
        (uint8 activityType, uint256 value, bytes memory extra) = IActivityAdapter(adapterAddr).decode(user, data);

        // 4. Compute points with partner multiplier
        uint256 basePoints = ScoreLib.pointsFor(activityType);
        uint32 multiplierBps = partnerRegistry.multiplierOf(partnerId);
        points = basePoints * uint256(multiplierBps) / 10_000;

        // 5. Emit LOG4 via ActivityEmitter
        emitter.emitActivity(activityType, user, tokenId, partnerId, value, extra);
        emit ActivityRouted(user, tokenId, partnerId, points);
    }

    /// @notice Convenience: route multiple activities in one tx (gas efficient)
    function routeBatch(address user, uint32[] calldata partnerIds, bytes[] calldata dataArr) external nonReentrant onlyRole(OPERATOR_ROLE) {
        require(partnerIds.length == dataArr.length, "length mismatch");
        uint256 tokenId = registry.passportOf(user);
        if (tokenId == 0) revert NoPassport();
        if (!registry.isSubscriptionActive(user)) revert SubscriptionExpired();

        for (uint i; i < partnerIds.length; i++) {
            uint32 pid = partnerIds[i];
            if (!partnerRegistry.isActive(pid)) continue;
            address adapterAddr = adapters[pid];
            if (adapterAddr == address(0)) continue;

            (uint8 actType, uint256 val, bytes memory extra) = IActivityAdapter(adapterAddr).decode(user, dataArr[i]);
            uint256 pts = ScoreLib.pointsFor(actType) * uint256(partnerRegistry.multiplierOf(pid)) / 10_000;

            emitter.emitActivity(actType, user, tokenId, pid, val, extra);
            emit ActivityRouted(user, tokenId, pid, pts);
        }
    }

    // ================= Admin Functions ==================

    function setAdapter(uint32 partnerId, address adapter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        adapters[partnerId] = adapter;
        emit AdapterSet(partnerId, adapter);
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}