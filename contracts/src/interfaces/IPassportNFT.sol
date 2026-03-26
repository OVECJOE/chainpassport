// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

interface IPassportNFT {
    function mint(address to) external returns (uint256 tokenId);
    function burn(uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function totalSupply() external view returns (uint256);
    function tokenURI(uint256 tokenId) external view returns (string memory);
    function MINTER_ROLE() external view returns (bytes32);
    function grantRole(bytes32 role, address account) external;
}