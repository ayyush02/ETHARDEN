// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/core/GardenCore.sol";
import "../src/factory/ChildFactory.sol";
import "../src/strategy/EvolutionaryStrategy.sol";
import "../src/children/SimpleAMMChild.sol";
import "../src/children/YieldVaultChild.sol";
import "../src/mocks/MockERC20.sol";

// Minimal Forge-std Test interface for standard Foundry compatibility
abstract contract Test {
    address internal constant VM_ADDRESS = address(uint160(uint256(keccak256("hevm cheat code"))));

    event log(string);
    event log_named_uint(string key, uint256 val);
    event log_named_address(string key, address val);

    function assertTrue(bool condition) internal pure {
        require(condition, "ASSERT_TRUE_FAILED");
    }

    function assertFalse(bool condition) internal pure {
        require(!condition, "ASSERT_FALSE_FAILED");
    }

    function assertEq(uint256 a, uint256 b) internal pure {
        require(a == b, "ASSERT_EQ_UINT_FAILED");
    }

    function assertEq(address a, address b) internal pure {
        require(a == b, "ASSERT_EQ_ADDR_FAILED");
    }

    function assertGt(uint256 a, uint256 b) internal pure {
        require(a > b, "ASSERT_GT_FAILED");
    }
}

/**
 * @title GardenCoreTest
 * @notice Comprehensive Foundry test suite for the Autonomous Protocol Garden.
 * @dev Covers deployment, treasury accounting, non-bypassable revenue collection,
 *      lifecycle transitions (pause, sunset), and evolutionary parameter optimization.
 */
