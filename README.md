# Autonomous Protocol Garden (Ethereum + Foundry)

A self-sustaining, evolutionary meta-protocol on Ethereum that automatically deploys, funds, monitors, and evolves child DeFi protocols. Successful child protocols pay a percentage of their revenue back to the central Garden treasury, which selectively culls underperformers and mutates parameters toward higher-performing parameter regimes across successive generations.

---

## 1. System Architecture & Lifecycle Loop

The Garden operates in a continuous autonomous closed-loop cycle:

```
    ┌────────────────────────────────────────────────────────┐
    │                 1. GARDEN CORE TREASURY               │
    │         Holds ETH + ERC-20 Reinvestment Capital        │
    └──────────────────────────┬─────────────────────────────┘
                               │ Seeds Initial Capital
                               ▼
    ┌────────────────────────────────────────────────────────┐
    │                 2. AUTONOMOUS FACTORY                  │
    │         Deploys Parameterized Child Protocols          │
    │        (e.g., Simple AMM Pairs, Dynamic Vaults)        │
    └──────────────────────────┬─────────────────────────────┘
                               │
                               ▼
    ┌────────────────────────────────────────────────────────┐
    │                 3. CHILD PROTOCOL EXECUTION             │
    │         Processes Swaps / Deposits / User Activity      │
    │  • Non-Bypassable Fee Splitter locks Garden Share      │
    └──────────────────────────┬─────────────────────────────┘
                               │ Routes Fee Share Back
                               ▼
    ┌────────────────────────────────────────────────────────┐
    │                 4. REVENUE HARVEST & TRACKING          │
    │      Treasury receives revenue · Records child ROI     │
    └──────────────────────────┬─────────────────────────────┘
                               │
                               ▼
    ┌────────────────────────────────────────────────────────┐
    │                 5. ON-CHAIN EVOLUTIONARY STRATEGY      │
    │  • Scores child protocols by Fee Yield & Velocity      │
    │  • Sunsets bottom quartile / underperforming children  │
    │  • Reclaims remaining liquidity back to Garden         │
    │  • Mutates top performer parameters for Gen(N+1)       │
    └──────────────────────────┬─────────────────────────────┘
                               │ Reinvests Treasury Capital
                               └─────────────────────────────┘
```

### Core Components

1. **GardenCore (`src/core/GardenCore.sol`)**
   - Central treasury (native ETH + arbitrary ERC-20 tokens).
   - Registry for authorized child protocol factories.
   - Deploys new children with seed capital.
   - Tracks metrics: `deployedAt`, `seedCapital`, `totalRevenueReturned`, `status` (`Active`, `Paused`, `Sunset`).
   - Executes autonomous epoch evaluations (`evaluateEpoch()`).
   - Managed via 2-step ownership (`Ownable2Step`) ready for DAO governance.

2. **Child Protocol Standard (`src/interfaces/IGardenChild.sol` & `src/base/BaseGardenChild.sol`)**
   - Enforces non-bypassable revenue share via inheritance.
   - Immutable `garden` address set at deployment.
   - Core internal function `_recordAndSplitFee(token, feeAmount)`:
     - Automatically routes `feeShareBps` (e.g. 20%) into `accruedGardenFees[token]`.
     - Increments `totalFeesGenerated[token]`.
   - Pull/Push harvesting via `harvestRevenue(token)`.
   - Access-controlled `emergencyPause()`, `emergencyUnpause()`, and `sunset()`.

3. **Child Protocol Factory (`src/factory/ChildFactory.sol`)**
   - Pluggable factory system supporting multiple protocol types (`SIMPLE_AMM`, `YIELD_VAULT`).
   - Unpacks ABI-encoded parameters and deploys instances.
   - Verifies child integrity and Garden ownership.

4. **Evolutionary Strategy Engine (`src/strategy/EvolutionaryStrategy.sol`)**
   - On-chain genetic optimizer.
   - Scores children: $Score = \frac{TotalRevenue \times 10,000}{SeedCapital + 1}$.
   - Identifies children failing grace period ROI requirements for sunsetting.
   - Generates mutated parameter configurations for the next generation centered around top performers with bounded mutation variance.

---

## 2. Project Directory Structure

