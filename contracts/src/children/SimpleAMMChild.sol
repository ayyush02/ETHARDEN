// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../base/BaseGardenChild.sol";

/**
 * @title SimpleAMMChild
 * @notice Concrete child protocol implementing a parameterized constant-product AMM pair (x * y = k).
 * @dev Deployed with parameterized fee rates, LP incentives, and seeded with initial liquidity from the Garden.
 *      Enforces revenue share forwarding directly to the Garden treasury on every swap.
 */
contract SimpleAMMChild is BaseGardenChild {
    // ==========================================
    // AMM State Variables
    // ==========================================

    address public immutable token0;
    address public immutable token1;

    /// @notice Swap fee in basis points (e.g., 30 = 0.30%, 100 = 1.00%)
    uint16 public immutable swapFeeBps;

    uint256 public reserve0;
    uint256 public reserve1;

    // Events
    event LiquidityAdded(address indexed provider, uint256 amount0, uint256 amount1);
    event SwapExecuted(
        address indexed sender,
        address indexed tokenIn,
        uint256 amountIn,
        address indexed tokenOut,
        uint256 amountOut,
        uint256 feePaid
    );

    // ==========================================
    // Constructor
    // ==========================================

    /**
     * @param _garden Address of the parent GardenCore contract
     * @param _token0 First token of the pair
     * @param _token1 Second token of the pair
     * @param _swapFeeBps Swap fee rate in basis points (e.g., 30 for 0.30%)
     * @param _gardenFeeShareBps Percentage of the swap fee routed to Garden (e.g. 2000 for 20%)
     */
    constructor(
        address _garden,
        address _token0,
        address _token1,
        uint16 _swapFeeBps,
        uint16 _gardenFeeShareBps
    ) BaseGardenChild(_garden, keccak256("SIMPLE_AMM"), _gardenFeeShareBps) {
        require(_token0 != address(0) && _token1 != address(0), "INVALID_TOKENS");
        require(_token0 != _token1, "IDENTICAL_TOKENS");
        require(_swapFeeBps > 0 && _swapFeeBps <= 1000, "INVALID_SWAP_FEE"); // Max 10%
        token0 = _token0;
        token1 = _token1;
        swapFeeBps = _swapFeeBps;
    }

    // ==========================================
    // Liquidity Provisioning (Seeding)
    // ==========================================

    /**
     * @notice Seeds initial or supplementary liquidity for the pair.
     * @dev When called by the Garden at genesis, records seed capital for ROI tracking.
     */
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

    // ==========================================
    // Swap Execution & Fee Routing
    // ==========================================

    /**
     * @notice Executes a token swap across the constant-product pair.
     * @param tokenIn Address of the token being sold (must be token0 or token1).
     * @param amountIn Amount of tokenIn to swap.
     * @param minAmountOut Minimum acceptable amount of tokenOut (slippage protection).
     * @param to Recipient address for the output tokens.
     * @return amountOut The actual amount of tokens delivered to the recipient.
     */
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

        // Pull input tokens from user
        _safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);

        // Calculate total fee and revenue share
        uint256 totalFee = (amountIn * swapFeeBps) / 10000;
        (, uint256 gardenFee) = _recordAndSplitFee(tokenIn, totalFee);
        _recordVolume(tokenIn, amountIn);

        // Effective amount entering the constant-product curve:
        // amountIn minus gardenFee stays in reserve; or minus totalFee if pure LP fee
        uint256 amountInAfterGardenFee = amountIn - gardenFee;

        // Constant product formula with remaining fee added to reserves:
        // dy = (y * dx_effective) / (x + dx_effective)
        uint256 amountInWithLPFee = amountIn - totalFee;
        amountOut = (resOut * amountInWithLPFee) / (resIn + amountInWithLPFee);

        require(amountOut >= minAmountOut, "SLIPPAGE_EXCEEDED");
        require(amountOut < resOut, "RESERVE_EXHAUSTED");

        // Update reserves
        if (isToken0) {
            reserve0 = resIn + amountInAfterGardenFee;
            reserve1 = resOut - amountOut;
        } else {
            reserve1 = resIn + amountInAfterGardenFee;
            reserve0 = resOut - amountOut;
        }

        // Transfer output tokens to user
        _safeTransfer(tokenOut, to, amountOut);

        emit SwapExecuted(msg.sender, tokenIn, amountIn, tokenOut, amountOut, totalFee);
    }

    /**
     * @notice Quotes the expected output amount for a given input.
     */
    function getAmountOut(
        address tokenIn,
        uint256 amountIn
    ) external view returns (uint256 amountOut, uint256 feePaid, uint256 gardenFee) {
        require(tokenIn == token0 || tokenIn == token1, "INVALID_TOKEN_IN");
        bool isToken0 = tokenIn == token0;
        uint256 resIn = isToken0 ? reserve0 : reserve1;
        uint256 resOut = isToken0 ? reserve1 : reserve0;

        if (resIn == 0 || resOut == 0) return (0, 0, 0);

        feePaid = (amountIn * swapFeeBps) / 10000;
        gardenFee = (feePaid * feeShareBps) / 10000;

        uint256 amountInWithLPFee = amountIn - feePaid;
        amountOut = (resOut * amountInWithLPFee) / (resIn + amountInWithLPFee);
    }

    // ==========================================
    // Sunsetting & Liquidation
    // ==========================================

    /**
     * @inheritdoc IGardenChild
     * @notice Liquidates the pair's assets and sweeps all tokens back to the Garden treasury.
     */
    function sunset(address primaryToken) external override onlyGarden nonReentrant returns (uint256 reclaimedAmount) {
        require(!isSunset, "ALREADY_SUNSET");
        isSunset = true;
        isActive = false;

        // Harvest any accrued Garden fees first
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

        // Return all remaining balances to Garden
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
}
