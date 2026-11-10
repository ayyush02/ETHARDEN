import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { TreasuryState } from '../types/garden';
import { PieChart as PieChartIcon, ShieldCheck } from 'lucide-react';

interface TreasuryAssetDistributionProps {
  treasury: TreasuryState;
  ethPriceUsd?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      name: string;
      value: number;
      rawAmount: number;
      unit: string;
      color: string;
      percentage: number;
    };
  }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div className="p-2.5 rounded-lg bg-slate-900/95 border border-slate-700 shadow-xl text-xs font-mono space-y-1">
        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: data.color }}
          />
          <span>{data.name}</span>
        </div>
        <div className="text-slate-300">
          Value: <span className="font-bold text-white tabular-nums">${data.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="text-slate-400 text-[11px]">
          Balance: {data.rawAmount.toLocaleString(undefined, { maximumFractionDigits: 1 })} {data.unit}
        </div>
        <div className="text-emerald-400 text-[11px] font-semibold">
          Share: {data.percentage.toFixed(1)}%
        </div>
      </div>
    );
  }
  return null;
};

export const TreasuryAssetDistribution: React.FC<TreasuryAssetDistributionProps> = ({
  treasury,
  ethPriceUsd = 3200,
}) => {
  // 1. Calculate asset valuations in USD
  const ethValueUsd = treasury.ethBalance * ethPriceUsd;
  const tokenAValueUsd = treasury.tokenABalance; // gUSD 1:1
  const stakedAssetsValueUsd = treasury.totalCapitalReinvested;

  const totalValueUsd = ethValueUsd + tokenAValueUsd + stakedAssetsValueUsd;

  const data = [
    {
      name: 'gUSD Liquid Reserve (tokenABalance)',
      key: 'tokenABalance',
      value: tokenAValueUsd,
      rawAmount: treasury.tokenABalance,
      unit: 'gUSD',
      color: '#10b981', // emerald-500
      percentage: totalValueUsd > 0 ? (tokenAValueUsd / totalValueUsd) * 100 : 0,
    },
    {
      name: 'ETH Reserve (ethBalance)',
      key: 'ethBalance',
      value: ethValueUsd,
      rawAmount: treasury.ethBalance,
      unit: 'ETH',
      color: '#0ea5e9', // sky-500
      percentage: totalValueUsd > 0 ? (ethValueUsd / totalValueUsd) * 100 : 0,
    },
    {
      name: 'Staked Assets (totalCapitalReinvested)',
      key: 'stakedAssets',
      value: stakedAssetsValueUsd,
      rawAmount: treasury.totalCapitalReinvested,
      unit: 'gUSD',
      color: '#6366f1', // indigo-500
      percentage: totalValueUsd > 0 ? (stakedAssetsValueUsd / totalValueUsd) * 100 : 0,
    },
  ];

  return (
    <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-emerald-400" />
            <span>Treasury Asset Distribution</span>
            <span className="text-[11px] text-slate-500 font-mono font-normal">
              (Recharts Powered)
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Allocation breakdown between <code className="text-slate-300 font-mono">ethBalance</code>,{' '}
            <code className="text-slate-300 font-mono">tokenABalance</code>, and derived{' '}
            <code className="text-slate-300 font-mono">stakedAssets</code>
          </p>
        </div>

        <div className="text-left sm:text-right font-mono">
          <div className="text-xs text-slate-400">Total Treasury Capital</div>
          <div className="text-lg font-bold text-white tabular-nums">
            ${totalValueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      {/* Main Content: Recharts ResponsiveContainer & Breakdown List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Recharts Pie Chart */}
        <div className="lg:col-span-5 h-[240px] flex items-center justify-center relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={3}
                stroke="#0b0f17"
                strokeWidth={2}
              >
                {data.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center Readout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
              Allocated
            </span>
            <span className="text-base font-bold text-white font-mono tabular-nums leading-tight mt-0.5">
              100%
            </span>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              3 asset classes
            </span>
          </div>
        </div>

        {/* Legend Cards */}
        <div className="lg:col-span-7 space-y-3">
          <div className="space-y-2">
            {data.map((item) => (
              <div
                key={item.key}
                className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/60 hover:bg-slate-800/30 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="truncate">
                    <div className="text-xs font-semibold text-slate-200 truncate">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {item.rawAmount.toLocaleString(undefined, { maximumFractionDigits: 1 })} {item.unit}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono">
                  <div className="text-xs font-bold text-slate-100 tabular-nums">
                    ${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-[11px] text-emerald-400 font-semibold tabular-nums">
                    {item.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Allocation Bar */}
          <div className="pt-2">
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
              {data.map((item) => (
                <div
                  key={item.key}
                  style={{
                    width: `${item.percentage}%`,
                    backgroundColor: item.color,
                  }}
                  className="h-full transition-all duration-300"
                  title={`${item.name}: ${item.percentage.toFixed(1)}%`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-mono">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Liquid Treasury Ratio: {((tokenAValueUsd + ethValueUsd) / totalValueUsd * 100).toFixed(1)}%</span>
              </span>
              <span>Reinvested: {((stakedAssetsValueUsd) / totalValueUsd * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
