import React, { useState } from 'react';
import { X, PlusCircle, ShieldAlert } from 'lucide-react';
import { ProtocolType } from '../types/garden';

interface DeployChildModalProps {
  onClose: () => void;
  onDeploy: (
    type: ProtocolType,
    name: string,
    swapFeeBps: number,
    gardenFeeShareBps: number,
    seedCapital: number
  ) => void;
  maxTreasuryAvailable: number;
}

export const DeployChildModal: React.FC<DeployChildModalProps> = ({
  onClose,
  onDeploy,
  maxTreasuryAvailable,
}) => {
  const [type, setType] = useState<ProtocolType>('SIMPLE_AMM');
  const [name, setName] = useState('AMM Experiment - Custom Trait');
  const [swapFeeBps, setSwapFeeBps] = useState(40); // 0.40%
  const [gardenFeeShareBps, setGardenFeeShareBps] = useState(2500); // 25%
  const [seedCapital, setSeedCapital] = useState(10000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (seedCapital > maxTreasuryAvailable) return;
    onDeploy(type, name, swapFeeBps, gardenFeeShareBps, seedCapital);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-semibold text-white">Deploy Child Protocol</h3>
            <p className="text-xs text-slate-400">Instantiate a new experiment via GardenCore Factory</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Protocol Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Child Protocol Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setType('SIMPLE_AMM');
                  setName('AMM Experiment - Custom Trait');
                }}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-left transition-colors ${
                  type === 'SIMPLE_AMM'
                    ? 'bg-slate-800 text-white border-emerald-500/50'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800/40'
                }`}
              >
                <div className="font-semibold text-slate-200">Constant AMM Pair</div>
                <div className="text-[11px] text-slate-500">x * y = k swap pool</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('YIELD_VAULT');
                  setName('Fee Yield Vault - Gen Custom');
                }}
                className={`py-2 px-3 text-xs font-medium rounded-lg border text-left transition-colors ${
                  type === 'YIELD_VAULT'
                    ? 'bg-slate-800 text-white border-emerald-500/50'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800/40'
                }`}
              >
                <div className="font-semibold text-slate-200">Fee Yield Vault</div>
                <div className="text-[11px] text-slate-500">Compounding fee vault</div>
              </button>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Instance Label</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700"
              required
            />
          </div>

          {/* Fee Tier */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">
                {type === 'SIMPLE_AMM' ? 'Swap Fee Tier' : 'Deposit Fee Tier'}
              </span>
              <span className="font-mono text-emerald-400 font-semibold">
                {(swapFeeBps / 100).toFixed(2)}% ({swapFeeBps} bps)
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="200"
              value={swapFeeBps}
              onChange={(e) => setSwapFeeBps(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Garden Revenue Cut */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Garden Treasury Revenue Share</span>
              <span className="font-mono text-emerald-400 font-semibold">
                {(gardenFeeShareBps / 100).toFixed(0)}% ({gardenFeeShareBps} bps)
              </span>
            </div>
            <input
              type="range"
              min="1000"
              max="5000"
              step="500"
              value={gardenFeeShareBps}
              onChange={(e) => setGardenFeeShareBps(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Non-bypassable fee percentage routed back into Garden treasury on each interaction.
            </p>
          </div>

          {/* Seed Capital Allocation */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Seed Capital from Treasury</span>
              <span className="font-mono text-slate-400">
                Max Available: {maxTreasuryAvailable.toLocaleString()} gUSD
              </span>
            </div>
            <input
              type="number"
              min="1000"
              max={maxTreasuryAvailable}
              step="1000"
              value={seedCapital}
              onChange={(e) => setSeedCapital(Number(e.target.value))}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-slate-700"
              required
            />
          </div>

          <button
            type="submit"
            disabled={seedCapital > maxTreasuryAvailable || seedCapital <= 0}
            className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow disabled:opacity-50"
          >
            Authorize & Deploy via Garden Factory
          </button>
        </form>
      </div>
    </div>
  );
};
