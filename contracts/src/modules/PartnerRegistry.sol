// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @title  PartnerRegistry
/// @notice Maps uint32 partnerId → protocol metadata and point weight multiplier.
///         ActivityRouter checks this before forwarding activity to emitter.
///         Multiplier is in BPS: 10_000 = 1× (100%), 15_000 = 1.5×.
contract PartnerRegistry is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    struct Partner {
        string name;
        uint32 multiplierBps; // point weight: 10_000 = 1×
        bool active;
    }

    mapping(uint32 => Partner) public _partners;
    uint32[] private _partnerIds;

    uint256[48] private __gap;

    // ============ Events ============
    event PartnerSet(uint32 indexed partnerId, string name, uint32 multiplierBps, bool active);
    event PartnerDeactivated(uint32 indexed partnerId);

    // ============ Errors ============
    error PartnerNotFound();
    error PartnerNotActive();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address admin) external initializer {
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(MANAGER_ROLE, admin);
    }

    // =========== External Functions ============

    function setPartner(uint32 id, string calldata name, uint32 multiplierBps_, bool active) external onlyRole(MANAGER_ROLE) {
        bool isNew = bytes(_partners[id].name).length == 0;
        _partners[id] = Partner({ name: name, multiplierBps: multiplierBps_, active: active });
        if (isNew) _partnerIds.push(id);
        emit PartnerSet(id, name, multiplierBps_, active);
    }

    function deactivate(uint32 id) external onlyRole(MANAGER_ROLE) {
        if (bytes(_partners[id].name).length == 0) revert PartnerNotFound();
        _partners[id].active = false;
        emit PartnerDeactivated(id);
    }

    // =========== View Functions ============

    function getPartner(uint32 id) external view returns (Partner memory) {
        return _partners[id];
    }

    function isActive(uint32 id) external view returns (bool) {
        return _partners[id].active;
    }

    function multiplierOf(uint32 id) external view returns (uint32) {
        if (!_partners[id].active) revert PartnerNotActive();
        return _partners[id].multiplierBps;
    }

    function allPartners() external view returns (uint32[] memory ids, Partner[] memory partners) {
        ids = _partnerIds;
        partners = new Partner[](_partnerIds.length);
        for (uint i = 0; i < _partnerIds.length; ++i) {
            partners[i] = _partners[_partnerIds[i]];
        }
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}
}