```
├── foundry.toml                  # Foundry configuration (Solc ^0.8.24)
├── contracts
│   ├── src
│   │   ├── interfaces
│   │   │   ├── IGardenChild.sol          # Child protocol interface
│   │   │   ├── IGardenCore.sol           # Central Garden interface
│   │   │   ├── IChildFactory.sol         # Child factory interface
│   │   │   └── IEvolutionStrategy.sol    # Genetic strategy interface
│   │   ├── base
│   │   │   └── BaseGardenChild.sol       # Non-bypassable base contract
│   │   ├── core
│   │   │   └── GardenCore.sol            # Treasury & orchestrator
│   │   ├── factory
│   │   │   └── ChildFactory.sol          # Child deployment factory
│   │   ├── strategy
│   │   │   └── EvolutionaryStrategy.sol  # On-chain genetic optimizer
│   │   ├── children
│   │   │   ├── SimpleAMMChild.sol        # Parameterized AMM child
│   │   │   └── YieldVaultChild.sol       # Parameterized Vault child
│   │   └── mocks
│   │       └── MockERC20.sol             # ERC20 mock for tests
│   ├── test
│   │   └── GardenCore.t.sol              # Comprehensive Foundry test suite
│   └── script
│       └── DeployGarden.s.sol            # Production deployment script
```

---

## 3. How to Deploy & Run Tests

### Prerequisites
- [Foundry](https://getfoundry.sh/) (`forge`, `cast`, `anvil`)

### Step 1: Compile the Contracts
```bash
forge build
```

### Step 2: Run the Test Suite
```bash
forge test -vvv
```

### Step 3: Run Gas Benchmarks
```bash
forge test --gas-report
```

### Step 4: Deploy to Sepolia or Mainnet
Set your environment variables in `.env`:
```bash
PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=...
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/...
```

Execute deployment:
```bash
forge script contracts/script/DeployGarden.s.sol:DeployGardenScript \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

---

## 4. How to Add a New Child Protocol Type

To introduce a new protocol type into the Garden (e.g. an orderbook hook, dynamic lending market, or staking pool):

1. **Inherit `BaseGardenChild`**:
   ```solidity
   // SPDX-License-Identifier: MIT
   pragma solidity ^0.8.24;

   import "../base/BaseGardenChild.sol";

   contract MyNewProtocolChild is BaseGardenChild {
       constructor(
           address _garden,
           uint16 _gardenShareBps
       ) BaseGardenChild(_garden, keccak256("MY_NEW_PROTOCOL"), _gardenShareBps) {}

       function executeAction(address token, uint256 grossAmount) external {
           uint256 fee = (grossAmount * 50) / 10000;
           // Mandatory: route fee through base fee splitter
           (uint256 protocolFee, uint256 gardenFee) = _recordAndSplitFee(token, fee);
           _recordVolume(token, grossAmount);
       }

       function sunset(address primaryToken) external override onlyGarden returns (uint256 reclaimed) {
           isSunset = true;
           isActive = false;
           // Liquidate reserves and send remaining balances to garden
           reclaimed = address(this).balance;
           _safeTransfer(primaryToken, garden, reclaimed);
       }
   }
   ```

2. **Register in Factory**:
   Add deployment logic for `keccak256("MY_NEW_PROTOCOL")` in `ChildFactory.sol`.

3. **Register Factory in Garden Core**:
   Call `GardenCore.registerFactory(keccak256("MY_NEW_PROTOCOL"), factoryAddress)`.

4. **Update Strategy Engine**:
   Add gene encoding/mutation logic for the new protocol parameters in `EvolutionaryStrategy.sol`.

---

## 5. Security & Governance Design

- **Non-Bypassable Revenue Share**: Child contracts cannot manipulate or withhold `accruedGardenFees`. State updates happen in internal base methods with reentrancy protection.
- **Garden-Controlled Pausing & Sunsetting**: Only `garden` address can call `emergencyPause()` or `sunset()`. If an experiment exhibits unexpected slippage, negative yield, or exploit behavior, it can be isolated instantly.
- **Two-Step Ownership Transfer**: All governance actions use `transferOwnership` and `acceptOwnership` to eliminate accidental loss of administrative control.
- **DAO Compatible**: The owner of `GardenCore` and `EvolutionaryStrategy` can be seamlessly pointed to a Governor contract (e.g. OpenZeppelin TimelockController + ERC20Votes).

---

## 6. MVP Limitations & Roadmap

1. **Entropy Source**:
   - *Current MVP*: Uses `block.prevrandao` and `block.timestamp` for genetic mutations.
   - *Production Target*: Chainlink VRF or Gelato Web3 Functions for verifiable off-chain randomness or ZK-proven optimization.
2. **Keeper Automation**:
   - *Current MVP*: `evaluateEpoch()` is callable once per `epochInterval` by anyone (with incentives for keepers).
   - *Production Target*: Gelato Automate / Chainlink Automation keeper integration.
3. **Multi-Asset Liquidations**:
   - *Current MVP*: Sunsetting liquidates direct balances held in the child.
   - *Production Target*: Automated Uniswap v3/v4 routing to convert non-standard tokens back to treasury reserve asset (WETH/USDC).
4. **Market Adversarial Conditions**:
   - In production, toxic flow detection and MEV protection hooks should be integrated into AMM child deployments.