contract GardenCoreTest is Test {
    GardenCore public garden;
    ChildFactory public ammFactory;
    ChildFactory public vaultFactory;
    EvolutionaryStrategy public strategy;

    MockERC20 public tokenA;
    MockERC20 public tokenB;

    address public dao = address(0xD40);
    address public trader = address(0x78A);
    address public keeper = address(0x4EE);

    bytes32 public constant SIMPLE_AMM_TYPE = keccak256("SIMPLE_AMM");
    bytes32 public constant YIELD_VAULT_TYPE = keccak256("YIELD_VAULT");

    function setUp() public {
        // 1. Deploy test tokens
        tokenA = new MockERC20("Token A", "TKNA", 18);
        tokenB = new MockERC20("Token B", "TKNB", 18);

        // 2. Deploy Strategy & Garden Core
        strategy = new EvolutionaryStrategy(dao);
        garden = new GardenCore(dao, address(strategy));

        // 3. Deploy Factories
        ammFactory = new ChildFactory(SIMPLE_AMM_TYPE);
        vaultFactory = new ChildFactory(YIELD_VAULT_TYPE);

        // 4. Register Factories in Garden (called by DAO)
        // Simulate DAO call
        garden.registerFactory(SIMPLE_AMM_TYPE, address(ammFactory));
        garden.registerFactory(YIELD_VAULT_TYPE, address(vaultFactory));

        // 5. Seed Garden Treasury
        tokenA.mint(address(garden), 1_000_000 ether);
        tokenB.mint(address(garden), 1_000_000 ether);

        // Fund trader
        tokenA.mint(trader, 50_000 ether);
        tokenB.mint(trader, 50_000 ether);
    }

    // ==========================================
    // Test 1: Child Deployment & Seeding
    // ==========================================

    function test_DeployChildAMM() public {
        uint16 swapFeeBps = 30; // 0.30%
        uint16 gardenShareBps = 2000; // 20%

        bytes memory initParams = abi.encode(
            address(tokenA),
            address(tokenB),
            swapFeeBps,
            gardenShareBps
        );

        uint256 seedAmount = 10_000 ether;

        address child = garden.deployChild(
            SIMPLE_AMM_TYPE,
            initParams,
            0,
            address(tokenA),
            seedAmount
        );

        assertTrue(child != address(0));
        assertEq(garden.getActiveChildren().length, 1);
        assertEq(garden.getActiveChildren()[0], child);

        IGardenCore.ChildRecord memory record = garden.getChildRecord(child);
        assertEq(record.childAddress, child);
        assertEq(record.seedCapital, seedAmount);
        assertEq(record.seedToken, address(tokenA));
        assertTrue(record.status == IGardenCore.ChildStatus.Active);
    }

    // ==========================================
    // Test 2: Revenue Share Collection & Non-Bypassability
    // ==========================================

    function test_RevenueShareCollection() public {
        // Deploy child AMM with 100 bps (1%) swap fee and 2500 (25%) Garden share
        uint16 swapFeeBps = 100;
        uint16 gardenShareBps = 2500;

        bytes memory initParams = abi.encode(
            address(tokenA),
            address(tokenB),
            swapFeeBps,
            gardenShareBps
        );

        address child = garden.deployChild(
            SIMPLE_AMM_TYPE,
            initParams,
            0,
            address(tokenA),
            10_000 ether
        );

        SimpleAMMChild amm = SimpleAMMChild(payable(child));

        // Add liquidity: 10,000 tokenA and 10,000 tokenB
        tokenA.mint(address(this), 10_000 ether);
        tokenB.mint(address(this), 10_000 ether);
        tokenA.approve(child, 10_000 ether);
        tokenB.approve(child, 10_000 ether);
        amm.addLiquidity(10_000 ether, 10_000 ether);

        // Trader performs swap of 1,000 tokenA
        tokenA.mint(address(this), 1_000 ether);
        tokenA.approve(child, 1_000 ether);

        uint256 gardenBalBefore = tokenA.balanceOf(address(garden));
        amm.swap(address(tokenA), 1_000 ether, 1, address(this));

        // Total fee = 1% of 1,000 = 10 tokenA
        // Garden share = 25% of 10 = 2.5 tokenA (2500000000000000000)
        assertEq(amm.totalFeesGenerated(address(tokenA)), 10 ether);
        assertEq(amm.accruedGardenFees(address(tokenA)), 2.5 ether);

        // Harvest revenue share to Garden
        uint256 harvested = garden.harvestChildRevenue(child, address(tokenA));
        assertEq(harvested, 2.5 ether);

        uint256 gardenBalAfter = tokenA.balanceOf(address(garden));
        assertEq(gardenBalAfter - gardenBalBefore, 2.5 ether);

        // Accrued fees should be zeroed
        assertEq(amm.accruedGardenFees(address(tokenA)), 0);
        assertEq(amm.totalFeesPaidToGarden(address(tokenA)), 2.5 ether);
    }

    // ==========================================
    // Test 3: Pausing Child Protocols
    // ==========================================

    function test_PauseAndUnpauseChild() public {
        bytes memory initParams = abi.encode(
            address(tokenA),
            address(tokenB),
            uint16(30),
            uint16(2000)
        );

        address child = garden.deployChild(
            SIMPLE_AMM_TYPE,
            initParams,
            0,
            address(tokenA),
            1_000 ether
        );

        SimpleAMMChild amm = SimpleAMMChild(payable(child));
        assertTrue(amm.isActive());

        // Pause child via Garden
        garden.pauseChild(child);
        assertFalse(amm.isActive());

        IGardenCore.ChildRecord memory record = garden.getChildRecord(child);
        assertTrue(record.status == IGardenCore.ChildStatus.Paused);

        // Unpause child
        garden.unpauseChild(child);
        assertTrue(amm.isActive());
    }

    // ==========================================
    // Test 4: Sunsetting Underperforming Children & Capital Reclamation
    // ==========================================

    function test_SunsetChildAndReclaimCapital() public {
        bytes memory initParams = abi.encode(
            address(tokenA),
            address(tokenB),
            uint16(50),
            uint16(2000)
        );

        uint256 seed = 5_000 ether;
        address child = garden.deployChild(
            SIMPLE_AMM_TYPE,
            initParams,
            0,
            address(tokenA),
            seed
        );

        SimpleAMMChild amm = SimpleAMMChild(payable(child));

        // Add pair liquidity
        tokenA.mint(address(this), 5_000 ether);
        tokenB.mint(address(this), 5_000 ether);
        tokenA.approve(child, 5_000 ether);
        tokenB.approve(child, 5_000 ether);
        amm.addLiquidity(5_000 ether, 5_000 ether);

        // Sunset child
        uint256 gardenTokenABefore = tokenA.balanceOf(address(garden));
        uint256 reclaimed = garden.sunsetChild(child);

        assertGt(reclaimed, 0);
        assertTrue(amm.isSunset());
        assertFalse(amm.isActive());

        // Verify active list no longer includes child
        assertEq(garden.getActiveChildren().length, 0);
        assertEq(garden.getAllChildren().length, 1);

        uint256 gardenTokenAAfter = tokenA.balanceOf(address(garden));
        assertEq(gardenTokenAAfter - gardenTokenABefore, reclaimed);
    }

    // ==========================================
    // Test 5: Treasury Accounting & Reinvestment
    // ==========================================

    function test_TreasuryAccounting() public {
        uint256 depositAmt = 50_000 ether;
        tokenA.mint(address(this), depositAmt);
        tokenA.approve(address(garden), depositAmt);

        uint256 before = garden.treasuryBalance(address(tokenA));
        garden.depositTreasury(address(tokenA), depositAmt);
        uint256 afterBal = garden.treasuryBalance(address(tokenA));

        assertEq(afterBal - before, depositAmt);
    }

    // ==========================================
    // Test 6: Evolutionary Strategy Parameter Mutation
    // ==========================================

    function test_EvolutionaryPlanning() public {
        // Deploy a top performing child
        bytes memory initParams = abi.encode(
            address(tokenA),
            address(tokenB),
            uint16(60), // 0.60%
            uint16(2500) // 25%
        );

        address child = garden.deployChild(
            SIMPLE_AMM_TYPE,
            initParams,
            0,
            address(tokenA),
            1_000 ether
        );

        // Query next generation proposals
        IEvolutionStrategy.DeploymentProposal[] memory proposals = strategy.planNextGeneration(
            address(garden),
            10_000 ether,
            3
        );

        assertEq(proposals.length, 3);
        for (uint256 i = 0; i < proposals.length; i++) {
            assertEq(proposals[i].childType, SIMPLE_AMM_TYPE);
            assertGt(proposals[i].seedCapital, 0);
        }
    }
}
