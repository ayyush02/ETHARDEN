import React, { useState } from 'react';
import { Play, Pause, AlertTriangle, ArrowRightLeft, DollarSign, Check, Copy } from 'lucide-react';
import { ChildProtocol, ChildStatus } from '../types/garden';

interface ChildProtocolGridProps {
  children: ChildProtocol[];
  onHarvestChild: (childAddress: string) => void;
  onTogglePause: (childAddress: string) => void;
  onSunsetChild: (childAddress: string) => void;
  onOpenSwapModal: (child: ChildProtocol) => void;
  onOpenDeployModal: () => void;
}

export const ChildProtocolGrid: React.FC<ChildProtocolGridProps> = ({
  children,
  onHarvestChild,
  onTogglePause,
  onSunsetChild,
  onOpenSwapModal,
  onOpenDeployModal,
}) => {
  const [filter, setFilter] = useState<'all' | 'Active' | 'Paused' | 'Sunset'>('all');
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  const filteredChildren = children.filter((c) => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddr(address);
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Child Protocol Registry</h2>
          <p className="text-xs text-slate-400">
            Deployed contracts implementing <code className="text-emerald-400 font-mono">IGardenChild</code> and <code className="text-emerald-400 font-mono">BaseGardenChild</code>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Segmented Filter Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-lg border border-slate-800">
            {(['all', 'Active', 'Paused', 'Sunset'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  filter === tab
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'all' ? 'All Children' : tab}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenDeployModal}
            className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors whitespace-nowrap"
          >
            Deploy Instance
          </button>
        </div>
      </div>

      {/* Children Grid */}
      {filteredChildren.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-900/30 border border-slate-800/80 space-y-3">
          <p className="text-sm text-slate-400">No child protocols found with status "{filter}".</p>
          <button
            onClick={() => setFilter('all')}
            className="text-xs text-emerald-400 hover:underline font-medium"
          >
            Reset filter to show all protocols
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredChildren.map((child) => {
            const isAMM = child.type === 'SIMPLE_AMM';
            const feeTierPct = isAMM
              ? ((child.swapFeeBps || 30) / 100).toFixed(2)
              : ((child.depositFeeBps || 25) / 100).toFixed(2);
            const gardenCutPct = ((child.gardenFeeShareBps || 2000) / 100).toFixed(0);

            return (
              <div
                key={child.address}
                className={`p-5 rounded-xl border transition-all space-y-4 ${
                  child.status === 'Active'
                    ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700/80'
                    : child.status === 'Paused'
                    ? 'bg-amber-950/20 border-amber-800/40'
                    : 'bg-slate-950/60 border-slate-900 opacity-70'
                }`}
              >
                {/* Header: Title, Gen, Status Text */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{child.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono">Gen {child.generation}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] font-mono text-slate-400 truncate max-w-[150px]">
                        {child.address}
                      </span>
                      <button
                        onClick={() => handleCopy(child.address)}
                        className="text-slate-500 hover:text-slate-300"
                        title="Copy address"
                      >
                        {copiedAddr === child.address ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs font-medium ${
                        child.status === 'Active'
                          ? 'text-emerald-400'
                          : child.status === 'Paused'
                          ? 'text-amber-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {child.status}
                    </span>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                      ROI: {child.score.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Economic Traits (Fee Tiers & Capital) */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/60">
                  <div>
                    <div className="text-[11px] text-slate-500">Protocol Type</div>
                    <div className="text-slate-200 font-medium">
                      {isAMM ? 'Constant AMM (x*y=k)' : 'Fee Yield Vault'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Fee Tier / Garden Share</div>
                    <div className="text-slate-200 font-mono">
                      {feeTierPct}% · <span className="text-emerald-400">{gardenCutPct}% to Garden</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Initial Seed Capital</div>
                    <div className="text-slate-300 font-mono tabular-nums">
                      {child.seedCapital.toLocaleString()} {child.seedToken}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Processed Volume</div>
                    <div className="text-slate-300 font-mono tabular-nums">
                      ${child.totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>

                {/* Reserves & Accrued Garden Fees */}
                {isAMM && child.reserve0 !== undefined && child.reserve1 !== undefined && (
                  <div className="p-2.5 rounded-lg bg-slate-950/50 border border-slate-800/60 text-xs font-mono space-y-1">
                    <div className="text-[11px] text-slate-400">Pair Liquidity Reserves:</div>
                    <div className="flex items-center justify-between text-slate-300 text-[11px]">
                      <span>{child.token0Symbol}: {child.reserve0.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                      <span>{child.token1Symbol}: {child.reserve1.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                    </div>
                  </div>
                )}

                {/* Revenue Stats & Harvest Button */}
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[11px] text-slate-500">Accrued Garden Fee</div>
                    <div className="text-emerald-400 font-mono font-medium tabular-nums">
                      {child.accruedGardenFees.toFixed(2)} {child.seedToken}
                    </div>
                  </div>
                  <button
                    onClick={() => onHarvestChild(child.address)}
                    disabled={child.accruedGardenFees === 0 || child.status === 'Sunset'}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      child.accruedGardenFees > 0 && child.status !== 'Sunset'
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/80'
                        : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                    }`}
                  >
                    Harvest Revenue
                  </button>
                </div>

                {/* Action Controls */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                  {isAMM && child.status === 'Active' && (
                    <button
                      onClick={() => onOpenSwapModal(child)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Execute Swap</span>
                    </button>
                  )}

                  {child.status !== 'Sunset' && (
                    <button
                      onClick={() => onTogglePause(child.address)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                      title={child.status === 'Active' ? 'Emergency Pause' : 'Unpause'}
                    >
                      {child.status === 'Active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  {child.status !== 'Sunset' && (
                    <button
                      onClick={() => onSunsetChild(child.address)}
                      className="px-2.5 py-1.5 text-xs font-medium text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 rounded-md transition-colors"
                      title="Sunset Child Protocol & Sweep Liquidity"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
