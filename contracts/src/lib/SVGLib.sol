// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {ScoreLib} from "./ScoreLib.sol";

/// @title  SVGLib
/// @notice Generates fully on-chain SVG + JSON metadata for the Passport NFT.
library SVGLib {
    using Strings for uint256;

    struct PassportMeta {
        uint256 tokenId;
        address owner;
        uint256 score;
        ScoreLib.Tier tier;
        uint256 activityCount;
        uint256 mintedAt;
    }

    function _tierColor(ScoreLib.Tier t) private pure returns (string memory fill, string memory stroke) {
        if (t == ScoreLib.Tier.Gold) return ("#EF9F27", "#BA7517");
        if (t == ScoreLib.Tier.Silver) return ("#5DCAA5", "#1D9E75");
        if (t == ScoreLib.Tier.Bronze) return ("#F0997B", "#D85A30");
        return ("#888780", "#5F5E5A");
    }

    function _shortAddr(address a) private pure returns (string memory) {
        bytes memory b = abi.encodePacked(a);
        bytes memory hex_ = "0123456789abcdef";
        bytes memory result = new bytes(12); // 0x + 4 chars + ...
        result[0] = "0";
        result[1] = "x";
        for (uint i = 0; i < 4; i++) {
            result[2 + i*2] = hex_[uint8(b[i]) >> 4];
            result[2 + i*2 + 1] = hex_[uint8(b[i]) & 0xf];
        }
        result[10] = 0xe2;
        result[11] = 0x80;
        return string(result);
    }

    function render(PassportMeta memory m) internal pure returns (string memory) {
        (string memory fill, string memory stroke) = _tierColor(m.tier);
        string memory tierStr = ScoreLib.tierName(m.tier);
        string memory scoreStr = m.score.toString();
        string memory tokenStr = m.tokenId.toString();
        string memory addrStr = _shortAddr(m.owner);
        string memory actStr = m.activityCount.toString();

        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" width="400" height="240">',
            '<defs>',
            '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">',
            '<stop offset="0%" stop-color="#080d0c"/>',
            '<stop offset="100%" stop-color="#0d1a16"/>',
            '</linearGradient>',
            '<linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">',
            '<stop offset="0%" stop-color="#1D9E75"/>',
            '<stop offset="100%" stop-color="', fill, '"/>',
            '</linearGradient>',
            '</defs>',
            '<rect width="400" height="240" rx="20" fill="url(#bg)"/>',
            '<rect width="400" height="240" rx="20" fill="none" stroke="', stroke, '" stroke-width="1" opacity="0.4"/>',
            // Header
            '<text x="24" y="36" font-family="monospace" font-size="11" fill="', fill, '" opacity="0.5" letter-spacing="2">CHAINPASSPORT</text>',
            '<text x="376" y="36" font-family="monospace" font-size="11" fill="', fill, '" opacity="0.4" text-anchor="end">#', tokenStr, '</text>',
            // Score
            '<text x="24" y="108" font-family="monospace" font-size="64" font-weight="300" fill="', fill, '" letter-spacing="-4">', scoreStr, '</text>',
            '<text x="24" y="126" font-family="monospace" font-size="12" fill="', fill, '" opacity="0.35">/1000</text>',
            // Score bar
            '<rect x="24" y="142" width="352" height="3" rx="1.5" fill="', fill, '" opacity="0.1"/>',
            '<rect x="24" y="142" width="', _barWidth(m.score), '" height="3" rx="1.5" fill="url(#bar)"/>',
            // Tier badge
            '<rect x="24" y="162" width="64" height="22" rx="11" fill="', fill, '" opacity="0.15"/>',
            '<rect x="24" y="162" width="64" height="22" rx="11" fill="none" stroke="', fill, '" stroke-width="0.5" opacity="0.4"/>',
            '<text x="56" y="177" font-family="monospace" font-size="10" font-weight="700" fill="', fill, '" text-anchor="middle">', tierStr, '</text>',
            // Bottom row
            '<text x="24" y="220" font-family="monospace" font-size="10" fill="', fill, '" opacity="0.4">', addrStr, '</text>',
            '<text x="376" y="220" font-family="monospace" font-size="10" fill="', fill, '" opacity="0.4" text-anchor="end">', actStr, ' activities</text>',
            '</svg>'
        ));

        string memory json = string(abi.encodePacked(
            '{"name":"ChainPassport #', tokenStr,
            '","description":"On-chain verified Web3 activity passport.","score":', scoreStr,
            ',"tier":"', tierStr,
            '","activities":', actStr,
            ',"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
        ));

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    function _barWidth(uint256 score) private pure returns (string memory) {
        uint256 w = score * 352 / 1000;
        return w.toString();
    }
}
