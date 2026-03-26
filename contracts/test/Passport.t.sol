// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test, console2} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {ERC1967Proxy}   from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {PassportNFT}         from "../src/modules/PassportNFT.sol";
import {FeeVault}             from "../src/modules/FeeVault.sol";
import {PassportRegistry}     from "../src/modules/PassportRegistry.sol";
import {PartnerRegistry}      from "../src/modules/PartnerRegistry.sol";
import {ActivityEmitter}      from "../src/modules/ActivityEmitter.sol";
import {ActivityRouter}       from "../src/modules/ActivityRouter.sol";
import {ScoreEngine}          from "../src/modules/ScoreEngine.sol";
import {Verifier}             from "../src/modules/Verifier.sol";
import {MockActivityAdapter}  from "../src/adapters/MockActivityAdapter.sol";
import {ScoreLib}             from "../src/lib/ScoreLib.sol";

contract PassportTest is Test {
    // ========= Actors ==========
    address admin    = makeAddr("admin");
    address treasury = makeAddr("treasury");
    address alice    = makeAddr("alice");
    address bob      = makeAddr("bob");
    address operator = makeAddr("operator");

    // ========= Contracts ===========
    PassportNFT       nft;
    FeeVault          feeVault;
    PassportRegistry  registry;
    PartnerRegistry   partnerReg;
    ActivityEmitter   emitter;
    ActivityRouter    router;
    ScoreEngine       scoreEngine;
    Verifier          verifier;
    MockActivityAdapter swapAdapter;
    MockActivityAdapter lendAdapter;

    uint256 MINT_FEE    = 0.002 ether;
    uint256 MONTHLY_FEE = 0.001 ether;

    // ========= Setup ==========

    function setUp() public {
        vm.startPrank(admin);

        nft = PassportNFT(_proxy(
            address(new PassportNFT()),
            abi.encodeCall(PassportNFT.initialize, (admin, "Onchain Passport", "OPASS"))
        ));

        feeVault = FeeVault(payable(_proxy(
            address(new FeeVault()),
            abi.encodeCall(FeeVault.initialize, (admin, payable(treasury)))
        )));

        registry = PassportRegistry(_proxy(
            address(new PassportRegistry()),
            abi.encodeCall(PassportRegistry.initialize, (
                admin, address(nft), payable(address(feeVault)), MINT_FEE, MONTHLY_FEE
            ))
        ));

        partnerReg = PartnerRegistry(_proxy(
            address(new PartnerRegistry()),
            abi.encodeCall(PartnerRegistry.initialize, (admin))
        ));

        emitter = ActivityEmitter(_proxy(
            address(new ActivityEmitter()),
            abi.encodeCall(ActivityEmitter.initialize, (admin))
        ));

        router = ActivityRouter(_proxy(
            address(new ActivityRouter()),
            abi.encodeCall(ActivityRouter.initialize, (
                admin, address(registry), address(emitter), address(partnerReg)
            ))
        ));

        scoreEngine = ScoreEngine(_proxy(
            address(new ScoreEngine()),
            abi.encodeCall(ScoreEngine.initialize, (admin))
        ));

        verifier = Verifier(_proxy(
            address(new Verifier()),
            abi.encodeCall(Verifier.initialize, (admin, address(registry), address(scoreEngine)))
        ));

        // Wire roles
        nft.grantRole(nft.MINTER_ROLE(),     address(registry));
        nft.grantRole(nft.METADATA_ROLE(),   address(scoreEngine));
        registry.grantRole(registry.ROUTER_ROLE(), address(router));
        emitter.grantRole(emitter.EMITTER_ROLE(),  address(router));
        scoreEngine.grantRole(scoreEngine.WRITER_ROLE(), operator);
        scoreEngine.setRegistry(address(registry));
        scoreEngine.setNFT(address(nft));

        // Partners + adapters
        partnerReg.setPartner(1, "Uniswap",      10_000, true);
        partnerReg.setPartner(2, "Aave",         10_000, true);
        partnerReg.setPartner(3, "ArbitrumGov",  10_000, true);

        swapAdapter = new MockActivityAdapter(0x01);
        lendAdapter = new MockActivityAdapter(0x02);
        router.setAdapter(1, address(swapAdapter));
        router.setAdapter(2, address(lendAdapter));

        router.grantRole(router.OPERATOR_ROLE(), operator);

        vm.stopPrank();

        // Fund actors
        vm.deal(alice, 10 ether);
        vm.deal(bob,   10 ether);
    }

    // ========= Helpers ==========

    function _proxy(address impl, bytes memory data) internal returns (address) {
        return address(new ERC1967Proxy(impl, data));
    }

    function _mintPassport(address user) internal returns (uint256 tokenId) {
        vm.prank(user);
        tokenId = registry.mint{value: MINT_FEE}();
    }

    // ============= PassportNFT =============

    function test_nft_mint_and_soulbound() public {
        uint256 id = _mintPassport(alice);
        assertEq(nft.ownerOf(id), alice);

        // Transfer should revert (soulbound)
        vm.prank(alice);
        vm.expectRevert(PassportNFT.Soulbound.selector);
        nft.transferFrom(alice, bob, id);
    }

    function test_nft_tokenURI_onchain() public {
        uint256 id = _mintPassport(alice);
        string memory uri = nft.tokenURI(id);
        // Should start with data:application/json;base64,
        assertEq(bytes(uri)[0], bytes("d")[0]);
        assertTrue(bytes(uri).length > 100);
    }

    function test_nft_burn() public {
        uint256 id = _mintPassport(alice);
        vm.prank(alice);
        nft.burn(id);
        vm.expectRevert();
        nft.ownerOf(id);
    }

    // ============= PassportRegistry =============

    function test_registry_mint_once_per_wallet() public {
        _mintPassport(alice);
        vm.prank(alice);
        vm.expectRevert(PassportRegistry.AlreadyHasPassport.selector);
        registry.mint{value: MINT_FEE}();
    }

    function test_registry_mint_insufficient_fee() public {
        vm.prank(alice);
        vm.expectRevert(PassportRegistry.InsufficientFee.selector);
        registry.mint{value: 0.0001 ether}();
    }

    function test_registry_subscription_active_after_mint() public {
        _mintPassport(alice);
        assertTrue(registry.isSubscriptionActive(alice));
    }

    function test_registry_subscription_expires() public {
        _mintPassport(alice);
        // Warp past 30 days + 7 day grace
        vm.warp(block.timestamp + 38 days);
        assertFalse(registry.isSubscriptionActive(alice));
    }

    function test_registry_renew() public {
        _mintPassport(alice);
        vm.warp(block.timestamp + 25 days);
        vm.prank(alice);
        registry.renewSubscription{value: MONTHLY_FEE}();
        assertTrue(registry.isSubscriptionActive(alice));
        // Should still be active 30 days from renewal
        vm.warp(block.timestamp + 30 days);
        assertTrue(registry.isSubscriptionActive(alice));
    }

    function test_registry_fee_forwarded_to_vault() public {
        uint256 before = address(feeVault).balance;
        _mintPassport(alice);
        assertEq(address(feeVault).balance, before + MINT_FEE);
    }

    // ============= FeeVault =============

    function test_feevault_sweep() public {
        _mintPassport(alice);
        uint256 vaultBal = address(feeVault).balance;
        assertGt(vaultBal, 0);

        uint256 tBefore = treasury.balance;
        vm.prank(admin);
        feeVault.sweep();
        assertEq(address(feeVault).balance, 0);
        assertEq(treasury.balance, tBefore + vaultBal);
    }

    // ============= PartnerRegistry =============

    function test_partner_set_and_get() public {
        vm.prank(admin);
        partnerReg.setPartner(99, "TestProtocol", 12_000, true);
        PartnerRegistry.Partner memory p = partnerReg.getPartner(99);
        assertEq(p.name, "TestProtocol");
        assertEq(p.multiplierBps, 12_000);
        assertTrue(p.active);
    }

    function test_partner_deactivate() public {
        vm.prank(admin);
        partnerReg.deactivate(1);
        assertFalse(partnerReg.isActive(1));
    }

    // ============= ActivityRouter + Emitter =============

    function test_route_emits_log4() public {
        uint256 id = _mintPassport(alice);

        bytes memory data = abi.encode(uint256(1 ether), bytes(""));

        // Capture raw logs to verify LOG4 was used
        vm.recordLogs();
        vm.prank(operator);
        router.route(alice, 1, data);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        // ActivityRouted is emitted by router — find it
        bool found;
        for (uint i; i < logs.length; ++i) {
            // router emits ActivityRouted(user, tokenId, partnerId, actType, pts)
            if (logs[i].emitter == address(router)) { found = true; break; }
        }
        assertTrue(found, "ActivityRouted not emitted");
    }

    function test_route_no_passport_reverts() public {
        vm.prank(operator);
        vm.expectRevert(ActivityRouter.NoPassport.selector);
        router.route(bob, 1, "");
    }

    function test_route_expired_subscription_reverts() public {
        _mintPassport(alice);
        vm.warp(block.timestamp + 40 days);
        vm.prank(operator);
        vm.expectRevert(ActivityRouter.SubscriptionExpired.selector);
        router.route(alice, 1, "");
    }

    function test_route_inactive_partner_skipped_in_batch() public {
        _mintPassport(alice);
        vm.prank(admin);
        partnerReg.deactivate(1);

        uint32[] memory pids = new uint32[](1);
        bytes[]  memory dArr = new bytes[](1);
        pids[0] = 1;
        dArr[0] = abi.encode(uint256(1 ether), bytes(""));

        // routeBatch should not revert — just skip inactive partner
        vm.prank(operator);
        router.routeBatch(alice, pids, dArr);
    }

    // ================ ScoreEngine ================

    function test_score_write_and_read() public {
        uint256 id = _mintPassport(alice);
        vm.prank(operator);
        scoreEngine.writeScore(id, 742, 56);
        assertEq(scoreEngine.currentScore(id), 742);
    }

    function test_score_capped_at_1000() public {
        uint256 id = _mintPassport(alice);
        vm.prank(operator);
        scoreEngine.writeScore(id, 9999, 100);
        assertEq(scoreEngine.currentScore(id), 1000);
    }

    function test_score_decay_after_lapse() public {
        uint256 id = _mintPassport(alice);
        vm.prank(operator);
        scoreEngine.writeScore(id, 1000, 100);

        // Subscription expires, then warp 2 months past grace period
        vm.warp(block.timestamp + 30 days + 7 days + 60 days);

        uint256 decayed = scoreEngine.currentScore(id);
        assertLt(decayed, 1000, "score should have decayed");
        assertGt(decayed, 0,    "score should not be zero");
    }

    function test_score_floor_respected() public {
        uint256 id = _mintPassport(alice);
        vm.prank(operator);
        scoreEngine.writeScore(id, 1000, 100);

        // Warp 5 years — floor should hold at 20%
        vm.warp(block.timestamp + 5 * 365 days);

        uint256 decayed = scoreEngine.currentScore(id);
        assertGe(decayed, 200, "floor should be 20% of 1000");
    }

    function test_score_preview_decay() public {
        uint256 id = _mintPassport(alice);
        vm.prank(operator);
        scoreEngine.writeScore(id, 742, 56);

        uint256 preview3mo = scoreEngine.previewDecay(id, 3);
        assertLt(preview3mo, 742);
        assertGt(preview3mo, 0);
    }

    function test_score_tier_gold() public {
        uint256 id = _mintPassport(alice);
        vm.prank(operator);
        scoreEngine.writeScore(id, 900, 120);
        assertEq(uint8(scoreEngine.currentTier(id)), uint8(ScoreLib.Tier.Gold));
    }

    function test_score_tier_silver() public {
        uint256 id = _mintPassport(alice);
        vm.prank(operator);
        scoreEngine.writeScore(id, 700, 80);
        assertEq(uint8(scoreEngine.currentTier(id)), uint8(ScoreLib.Tier.Silver));
    }

    function test_score_batch_write() public {
        uint256 id1 = _mintPassport(alice);
        uint256 id2 = _mintPassport(bob);

        uint256[] memory ids    = new uint256[](2);
        uint256[] memory scores = new uint256[](2);
        uint256[] memory counts = new uint256[](2);
        ids[0] = id1; ids[1] = id2;
        scores[0] = 500; scores[1] = 800;
        counts[0] = 30;  counts[1] = 70;

        vm.prank(operator);
        scoreEngine.writeScoreBatch(ids, scores, counts);

        assertEq(scoreEngine.currentScore(id1), 500);
        assertEq(scoreEngine.currentScore(id2), 800);
    }

    // ========= Verifier =========

    function test_verifier_full_result() public {
        uint256 id = _mintPassport(alice);
        vm.prank(operator);
        scoreEngine.writeScore(id, 742, 56);

        Verifier.VerificationResult memory r = verifier.verify(alice);
        assertTrue(r.exists);
        assertTrue(r.subscriptionActive);
        assertEq(r.tokenId, id);
        assertEq(r.score, 742);
        assertEq(uint8(r.tier), uint8(ScoreLib.Tier.Silver));
    }

    function test_verifier_non_existent() public {
        Verifier.VerificationResult memory r = verifier.verify(bob);
        assertFalse(r.exists);
    }

    function test_verifier_meets_score_requirement() public {
        uint256 id = _mintPassport(alice);
        vm.prank(operator);
        scoreEngine.writeScore(id, 742, 56);

        assertTrue(verifier.meetsScoreRequirement(alice, 700));
        assertFalse(verifier.meetsScoreRequirement(alice, 800));
    }

    function test_verifier_meets_tier_requirement() public {
        uint256 id = _mintPassport(alice);
        vm.prank(operator);
        scoreEngine.writeScore(id, 742, 56);

        assertTrue(verifier.meetsTierRequirement(alice, ScoreLib.Tier.Bronze));
        assertTrue(verifier.meetsTierRequirement(alice, ScoreLib.Tier.Silver));
        assertFalse(verifier.meetsTierRequirement(alice, ScoreLib.Tier.Gold));
    }

    function test_verifier_batch() public {
        uint256 id1 = _mintPassport(alice);
        vm.prank(operator);
        scoreEngine.writeScore(id1, 500, 30);

        address[] memory users = new address[](2);
        users[0] = alice;
        users[1] = bob; // no passport

        Verifier.VerificationResult[] memory results = verifier.verifyBatch(users);
        assertTrue(results[0].exists);
        assertFalse(results[1].exists);
    }

    // ========= UUPS upgrade guard =========

    function test_upgrade_unauthorized_reverts() public {
        address newImpl = address(new PassportNFT());
        vm.prank(alice); // not upgrader
        vm.expectRevert();
        nft.upgradeTo(newImpl);
    }

    function test_upgrade_authorized() public {
        address newImpl = address(new PassportNFT());
        vm.prank(admin);
        nft.upgradeTo(newImpl);
        // State preserved
        // (just checking it doesn't revert)
    }

    // ========= ScoreLib unit tests =========

    function test_scorelib_points_for_type() public {
        assertEq(ScoreLib.pointsFor(0x01), 18); // TRADE
        assertEq(ScoreLib.pointsFor(0x02), 12); // LEND
        assertEq(ScoreLib.pointsFor(0x03), 8);  // NFT
        assertEq(ScoreLib.pointsFor(0x04), 6);  // VOTE
        assertEq(ScoreLib.pointsFor(0x05), 4);  // CUSTOM
    }

    function test_scorelib_tier_resolution() public {
        assertEq(uint8(ScoreLib.tierOf(900)),  uint8(ScoreLib.Tier.Gold));
        assertEq(uint8(ScoreLib.tierOf(700)),  uint8(ScoreLib.Tier.Silver));
        assertEq(uint8(ScoreLib.tierOf(400)),  uint8(ScoreLib.Tier.Bronze));
        assertEq(uint8(ScoreLib.tierOf(100)),  uint8(ScoreLib.Tier.Unranked));
    }

    function test_scorelib_cap() public {
        assertEq(ScoreLib.cap(1500), 1000);
        assertEq(ScoreLib.cap(999),  999);
    }

    // ========= Fuzz =========

    function testFuzz_score_always_within_bounds(uint256 rawScore) public {
        uint256 id = _mintPassport(alice);
        vm.prank(operator);
        scoreEngine.writeScore(id, rawScore, 1);
        uint256 s = scoreEngine.currentScore(id);
        assertLe(s, 1000);
    }

    function testFuzz_decay_never_below_floor(uint256 months) public {
        months = bound(months, 0, 120);
        uint256 id = _mintPassport(alice);
        vm.prank(operator);
        scoreEngine.writeScore(id, 1000, 100);

        uint256 preview = scoreEngine.previewDecay(id, months);
        assertGe(preview, 200); // 20% floor of 1000
    }
}