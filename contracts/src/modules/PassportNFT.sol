// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import {SVGLib} from "../lib/SVGLib.sol";
import {ScoreLib} from "../lib/ScoreLib.sol";

/// @title  PassportNFT
/// @notice Soulbound ERC-721. One per wallet. Non-transferable after mint.
///         tokenURI is fully on-chain SVG rendered by SVGLib.
///         Metadata (score, tier, activityCount) is written by ScoreEngine
///         so the NFT always reflects live state.
contract PassportNFT is Initializable, ERC721Upgradeable, AccessControlUpgradeable, UUPSUpgradeable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant METADATA_ROLE = keccak256("METADATA_ROLE");

    uint256 private _nextTokenId;

    struct TokenMeta {
        uint256 score;
        uint256 activityCount;
        uint48 mintedAt;
        ScoreLib.Tier tier;
    }

    mapping(uint256 => TokenMeta) private _tokenMeta;

    // Storage gap for future upgrades
    uint256[48] private __gap;

    // ============ Events ============
    event MetadataUpdated(uint256 indexed tokenId, uint256 score, ScoreLib.Tier tier);
    event PassportBurned(uint256 indexed tokenId, address indexed owner);

    // ============ Errors ============
    error Soulbound();
    error NotOwnerOrApproved();
    error TokenDoesNotExist();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(address admin, string memory name_, string memory symbol_) external initializer {
        __ERC721_init(name_, symbol_);
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(METADATA_ROLE, admin);
    }

    // ============ External Functions ============

    function mint(address to) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        _nextTokenId++;
        tokenId = _nextTokenId;
        _safeMint(to, tokenId);
        _tokenMeta[tokenId] = TokenMeta({
            score: 0,
            activityCount: 0,
            mintedAt: uint48(block.timestamp),
            tier: ScoreLib.Tier.Unranked
        });
    }

    function burn(uint256 tokenId) external {
        // OZ v5: _isAuthorized(owner, spender, tokenId)
        address owner = _requireOwned(tokenId);
        if (!_isAuthorized(owner, msg.sender, tokenId)) revert NotOwnerOrApproved();
        emit PassportBurned(tokenId, owner);
        _burn(tokenId);
        delete _tokenMeta[tokenId];
    }

    function updateMeta(uint256 tokenId, uint256 score, uint256 activityCount, ScoreLib.Tier tier) external onlyRole(METADATA_ROLE) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist();
        TokenMeta storage m = _tokenMeta[tokenId];
        m.score = score;
        m.activityCount = activityCount;
        m.tier = tier;
        emit MetadataUpdated(tokenId, score, tier);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist();
        TokenMeta memory m = _tokenMeta[tokenId];
        return SVGLib.render(SVGLib.PassportMeta({
            tokenId:       tokenId,
            owner:         ownerOf(tokenId),
            score:         m.score,
            tier:          m.tier,
            activityCount: m.activityCount,
            mintedAt:      uint256(m.mintedAt)
        }));
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    /// @dev OZ v5 uses _update instead of _beforeTokenTransfer
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address from) {
        from = super._update(to, tokenId, auth);
        // Allow mint (from == 0) and burn (to == 0) only
        if (from != address(0) && to != address(0)) revert Soulbound();
    }

    /// @notice Compatibility shim: OZ v5 removed upgradeTo in favour of upgradeToAndCall.
    function upgradeTo(address newImplementation) public onlyRole(UPGRADER_ROLE) {
        upgradeToAndCall(newImplementation, "");
    }

    function _authorizeUpgrade(address) internal override onlyRole(UPGRADER_ROLE) {}

    function supportsInterface(bytes4 id)
        public view override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(id);
    }
}
