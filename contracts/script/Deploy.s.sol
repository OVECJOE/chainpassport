// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script, console2} from "forge-std/Script.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {PassportNFT} from "src/modules/PassportNFT.sol";
import {FeeVault} from "src/modules/FeeVault.sol";
import {PassportRegistry} from "src/modules/PassportRegistry.sol";
import {PartnerRegistry} from "src/modules/PartnerRegistry.sol";
import {ActivityEmitter} from "src/modules/ActivityEmitter.sol";
import {ActivityRouter} from "src/modules/ActivityRouter.sol";
import {ScoreEngine} from "src/modules/ScoreEngine.sol";
import {Verifier} from "src/modules/Verifier.sol";
import {AaveAdapter} from "src/adapters/AaveAdapter.sol";
import {UniswapV3Adapter} from "src/adapters/UniswapV3Adapter.sol";

contract DeployPassport is Script {
    uint256 internal mintFeeWei = 0.002 ether;
    uint256 internal monthlyFeeWei = 0.001 ether;

    function _deployProxy(
        address implementation,
        bytes memory initCall
    ) internal returns (address) {
        return address(new ERC1967Proxy(implementation, initCall));
    }

    function run() external {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");
        address admin = vm.addr(deployerPk);
        address treasury = vm.envOr("TREASURY", admin);

        vm.startBroadcast(deployerPk);

        PassportNFT nft = PassportNFT(
            _deployProxy(
                address(new PassportNFT()),
                abi.encodeCall(
                    PassportNFT.initialize,
                    (admin, "Onchain Passport", "OPASS")
                )
            )
        );

        FeeVault feeVault = FeeVault(
            payable(
                _deployProxy(
                    address(new FeeVault()),
                    abi.encodeCall(
                        FeeVault.initialize,
                        (admin, payable(treasury))
                    )
                )
            )
        );

        PassportRegistry registry = PassportRegistry(
            _deployProxy(
                address(new PassportRegistry()),
                abi.encodeCall(
                    PassportRegistry.initialize,
                    (
                        admin,
                        address(nft),
                        payable(address(feeVault)),
                        mintFeeWei,
                        monthlyFeeWei
                    )
                )
            )
        );

        PartnerRegistry partnerRegistry = PartnerRegistry(
            _deployProxy(
                address(new PartnerRegistry()),
                abi.encodeCall(PartnerRegistry.initialize, (admin))
            )
        );

        ActivityEmitter emitter = ActivityEmitter(
            _deployProxy(
                address(new ActivityEmitter()),
                abi.encodeCall(ActivityEmitter.initialize, (admin))
            )
        );

        ActivityRouter router = ActivityRouter(
            _deployProxy(
                address(new ActivityRouter()),
                abi.encodeCall(
                    ActivityRouter.initialize,
                    (
                        admin,
                        address(registry),
                        address(emitter),
                        address(partnerRegistry)
                    )
                )
            )
        );

        ScoreEngine scoreEngine = ScoreEngine(
            _deployProxy(
                address(new ScoreEngine()),
                abi.encodeCall(ScoreEngine.initialize, (admin))
            )
        );

        Verifier verifier = Verifier(
            _deployProxy(
                address(new Verifier()),
                abi.encodeCall(
                    Verifier.initialize,
                    (admin, address(registry), address(scoreEngine))
                )
            )
        );

        nft.grantRole(nft.MINTER_ROLE(), address(registry));
        registry.grantRole(registry.ROUTER_ROLE(), address(router));
        emitter.grantRole(emitter.EMITTER_ROLE(), address(router));

        partnerRegistry.setPartner(1, "Uniswap", 10_000, true);
        partnerRegistry.setPartner(2, "Aave", 10_000, true);
        partnerRegistry.setPartner(3, "ArbitrumGov", 10_000, true);

        UniswapV3Adapter swapAdapter = new UniswapV3Adapter(1);
        AaveAdapter lendAdapter = new AaveAdapter(2);

        router.setAdapter(1, address(swapAdapter));
        router.setAdapter(2, address(lendAdapter));
        // router.setAdapter(3, address(govAdapter));

        vm.stopBroadcast();

        console2.log("PassportNFT:", address(nft));
        console2.log("FeeVault:", address(feeVault));
        console2.log("PassportRegistry:", address(registry));
        console2.log("PartnerRegistry:", address(partnerRegistry));
        console2.log("ActivityEmitter:", address(emitter));
        console2.log("ActivityRouter:", address(router));
        console2.log("ScoreEngine:", address(scoreEngine));
        console2.log("Verifier:", address(verifier));
        console2.log("SwapAdapter:", address(swapAdapter));
        console2.log("LendAdapter:", address(lendAdapter));
        // console2.log("GovAdapter:", address(govAdapter));
    }
}
