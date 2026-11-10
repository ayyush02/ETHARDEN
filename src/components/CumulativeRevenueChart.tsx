import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { EpochRecord } from '../types/garden';
import { TrendingUp, DollarSign, Calendar, Layers } from 'lucide-react';

interface CumulativeRevenueChartProps {
  epochs: EpochRecord[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload: {
      epochNumber: number;
      epochLabel: string;
      epochHarvested: number;
      cumulativeRevenue: number;
      activeChildren: number;
      avgRoi: number;
    };
  }>;
}

const CustomRevenueTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div className="p-3 rounded-lg bg-slate-900/95 border border-slate-700 shadow-2xl text-xs font-mono space-y-1.5 min-w-[200px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="font-semibold text-white">{data.epochLabel}</span>
          <span className="text-[11px] text-slate-400">{data.activeChildren} Active Protocols</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Cumulative Revenue:</span>
          <span className="font-bold text-emerald-400 tabular-nums">
            ${data.cumulativeRevenue.toLocaleString()} gUSD
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Harvested in Epoch:</span>
          <span className="font-medium text-slate-200 tabular-nums">
            +${data.epochHarvested.toLocaleString(undefined, { maximumFractionDigits: 1 })} gUSD
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5 border-t border-slate-800/60">
          <span>Avg Child ROI:</span>
          <span className="text-indigo-400 font-semibold">{data.avgRoi.toFixed(1)}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export const CumulativeRevenueChart: React.FC<CumulativeRevenueChartProps> = ({ epochs }) => {
  const [viewMode, setViewMode] = useState<'cumulative' | 'both'>('cumulative');

  // Take the past 10 epochs
  const past10Epochs = epochs.slice(-10);

  // Compute baseline revenue for epochs prior to the 10-epoch window
  const startIndex = Math.max(0, epochs.length - 10);
  const baselineRevenue = epochs
    .slice(0, startIndex)
    .reduce((sum, ep) => sum + ep.totalHarvested, 0);

  let runningCumulative = baselineRevenue;
  const chartData = past10Epochs.map((ep) => {
    runningCumulative += ep.totalHarvested;
    return {
      epochNumber: ep.epochNumber,
      epochLabel: `Epoch ${ep.epochNumber}`,
      epochHarvested: Math.round(ep.totalHarvested),
      cumulativeRevenue: Math.round(runningCumulative),
      activeChildren: ep.activeChildrenCount,
      avgRoi: ep.avgRoiBps,
    };
  });

  const latestCumulative = chartData.length > 0 ? chartData[chartData.length - 1].cumulativeRevenue : 0;
  const latestHarvest = chartData.length > 0 ? chartData[chartData.length - 1].epochHarvested : 0;
  const avgHarvestPerEpoch =
    chartData.length > 0
      ? Math.round(chartData.reduce((sum, d) => sum + d.epochHarvested, 0) / chartData.length)
      : 0;

  return (
    <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 space-y-5">
      {/* Header with Title and Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Cumulative Revenue Trajectory</span>
            <span className="text-[11px] text-slate-500 font-mono font-normal">
              (Past {past10Epochs.length} Epochs)
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Historical protocol fee yield and compounded treasury revenue returned from evolved child protocols
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('cumulative')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                viewMode === 'cumulative'
                  ? 'bg-slate-800 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cumulative Only
            </button>
            <button
              onClick={() => setViewMode('both')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                viewMode === 'both'
                  ? 'bg-slate-800 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Compare with Epoch Fees
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
          <div className="text-[11px] text-slate-400">Past 10-Epoch Cumulative</div>
          <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums mt-0.5">
            ${latestCumulative.toLocaleString()} <span className="text-xs text-slate-400 font-normal">gUSD</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
          <div className="text-[11px] text-slate-400">Latest Epoch Harvest</div>
          <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
            +${latestHarvest.toLocaleString()} <span className="text-xs text-slate-400 font-normal">gUSD</span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
          <div className="text-[11px] text-slate-400">Average Revenue Velocity</div>
          <div className="text-lg font-bold text-indigo-400 font-mono tabular-nums mt-0.5">
            ~${avgHarvestPerEpoch.toLocaleString()} <span className="text-xs text-slate-400 font-normal">/ epoch</span>
          </div>
        </div>
      </div>

      {/* Recharts AreaChart Viewport */}
      <div className="h-[280px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cumulativeRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="epochHarvestedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="epochLabel"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />

            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
            />

            <Tooltip content={<CustomRevenueTooltip />} />

            {viewMode === 'both' && (
              <Area
                type="monotone"
                dataKey="epochHarvested"
                name="Epoch Harvest"
                stroke="#6366f1"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#epochHarvestedGradient)"
              />
            )}

            <Area
              type="monotone"
              dataKey="cumulativeRevenue"
              name="Cumulative Revenue"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#cumulativeRevenueGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer / Caption */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono border-t border-slate-800/60 pt-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span className="text-slate-400">Cumulative Revenue</span>
          </div>
          {viewMode === 'both' && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
              <span className="text-slate-400">Per-Epoch Harvest</span>
            </div>
          )}
        </div>
        <div>Compounding fee yield from genetic parameter selection</div>
      </div>
    </div>
  );
};
