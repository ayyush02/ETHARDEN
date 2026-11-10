import React, { useState } from 'react';
import { TreasuryState, ChildProtocol } from '../types/garden';
import { Wallet, ShieldCheck, ArrowUpRight, Coins, Layers } from 'lucide-react';

interface TreasuryPieChartProps {
  treasury: TreasuryState;
  children: ChildProtocol[];
  ethPriceUsd?: number;
}

interface AssetSlice {
  id: string;
  name: string;
  subtitle: string;
  amount: number;
  unit: string;
  valueUsd: number;
  percentage: number;
  color: string;
  hoverColor: string;
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeDonutSlice(
  x: number,
  y: number,
  radius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
) {
  // If slice is 100%, prevent angle overlap artifact
  const sweep = endAngle - startAngle;
  const adjustedEnd = sweep >= 360 ? startAngle + 359.999 : endAngle;

  const start = polarToCartesian(x, y, radius, adjustedEnd);
  const end = polarToCartesian(x, y, radius, startAngle);
  const startInner = polarToCartesian(x, y, innerRadius, startAngle);
  const endInner = polarToCartesian(x, y, innerRadius, adjustedEnd);

  const largeArcFlag = sweep <= 180 ? '0' : '1';

  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    'L', startInner.x, startInner.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 1, endInner.x, endInner.y,
    'Z'
  ].join(' ');
}

export const TreasuryPieChart: React.FC<TreasuryPieChartProps> = ({
  treasury,
  children,
  ethPriceUsd = 3200,
}) => {
  const [hoveredSlice, setHoveredSlice] = useState<AssetSlice | null>(null);

  // 1. Calculate values
  const gUsdValue = treasury.tokenABalance;
  const ethValue = treasury.ethBalance * ethPriceUsd;

  // Staked assets: active capital seeded into child protocols
  const activeChildren = children.filter((c) => c.status === 'Active');
  const stakedCapitalValue = activeChildren.reduce((sum, c) => sum + c.seedCapital, 0);

  // Accrued unharvested revenue in child accumulators
  const accruedFeesValue = children.reduce((sum, c) => sum + c.accruedGardenFees, 0);

  const totalPortfolioValue = gUsdValue + ethValue + stakedCapitalValue + accruedFeesValue;

  const slices: AssetSlice[] = [
    {
      id: 'gusd',
      name: 'gUSD Liquid Reserve',
      subtitle: 'Unallocated Treasury Reserve',
      amount: treasury.tokenABalance,
      unit: 'gUSD',
      valueUsd: gUsdValue,
      percentage: totalPortfolioValue > 0 ? (gUsdValue / totalPortfolioValue) * 100 : 0,
      color: '#10b981', // emerald-500
      hoverColor: '#34d399', // emerald-400
    },
    {
      id: 'eth',
      name: 'ETH Native Reserve',
      subtitle: `Cold Safety Reserve (@ $${ethPriceUsd.toLocaleString()})`,
      amount: treasury.ethBalance,
      unit: 'ETH',
      valueUsd: ethValue,
      percentage: totalPortfolioValue > 0 ? (ethValue / totalPortfolioValue) * 100 : 0,
      color: '#0ea5e9', // sky-500
      hoverColor: '#38bdf8', // sky-400
    },
    {
      id: 'staked',
      name: 'Staked / Child AMM Assets',
      subtitle: `Capital deployed across ${activeChildren.length} active protocols`,
      amount: stakedCapitalValue,
      unit: 'gUSD',
      valueUsd: stakedCapitalValue,
      percentage: totalPortfolioValue > 0 ? (stakedCapitalValue / totalPortfolioValue) * 100 : 0,
      color: '#6366f1', // indigo-500
      hoverColor: '#818cf8', // indigo-400
    },
    {
      id: 'accrued',
      name: 'Accrued Protocol Yield',
      subtitle: 'Unharvested revenue ready to sweep',
      amount: accruedFeesValue,
      unit: 'gUSD',
      valueUsd: accruedFeesValue,
      percentage: totalPortfolioValue > 0 ? (accruedFeesValue / totalPortfolioValue) * 100 : 0,
      color: '#f59e0b', // amber-500
      hoverColor: '#fbbf24', // amber-400
    },
  ];

  // Calculate SVG arc angles
  const size = 220;
  const center = size / 2;
  const radius = 95;
  const innerRadius = 65;

  let currentAngle = 0;
  const sliceArcs = slices.map((slice) => {
    const sweepAngle = (slice.percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sweepAngle;
    currentAngle += sweepAngle;

    return {
      slice,
      path: describeDonutSlice(center, center, radius, innerRadius, startAngle, endAngle),
      startAngle,
      endAngle,
    };
  });

  const activeDisplay = hoveredSlice || slices[0];

  return (
    <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>Treasury Asset Distribution & Capital Allocation</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time portfolio composition across liquid reserves, ETH collateral, and staked child protocol assets
          </p>
        </div>

        <div className="text-left sm:text-right font-mono">
          <div className="text-xs text-slate-400">Total Portfolio Under Management</div>
          <div className="text-lg font-bold text-white tabular-nums">
            ${totalPortfolioValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* Main Chart + Legend Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Pie / Donut Chart Viewport */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
          <div className="relative w-[220px] h-[220px]">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="transform -rotate-90 drop-shadow-md overflow-visible"
            >
              {sliceArcs.map(({ slice, path }) => {
                const isHovered = hoveredSlice?.id === slice.id;
                return (
                  <path
                    key={slice.id}
                    d={path}
                    fill={isHovered ? slice.hoverColor : slice.color}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredSlice(slice)}
                    onMouseLeave={() => setHoveredSlice(null)}
                    stroke="#0b0f17"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />
                );
              })}
            </svg>

            {/* Donut Center Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                {activeDisplay.unit}
              </span>
              <span className="text-base font-bold text-white font-mono tabular-nums leading-tight mt-0.5">
                {activeDisplay.percentage.toFixed(1)}%
              </span>
              <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                ${activeDisplay.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 text-center mt-3 font-mono">
            Hover over any segment to inspect allocation
          </div>
        </div>

        {/* Detailed Breakdown Legend & Health Invariants */}
        <div className="lg:col-span-7 space-y-3">
          <div className="space-y-2">
            {slices.map((slice) => {
              const isHovered = hoveredSlice?.id === slice.id;
              return (
                <div
                  key={slice.id}
                  onMouseEnter={() => setHoveredSlice(slice)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                    isHovered
                      ? 'bg-slate-800/70 border-slate-700 shadow-sm'
                      : 'bg-slate-950/50 border-slate-800/60 hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <div className="truncate">
                      <div className="text-xs font-semibold text-slate-200 truncate">
                        {slice.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {slice.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono">
                    <div className="text-xs font-bold text-slate-100 tabular-nums">
                      ${slice.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-[11px] text-slate-400 tabular-nums">
                      {slice.amount.toLocaleString(undefined, { maximumFractionDigits: 1 })} {slice.unit} ·{' '}
                      <span className="text-slate-200 font-semibold">{slice.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Allocation Health Bar */}
          <div className="pt-2">
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
              {slices.map((slice) => (
                <div
                  key={slice.id}
                  style={{
                    width: `${slice.percentage}%`,
                    backgroundColor: slice.color,
                  }}
                  className="h-full transition-all duration-300"
                  title={`${slice.name}: ${slice.percentage.toFixed(1)}%`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-mono">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Liquid Solvency Ratio: {((gUsdValue + ethValue) / totalPortfolioValue * 100).toFixed(1)}%</span>
              </span>
              <span>Reinvestment Capacity: High</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
