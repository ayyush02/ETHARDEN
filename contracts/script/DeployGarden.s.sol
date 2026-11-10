// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/core/GardenCore.sol";
import "../src/factory/ChildFactory.sol";
import "../src/strategy/EvolutionaryStrategy.sol";
import "../src/children/SimpleAMMChild.sol";
import "../src/children/YieldVaultChild.sol";
import "../src/mocks/MockERC20.sol";

// Minimal Script interface for Foundry compatibility
abstract contract Script {
    function vm_startBroadcast() internal virtual {}
    function vm_stopBroadcast() internal virtual {}
}

/**
 * @title DeployGardenScript
 * @notice Production deployment script for the Autonomous Protocol Garden ecosystem.
 * @dev Usage: forge script script/DeployGarden.s.sol:DeployGardenScript --rpc-url <RPC> --broadcast --verify
 */
contract DeployGardenScript is Script {
    bytes32 public constant SIMPLE_AMM_TYPE = keccak256("SIMPLE_AMM");
    bytes32 public constant YIELD_VAULT_TYPE = keccak256("YIELD_VAULT");

    function run() external returns (
        GardenCore garden,
        EvolutionaryStrategy strategy,
        ChildFactory ammFactory,
        ChildFactory vaultFactory,
        MockERC20 tokenA,
        MockERC20 tokenB
    ) {
        address deployer = msg.sender;

        // 1. Deploy test tokens if deploying on local / testnet
        tokenA = new MockERC20("Garden Synthetic USD", "gUSD", 18);
        tokenB = new MockERC20("Garden Synthetic ETH", "gETH", 18);

        // 2. Deploy Evolutionary Strategy Engine
        strategy = new EvolutionaryStrategy(deployer);

        // 3. Deploy Garden Core Treasury & Meta-Protocol
        garden = new GardenCore(deployer, address(strategy));

        // 4. Deploy Child Protocol Factories
        ammFactory = new ChildFactory(SIMPLE_AMM_TYPE);
        vaultFactory = new ChildFactory(YIELD_VAULT_TYPE);

        // 5. Register Factories into Garden Core
        garden.registerFactory(SIMPLE_AMM_TYPE, address(ammFactory));
        garden.registerFactory(YIELD_VAULT_TYPE, address(vaultFactory));

        // 6. Seed Treasury with initial capital
        tokenA.mint(address(garden), 500_000 ether);
        tokenB.mint(address(garden), 500_000 ether);

        // 7. Seed Generation 0 Alpha AMM Experiment:
        //    Swap Fee = 30 bps (0.30%), Garden Fee Share = 2000 bps (20%)
        bytes memory gen0AMMParams = abi.encode(
            address(tokenA),
            address(tokenB),
            uint16(30),
            uint16(2000)
        );

        garden.deployChild(
            SIMPLE_AMM_TYPE,
            gen0AMMParams,
            0,
            address(tokenA),
            25_000 ether
        );

        // 8. Seed Generation 0 Beta Vault Experiment:
        //    Deposit Fee = 25 bps (0.25%), Performance Fee = 1500 bps (15%), Garden Share = 2500 bps (25%)
        bytes memory gen0VaultParams = abi.encode(
            address(tokenA),
            uint16(25),
            uint16(1500),
            uint16(2500)
        );

        garden.deployChild(
            YIELD_VAULT_TYPE,
            gen0VaultParams,
            0,
            address(tokenA),
            10_000 ether
        );
    }
}
