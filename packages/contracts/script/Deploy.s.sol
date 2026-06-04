// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IOPnTokenFactory} from "../src/IOPnTokenFactory.sol";
import {IOPnLiquidityRouter} from "../src/IOPnLiquidityRouter.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address primaryRouter = vm.envOr("IOPN_PRIMARY_ROUTER", address(0));

        vm.startBroadcast(deployerPrivateKey);

        IOPnTokenFactory factory = new IOPnTokenFactory(deployer);
        IOPnLiquidityRouter liquidityRouter =
            new IOPnLiquidityRouter(deployer, primaryRouter);

        vm.stopBroadcast();

        console2.log("IOPnTokenFactory:", address(factory));
        console2.log("IOPnLiquidityRouter:", address(liquidityRouter));
        console2.log("Deployer:", deployer);
    }
}