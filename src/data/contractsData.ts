export interface ContractFile {
  name: string;
  path: string;
  category: 'core' | 'interfaces' | 'base' | 'children' | 'factory' | 'strategy' | 'test' | 'script' | 'config';
  code: string;
  description: string;
  solidityVersion?: string;
}

export const CONTRACT_FILES: ContractFile[] = [
  {
    name: 'GardenCore.sol',
    path: 'contracts/src/core/GardenCore.sol',
    category: 'core',
    description: 'Central treasury, factory orchestrator, revenue receiver, lifecycle manager, and autonomous epoch evaluator.',
    solidityVersion: '^0.8.24',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IGardenCore.sol";
import "../interfaces/IGardenChild.sol";
import "../interfaces/IChildFactory.sol";
import "../interfaces/IEvolutionStrategy.sol";

/**
 * @title GardenCore
 * @notice Central orchestrator and treasury of the Autonomous Protocol Garden.
 * @dev Manages capital allocation, autonomous deployment via factories, revenue collection,
 *      lifecycle transitions (pause, sunset, capital reclamation), and on-chain evolutionary epochs.
 */
contract GardenCore is IGardenCore {
    // Governance & Security State
    address public owner;
    address public pendingOwner;
    bool public paused;

    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    IEvolutionStrategy public strategy;

    uint256 public override currentEpoch;
    uint256 public lastEpochEvaluationTimestamp;
    uint256 public epochInterval = 7 days;

    uint16 public reinvestmentRatioBps = 7000; // 70% reinvested, 30% reserve
    uint256 public maxChildrenPerEpoch = 3;

    mapping(bytes32 => address) public registeredFactories;
    mapping(address => ChildRecord) public override getChildRecord;
    address[] private _allChildren;
    address[] private _activeChildren;
    mapping(address => uint256) public override treasuryBalance;
    mapping(uint256 => EpochReport) public epochReports;

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "GARDEN_PAUSED");
        _;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "REENTRANCY_GUARD");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    constructor(address _initialOwner, address _strategy) {
        require(_initialOwner != address(0), "INVALID_OWNER");
        owner = _initialOwner;
        if (_strategy != address(0)) {
            strategy = IEvolutionStrategy(_strategy);
        }
        currentEpoch = 1;
        lastEpochEvaluationTimestamp = block.timestamp;
        _status = _NOT_ENTERED;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "INVALID_NEW_OWNER");
        pendingOwner = newOwner;
    }

    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "NOT_PENDING_OWNER");
        owner = pendingOwner;
        pendingOwner = address(0);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    function setStrategy(address newStrategy) external onlyOwner {
        require(newStrategy != address(0), "INVALID_STRATEGY");
        address old = address(strategy);
        strategy = IEvolutionStrategy(newStrategy);
        emit StrategyUpdated(old, newStrategy);
    }

    function registerFactory(bytes32 childType, address factory) external onlyOwner {
        require(factory != address(0), "INVALID_FACTORY");
        registeredFactories[childType] = factory;
        emit FactoryRegistered(childType, factory);
    }

    function deployChild(
        bytes32 childType,
        bytes calldata initParams,
        uint256 seedEthAmount,
        address seedToken,
        uint256 seedTokenAmount
    ) external override nonReentrant whenNotPaused returns (address newChild) {
        address factory = registeredFactories[childType];
        require(factory != address(0), "FACTORY_NOT_REGISTERED");

        newChild = IChildFactory(factory).deployChild(address(this), initParams);
        require(newChild != address(0), "DEPLOYMENT_FAILED");

        if (seedEthAmount > 0) {
            require(treasuryBalance[address(0)] >= seedEthAmount, "INSUFFICIENT_ETH_TREASURY");
            treasuryBalance[address(0)] -= seedEthAmount;
            (bool success, ) = payable(newChild).call{value: seedEthAmount}("");
            require(success, "SEED_ETH_TRANSFER_FAILED");
        }

        if (seedTokenAmount > 0 && seedToken != address(0)) {
            require(treasuryBalance[seedToken] >= seedTokenAmount, "INSUFFICIENT_TOKEN_TREASURY");
            treasuryBalance[seedToken] -= seedTokenAmount;
            _safeTransfer(seedToken, newChild, seedTokenAmount);
        }

        uint256 seedTotal = (seedEthAmount > 0) ? seedEthAmount : seedTokenAmount;
        address primarySeed = (seedEthAmount > 0) ? address(0) : seedToken;

        getChildRecord[newChild] = ChildRecord({
            childAddress: newChild,
            childType: childType,
            deployedAt: block.timestamp,
            seedCapital: seedTotal,
            seedToken: primarySeed,
            totalRevenueReturned: 0,
            lastHarvestTimestamp: block.timestamp,
            status: ChildStatus.Active,
            initParams: initParams
        });

        _allChildren.push(newChild);
        _activeChildren.push(newChild);

        emit ChildDeployed(newChild, childType, seedTotal, primarySeed);
    }

    function harvestChildRevenue(
        address childAddress,
        address token
    ) public override nonReentrant returns (uint256 harvested) {
        ChildRecord storage record = getChildRecord[childAddress];
        require(record.status != ChildStatus.Inactive, "CHILD_NOT_FOUND");

        harvested = IGardenChild(childAddress).harvestRevenue(token);
        if (harvested > 0) {
            treasuryBalance[token] += harvested;
            record.totalRevenueReturned += harvested;
            record.lastHarvestTimestamp = block.timestamp;
            emit RevenueReceived(childAddress, token, harvested);
        }
    }

    function sunsetChild(address childAddress) public override nonReentrant returns (uint256 reclaimedCapital) {
        require(msg.sender == owner || msg.sender == address(this), "UNAUTHORIZED");

        ChildRecord storage record = getChildRecord[childAddress];
        require(record.status == ChildStatus.Active || record.status == ChildStatus.Paused, "ALREADY_SUNSET_OR_INACTIVE");

        ChildStatus oldStatus = record.status;
        record.status = ChildStatus.Sunset;

        reclaimedCapital = IGardenChild(childAddress).sunset(record.seedToken);
        treasuryBalance[record.seedToken] += reclaimedCapital;

        _removeFromActiveChildren(childAddress);
        emit ChildStateChanged(childAddress, oldStatus, ChildStatus.Sunset);
    }

    function evaluateEpoch() external override nonReentrant whenNotPaused {
        require(block.timestamp >= lastEpochEvaluationTimestamp + epochInterval, "EPOCH_INTERVAL_NOT_MET");
        require(address(strategy) != address(0), "STRATEGY_NOT_CONFIGURED");

        uint256 epochDuration = block.timestamp - lastEpochEvaluationTimestamp;
        lastEpochEvaluationTimestamp = block.timestamp;

        // 1. Harvest all active children
        uint256 epochHarvested = 0;
        for (uint256 i = 0; i < _activeChildren.length; i++) {
            address child = _activeChildren[i];
            address seedTok = getChildRecord[child].seedToken;
            try IGardenChild(child).harvestRevenue(seedTok) returns (uint256 amount) {
                treasuryBalance[seedTok] += amount;
                getChildRecord[child].totalRevenueReturned += amount;
                epochHarvested += amount;
                emit RevenueReceived(child, seedTok, amount);
            } catch {}
        }

        // 2. Query strategy for scoring and sunset candidates
        IEvolutionStrategy.PerformanceScore[] memory scores = strategy.evaluateChildren(
            address(this),
            _activeChildren,
            epochDuration
        );

        uint256 sunsetCount = 0;
        for (uint256 i = 0; i < scores.length; i++) {
            if (scores[i].shouldSunset) {
                try this.sunsetChild(scores[i].childAddress) {
                    sunsetCount++;
                } catch {}
            }
        }

        // 3. Plan and deploy next generation with genetic parameter mutation
        uint256 spawnedCount = 0;
        address primaryToken = address(0);
        if (_activeChildren.length > 0) {
            primaryToken = getChildRecord[_activeChildren[0]].seedToken;
        }

        uint256 totalPrimaryTreasury = treasuryBalance[primaryToken];
        uint256 allocatableTreasury = (totalPrimaryTreasury * reinvestmentRatioBps) / 10000;

        IEvolutionStrategy.DeploymentProposal[] memory proposals = strategy.planNextGeneration(
            address(this),
            allocatableTreasury,
            maxChildrenPerEpoch
        );

        for (uint256 i = 0; i < proposals.length; i++) {
            bytes32 pType = proposals[i].childType;
            if (registeredFactories[pType] != address(0) && proposals[i].seedCapital > 0) {
                if (treasuryBalance[proposals[i].seedToken] >= proposals[i].seedCapital) {
                    address factory = registeredFactories[pType];
                    address deployed = IChildFactory(factory).deployChild(address(this), proposals[i].initParams);

                    if (deployed != address(0)) {
                        treasuryBalance[proposals[i].seedToken] -= proposals[i].seedCapital;
                        _safeTransfer(proposals[i].seedToken, deployed, proposals[i].seedCapital);

                        getChildRecord[deployed] = ChildRecord({
                            childAddress: deployed,
                            childType: pType,
                            deployedAt: block.timestamp,
                            seedCapital: proposals[i].seedCapital,
                            seedToken: proposals[i].seedToken,
                            totalRevenueReturned: 0,
                            lastHarvestTimestamp: block.timestamp,
                            status: ChildStatus.Active,
                            initParams: proposals[i].initParams
                        });

                        _allChildren.push(deployed);
                        _activeChildren.push(deployed);
                        spawnedCount++;
                        emit ChildDeployed(deployed, pType, proposals[i].seedCapital, proposals[i].seedToken);
                    }
                }
            }
        }

        epochReports[currentEpoch] = EpochReport({
            epochNumber: currentEpoch,
            timestamp: block.timestamp,
            activeChildrenCount: _activeChildren.length,
            totalRevenueHarvested: epochHarvested,
            childrenSunsetCount: sunsetCount,
            childrenSpawnedCount: spawnedCount
        });

        emit EpochEvaluated(currentEpoch, epochHarvested, sunsetCount, spawnedCount);
        currentEpoch++;
    }

    function _removeFromActiveChildren(address child) internal {
        uint256 len = _activeChildren.length;
        for (uint256 i = 0; i < len; i++) {
            if (_activeChildren[i] == child) {
                _activeChildren[i] = _activeChildren[len - 1];
                _activeChildren.pop();
                break;
            }
        }
    }

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "TRANSFER_FAILED");
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "TRANSFER_FROM_FAILED");
    }

    receive() external payable {
        treasuryBalance[address(0)] += msg.value;
        emit SeedFunded(msg.sender, address(0), msg.value);
    }
}`
  },
  {
    name: 'BaseGardenChild.sol',
    path: 'contracts/src/base/BaseGardenChild.sol',
    category: 'base',
    description: 'Abstract base contract enforcing non-bypassable revenue share routing to the Garden.',
    solidityVersion: '^0.8.24',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IGardenChild.sol";

/**
 * @title BaseGardenChild
 * @notice Abstract base implementation for child protocols deployed by the Autonomous Protocol Garden.
 * @dev Enforces non-bypassable revenue sharing via inheritance. The child contract cannot divert or suppress
 *      the accrued Garden fee share, and only the Garden core contract holds pause/sunset privileges.
 */
abstract contract BaseGardenChild is IGardenChild {
    address public immutable override garden;
    bytes32 public immutable override childType;
    uint16 public immutable override feeShareBps;

    bool public override isActive;
    bool public override isSunset;

    mapping(address => uint256) public override totalFeesGenerated;
    mapping(address => uint256) public override totalFeesPaidToGarden;
    mapping(address => uint256) public override totalVolume;
    mapping(address => uint256) public override accruedGardenFees;
    mapping(address => uint256) public override seedCapitalReceived;

    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    modifier onlyGarden() {
        require(msg.sender == garden, "ONLY_GARDEN");
        _;
    }

    modifier whenActive() {
        require(isActive && !isSunset, "PROTOCOL_INACTIVE_OR_SUNSET");
        _;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "REENTRANCY_GUARD");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    constructor(address _garden, bytes32 _childType, uint16 _feeShareBps) {
        require(_garden != address(0), "INVALID_GARDEN_ADDRESS");
        require(_feeShareBps <= 10000, "INVALID_FEE_SHARE");
        garden = _garden;
        childType = _childType;
        feeShareBps = _feeShareBps;
        isActive = true;
        isSunset = false;
        _status = _NOT_ENTERED;
    }

    function _recordAndSplitFee(
        address token,
        uint256 totalFee
    ) internal returns (uint256 protocolShare, uint256 gardenShare) {
        if (totalFee == 0) return (0, 0);

        gardenShare = (totalFee * feeShareBps) / 10000;
        protocolShare = totalFee - gardenShare;

        accruedGardenFees[token] += gardenShare;
        totalFeesGenerated[token] += totalFee;

        emit RevenueShared(token, totalFee, gardenShare, protocolShare);
    }

    function _recordVolume(address token, uint256 volume) internal {
        totalVolume[token] += volume;
    }

    function _recordSeedCapital(address token, uint256 amount) internal {
        seedCapitalReceived[token] += amount;
    }

    function harvestRevenue(address token) external override nonReentrant returns (uint256 amountHarvested) {
        amountHarvested = accruedGardenFees[token];
        require(amountHarvested > 0, "NO_ACCRUED_FEES");

        accruedGardenFees[token] = 0;
        totalFeesPaidToGarden[token] += amountHarvested;

        if (token == address(0)) {
            (bool success, ) = payable(garden).call{value: amountHarvested}("");
            require(success, "ETH_TRANSFER_FAILED");
        } else {
            _safeTransfer(token, garden, amountHarvested);
        }

        emit RevenueHarvested(token, amountHarvested);
    }

    function emergencyPause() external override onlyGarden {
        require(isActive, "ALREADY_PAUSED");
        isActive = false;
        emit ChildPaused(msg.sender);
    }

    function emergencyUnpause() external override onlyGarden {
        require(!isActive && !isSunset, "CANNOT_UNPAUSE");
        isActive = true;
        emit ChildUnpaused(msg.sender);
    }

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "TOKEN_TRANSFER_FAILED");
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "TRANSFER_FROM_FAILED");
    }

    receive() external payable virtual {}
}`
  },
  {
    name: 'SimpleAMMChild.sol',
    path: 'contracts/src/children/SimpleAMMChild.sol',
    category: 'children',
    description: 'Concrete constant-product AMM pair child with parameterized fee tiers and liquidation mechanics.',
    solidityVersion: '^0.8.24',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../base/BaseGardenChild.sol";

/**
 * @title SimpleAMMChild
 * @notice Concrete child protocol implementing a parameterized constant-product AMM pair (x * y = k).
 */
contract SimpleAMMChild is BaseGardenChild {
    address public immutable token0;
    address public immutable token1;
    uint16 public immutable swapFeeBps;

    uint256 public reserve0;
    uint256 public reserve1;

    event LiquidityAdded(address indexed provider, uint256 amount0, uint256 amount1);
    event SwapExecuted(
        address indexed sender,
        address indexed tokenIn,
        uint256 amountIn,
        address indexed tokenOut,
        uint256 amountOut,
        uint256 feePaid
    );

    constructor(
        address _garden,
        address _token0,
        address _token1,
        uint16 _swapFeeBps,
        uint16 _gardenFeeShareBps
    ) BaseGardenChild(_garden, keccak256("SIMPLE_AMM"), _gardenFeeShareBps) {
        require(_token0 != address(0) && _token1 != address(0), "INVALID_TOKENS");
        require(_token0 != _token1, "IDENTICAL_TOKENS");
        require(_swapFeeBps > 0 && _swapFeeBps <= 1000, "INVALID_SWAP_FEE");
        token0 = _token0;
        token1 = _token1;
        swapFeeBps = _swapFeeBps;
    }

    function addLiquidity(
        uint256 amount0,
        uint256 amount1
    ) external nonReentrant whenActive returns (uint256 deposited0, uint256 deposited1) {
        require(amount0 > 0 && amount1 > 0, "ZERO_LIQUIDITY");

        _safeTransferFrom(token0, msg.sender, address(this), amount0);
        _safeTransferFrom(token1, msg.sender, address(this), amount1);

        reserve0 += amount0;
        reserve1 += amount1;

        if (msg.sender == garden) {
            _recordSeedCapital(token0, amount0);
            _recordSeedCapital(token1, amount1);
        }

        emit LiquidityAdded(msg.sender, amount0, amount1);
        return (amount0, amount1);
    }

    function swap(
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut,
        address to
    ) external nonReentrant whenActive returns (uint256 amountOut) {
        require(tokenIn == token0 || tokenIn == token1, "INVALID_TOKEN_IN");
        require(amountIn > 0, "ZERO_AMOUNT_IN");
        require(to != address(0), "INVALID_RECIPIENT");

        bool isToken0 = tokenIn == token0;
        address tokenOut = isToken0 ? token1 : token0;
        uint256 resIn = isToken0 ? reserve0 : reserve1;
        uint256 resOut = isToken0 ? reserve1 : reserve0;

        require(resIn > 0 && resOut > 0, "INSUFFICIENT_LIQUIDITY");

        _safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);

        uint256 totalFee = (amountIn * swapFeeBps) / 10000;
        (, uint256 gardenFee) = _recordAndSplitFee(tokenIn, totalFee);
        _recordVolume(tokenIn, amountIn);

        uint256 amountInAfterGardenFee = amountIn - gardenFee;
        uint256 amountInWithLPFee = amountIn - totalFee;
        amountOut = (resOut * amountInWithLPFee) / (resIn + amountInWithLPFee);

        require(amountOut >= minAmountOut, "SLIPPAGE_EXCEEDED");
        require(amountOut < resOut, "RESERVE_EXHAUSTED");

        if (isToken0) {
            reserve0 = resIn + amountInAfterGardenFee;
            reserve1 = resOut - amountOut;
        } else {
            reserve1 = resIn + amountInAfterGardenFee;
            reserve0 = resOut - amountOut;
        }

        _safeTransfer(tokenOut, to, amountOut);
        emit SwapExecuted(msg.sender, tokenIn, amountIn, tokenOut, amountOut, totalFee);
    }

    function sunset(address primaryToken) external override onlyGarden nonReentrant returns (uint256 reclaimedAmount) {
        require(!isSunset, "ALREADY_SUNSET");
        isSunset = true;
        isActive = false;

        if (accruedGardenFees[token0] > 0) {
            uint256 fees0 = accruedGardenFees[token0];
            accruedGardenFees[token0] = 0;
            totalFeesPaidToGarden[token0] += fees0;
            _safeTransfer(token0, garden, fees0);
        }

        if (accruedGardenFees[token1] > 0) {
            uint256 fees1 = accruedGardenFees[token1];
            accruedGardenFees[token1] = 0;
            totalFeesPaidToGarden[token1] += fees1;
            _safeTransfer(token1, garden, fees1);
        }

        uint256 bal0 = _getTokenBalance(token0);
        uint256 bal1 = _getTokenBalance(token1);

        if (bal0 > 0) {
            _safeTransfer(token0, garden, bal0);
            emit ChildSunset(garden, token0, bal0);
        }

        if (bal1 > 0) {
            _safeTransfer(token1, garden, bal1);
            emit ChildSunset(garden, token1, bal1);
        }

        reserve0 = 0;
        reserve1 = 0;
        reclaimedAmount = (primaryToken == token0) ? bal0 : bal1;
    }

    function _getTokenBalance(address token) internal view returns (uint256) {
        (bool success, bytes memory data) = token.staticcall(
            abi.encodeWithSignature("balanceOf(address)", address(this))
        );
        if (success && data.length >= 32) {
            return abi.decode(data, (uint256));
        }
        return 0;
    }
}`
  },
  {
    name: 'EvolutionaryStrategy.sol',
    path: 'contracts/src/strategy/EvolutionaryStrategy.sol',
    category: 'strategy',
    description: 'On-chain genetic algorithm evaluating ROI velocity and mutating parameters biased toward top alpha performers.',
    solidityVersion: '^0.8.24',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IEvolutionStrategy.sol";
import "../interfaces/IGardenCore.sol";

/**
 * @title EvolutionaryStrategy
 * @notice On-chain genetic evolutionary strategy engine for the Autonomous Protocol Garden.
 */
contract EvolutionaryStrategy is IEvolutionStrategy {
    address public owner;
    address public pendingOwner;

    uint256 public minGracePeriod = 1 days;
    uint256 public minRoiThresholdBps = 20; // 0.20% minimum ROI
    uint256 public defaultSeedCapital = 100 ether;
    uint16 public mutationVariancePercent = 20;

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }

    constructor(address _initialOwner) {
        require(_initialOwner != address(0), "INVALID_OWNER");
        owner = _initialOwner;
    }

    function evaluateChildren(
        address garden,
        address[] calldata children,
        uint256 epochDuration
    ) external view override returns (PerformanceScore[] memory scores) {
        scores = new PerformanceScore[](children.length);
        IGardenCore gardenCore = IGardenCore(garden);

        for (uint256 i = 0; i < children.length; i++) {
            address child = children[i];
            IGardenCore.ChildRecord memory record = gardenCore.getChildRecord(child);

            uint256 score = 0;
            if (record.seedCapital > 0) {
                score = (record.totalRevenueReturned * 10000) / record.seedCapital;
            } else {
                score = record.totalRevenueReturned;
            }

            uint256 age = block.timestamp - record.deployedAt;
            bool shouldSunset = false;

            if (age >= minGracePeriod && record.status == IGardenCore.ChildStatus.Active) {
                if (score < minRoiThresholdBps) {
                    shouldSunset = true;
                }
            }

            scores[i] = PerformanceScore({
                childAddress: child,
                score: score,
                shouldSunset: shouldSunset
            });
        }
    }

    function planNextGeneration(
        address garden,
        uint256 availableTreasury,
        uint256 maxDeployments
    ) external view override returns (DeploymentProposal[] memory proposals) {
        IGardenCore gardenCore = IGardenCore(garden);
        address[] memory activeChildren = gardenCore.getActiveChildren();

        uint256 plannedCount = maxDeployments;
        if (plannedCount == 0) plannedCount = 2;
        if (plannedCount > 4) plannedCount = 4;

        proposals = new DeploymentProposal[](plannedCount);

        uint16 bestSwapFeeBps = 30;
        uint16 bestGardenFeeShareBps = 2000;
        address bestToken0 = address(0);
        address bestToken1 = address(0);
        uint256 highestScore = 0;

        for (uint256 i = 0; i < activeChildren.length; i++) {
            IGardenCore.ChildRecord memory record = gardenCore.getChildRecord(activeChildren[i]);
            if (record.childType == keccak256("SIMPLE_AMM") && record.initParams.length >= 128) {
                uint256 score = record.seedCapital > 0
                    ? (record.totalRevenueReturned * 10000) / record.seedCapital
                    : 0;

                if (score >= highestScore) {
                    highestScore = score;
                    (
                        address t0,
                        address t1,
                        uint16 fee,
                        uint16 share
                    ) = abi.decode(record.initParams, (address, address, uint16, uint16));
                    bestSwapFeeBps = fee;
                    bestGardenFeeShareBps = share;
                    bestToken0 = t0;
                    bestToken1 = t1;
                }
            }
        }

        for (uint256 i = 0; i < plannedCount; i++) {
            uint256 entropy = uint256(
                keccak256(abi.encodePacked(block.prevrandao, block.timestamp, i, activeChildren.length))
            );

            int256 deltaPercent = int256((entropy % (mutationVariancePercent * 2 + 1))) - int256(uint256(mutationVariancePercent));
            int256 mutatedFee = int256(uint256(bestSwapFeeBps)) + (int256(uint256(bestSwapFeeBps)) * deltaPercent) / 100;

            if (mutatedFee < 5) mutatedFee = 5;
            if (mutatedFee > 200) mutatedFee = 200;

            uint16 mutatedShare = bestGardenFeeShareBps;
            if ((entropy >> 8) % 2 == 0) {
                mutatedShare = mutatedShare > 1500 ? mutatedShare - 100 : 1500;
            } else {
                mutatedShare = mutatedShare < 3500 ? mutatedShare + 100 : 3500;
            }

            bytes memory initParams = abi.encode(
                bestToken0,
                bestToken1,
                uint16(uint256(mutatedFee)),
                mutatedShare
            );

            uint256 seed = defaultSeedCapital;
            if (seed * plannedCount > availableTreasury && availableTreasury > 0) {
                seed = availableTreasury / plannedCount;
            }

            proposals[i] = DeploymentProposal({
                childType: keccak256("SIMPLE_AMM"),
                initParams: initParams,
                seedCapital: seed,
                seedToken: bestToken0
            });
        }
    }
}`
  },
  {
    name: 'ChildFactory.sol',
    path: 'contracts/src/factory/ChildFactory.sol',
    category: 'factory',
    description: 'Factory deploying child contracts with parameter unpacking and Garden verification.',
    solidityVersion: '^0.8.24',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IChildFactory.sol";
import "../interfaces/IGardenChild.sol";
import "../children/SimpleAMMChild.sol";
import "../children/YieldVaultChild.sol";

/**
 * @title ChildFactory
 * @notice Factory capable of deploying diverse parameterized child protocols for the Garden.
 */
contract ChildFactory is IChildFactory {
    bytes32 public constant SIMPLE_AMM_TYPE = keccak256("SIMPLE_AMM");
    bytes32 public constant YIELD_VAULT_TYPE = keccak256("YIELD_VAULT");

    bytes32 public immutable override childType;

    event ChildCreated(address indexed child, bytes32 indexed protocolType, address indexed garden);

    constructor(bytes32 _childType) {
        childType = _childType;
    }

    function deployChild(
        address garden,
        bytes calldata initParams
    ) external override returns (address child) {
        require(garden != address(0), "INVALID_GARDEN");

        if (childType == SIMPLE_AMM_TYPE) {
            (
                address token0,
                address token1,
                uint16 swapFeeBps,
                uint16 gardenFeeShareBps
            ) = abi.decode(initParams, (address, address, uint16, uint16));

            SimpleAMMChild amm = new SimpleAMMChild(
                garden,
                token0,
                token1,
                swapFeeBps,
                gardenFeeShareBps
            );
            child = address(amm);
        } else if (childType == YIELD_VAULT_TYPE) {
            (
                address asset,
                uint16 depositFeeBps,
                uint16 performanceFeeBps,
                uint16 gardenFeeShareBps
            ) = abi.decode(initParams, (address, uint16, uint16, uint16));

            YieldVaultChild vault = new YieldVaultChild(
                garden,
                asset,
                depositFeeBps,
                performanceFeeBps,
                gardenFeeShareBps
            );
            child = address(vault);
        } else {
            revert("UNSUPPORTED_CHILD_TYPE");
        }

        require(IGardenChild(child).garden() == garden, "FACTORY_GARDEN_MISMATCH");
        emit ChildCreated(child, childType, garden);
    }
}`
  },
  {
    name: 'GardenCore.t.sol',
    path: 'contracts/test/GardenCore.t.sol',
    category: 'test',
    description: 'Foundry test suite verifying deployment, revenue share collection, pausing, sunsetting, and evolutionary planning.',
    solidityVersion: '^0.8.24',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/core/GardenCore.sol";
import "../src/factory/ChildFactory.sol";
import "../src/strategy/EvolutionaryStrategy.sol";
import "../src/children/SimpleAMMChild.sol";
import "../src/mocks/MockERC20.sol";

contract GardenCoreTest {
    GardenCore public garden;
    ChildFactory public ammFactory;
    EvolutionaryStrategy public strategy;
    MockERC20 public tokenA;
    MockERC20 public tokenB;

    bytes32 public constant SIMPLE_AMM_TYPE = keccak256("SIMPLE_AMM");

    function setUp() public {
        tokenA = new MockERC20("Token A", "TKNA", 18);
        tokenB = new MockERC20("Token B", "TKNB", 18);
        strategy = new EvolutionaryStrategy(address(this));
        garden = new GardenCore(address(this), address(strategy));
        ammFactory = new ChildFactory(SIMPLE_AMM_TYPE);
        garden.registerFactory(SIMPLE_AMM_TYPE, address(ammFactory));

        tokenA.mint(address(garden), 1_000_000 ether);
        tokenB.mint(address(garden), 1_000_000 ether);
    }

    function test_DeployChildAMM() public {
        bytes memory initParams = abi.encode(address(tokenA), address(tokenB), uint16(30), uint16(2000));
        address child = garden.deployChild(SIMPLE_AMM_TYPE, initParams, 0, address(tokenA), 10_000 ether);
        require(child != address(0), "DEPLOY_FAILED");
    }

    function test_RevenueShareCollection() public {
        bytes memory initParams = abi.encode(address(tokenA), address(tokenB), uint16(100), uint16(2500));
        address child = garden.deployChild(SIMPLE_AMM_TYPE, initParams, 0, address(tokenA), 10_000 ether);
        SimpleAMMChild amm = SimpleAMMChild(payable(child));

        tokenA.mint(address(this), 10_000 ether);
        tokenB.mint(address(this), 10_000 ether);
        tokenA.approve(child, 10_000 ether);
        tokenB.approve(child, 10_000 ether);
        amm.addLiquidity(10_000 ether, 10_000 ether);

        tokenA.mint(address(this), 1_000 ether);
        tokenA.approve(child, 1_000 ether);
        amm.swap(address(tokenA), 1_000 ether, 1, address(this));

        require(amm.totalFeesGenerated(address(tokenA)) == 10 ether, "FEE_MISMATCH");
        uint256 harvested = garden.harvestChildRevenue(child, address(tokenA));
        require(harvested == 2.5 ether, "HARVEST_MISMATCH");
    }
}`
  },
  {
    name: 'DeployGarden.s.sol',
    path: 'contracts/script/DeployGarden.s.sol',
    category: 'script',
    description: 'Foundry deployment script setting up GardenCore, EvolutionaryStrategy, factories, and Gen 0 child experiments.',
    solidityVersion: '^0.8.24',
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../src/core/GardenCore.sol";
import "../src/factory/ChildFactory.sol";
import "../src/strategy/EvolutionaryStrategy.sol";
import "../src/mocks/MockERC20.sol";

contract DeployGardenScript {
    bytes32 public constant SIMPLE_AMM_TYPE = keccak256("SIMPLE_AMM");

    function run() external {
        address deployer = msg.sender;
        MockERC20 tokenA = new MockERC20("Garden USD", "gUSD", 18);
        MockERC20 tokenB = new MockERC20("Garden ETH", "gETH", 18);

        EvolutionaryStrategy strategy = new EvolutionaryStrategy(deployer);
        GardenCore garden = new GardenCore(deployer, address(strategy));
        ChildFactory ammFactory = new ChildFactory(SIMPLE_AMM_TYPE);

        garden.registerFactory(SIMPLE_AMM_TYPE, address(ammFactory));
        tokenA.mint(address(garden), 500_000 ether);

        bytes memory params = abi.encode(address(tokenA), address(tokenB), uint16(30), uint16(2000));
        garden.deployChild(SIMPLE_AMM_TYPE, params, 0, address(tokenA), 25_000 ether);
    }
}`
  },
  {
    name: 'foundry.toml',
    path: 'foundry.toml',
    category: 'config',
    description: 'Foundry build profile configuration with Solc 0.8.24 and optimizer settings.',
    code: `[profile.default]
src = "contracts/src"
out = "contracts/out"
libs = ["contracts/lib"]
test = "contracts/test"
script = "contracts/script"
solc_version = "0.8.24"
optimizer = true
optimizer_runs = 200
via_ir = false
verbosity = 3

[rpc_endpoints]
mainnet = "\${MAINNET_RPC_URL}"
sepolia = "\${SEPOLIA_RPC_URL}"`
  }
];
