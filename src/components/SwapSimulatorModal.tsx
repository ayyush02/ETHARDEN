import React, { useState } from 'react';
import { X, ArrowDown, ArrowRightLeft, Info, Check } from 'lucide-react';
import { ChildProtocol } from '../types/garden';

interface SwapSimulatorModalProps {
  child: ChildProtocol;
  onClose: () => void;
  onExecuteSwap: (childAddress: string, amountIn: number, tokenIn: 'token0' | 'token1') => void;
}

export const SwapSimulatorModal: React.FC<SwapSimulatorModalProps> = ({
  child,
  onClose,
  onExecuteSwap,
}) => {
  const [amountIn, setAmountIn] = useState<string>('500');
  const [tokenIn, setTokenIn] = useState<'token0' | 'token1'>('token0');

  const res0 = child.reserve0 || 10000;
  const res1 = child.reserve1 || 10000;

  const isToken0 = tokenIn === 'token0';
  const resIn = isToken0 ? res0 : res1;
  const resOut = isToken0 ? res1 : res0;

  const tokenInName = isToken0 ? child.token0Symbol || 'gUSD' : child.token1Symbol || 'gETH';
  const tokenOutName = isToken0 ? child.token1Symbol || 'gETH' : child.token0Symbol || 'gUSD';

  const numericAmountIn = parseFloat(amountIn) || 0;
  const swapFeeBps = child.swapFeeBps || 30;
  const gardenFeeShareBps = child.gardenFeeShareBps || 2000;

  const totalFee = (numericAmountIn * swapFeeBps) / 10000;
  const gardenFee = (totalFee * gardenFeeShareBps) / 10000;
  const lpFee = totalFee - gardenFee;

  // Constant product x * y = k formula
  const amountInWithLPFee = Math.max(0, numericAmountIn - totalFee);
  const amountOut = (resOut * amountInWithLPFee) / (resIn + amountInWithLPFee);
  const slippagePct = resIn > 0 ? ((numericAmountIn / resIn) * 100).toFixed(2) : '0.00';

  const handleSwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmountIn <= 0) return;
    onExecuteSwap(child.address, numericAmountIn, tokenIn);
    onClose();
  };

  const handleSwitchDirection = () => {
    setTokenIn(tokenIn === 'token0' ? 'token1' : 'token0');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-semibold text-white">Execute Test Swap</h3>
            <p className="text-xs text-slate-400 font-mono">{child.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSwap} className="space-y-4">
          {/* Input Token Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>You Pay</span>
              <span>Reserve: {resIn.toLocaleString(undefined, { maximumFractionDigits: 1 })} {tokenInName}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <input
                type="number"
                step="any"
                min="1"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                className="w-full bg-transparent text-xl font-bold font-mono text-white focus:outline-none"
                placeholder="0.0"
              />
              <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-slate-200 border border-slate-700 font-mono shrink-0">
                {tokenInName}
              </span>
            </div>
          </div>

          {/* Switch Direction Button */}
          <div className="flex justify-center -my-2 relative z-10">
            <button
              type="button"
              onClick={handleSwitchDirection}
              className="p-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors shadow"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>

          {/* Output Token Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>You Receive (Estimated)</span>
              <span>Reserve: {resOut.toLocaleString(undefined, { maximumFractionDigits: 1 })} {tokenOutName}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-xl font-bold font-mono text-emerald-400">
                {amountOut.toFixed(4)}
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-slate-200 border border-slate-700 font-mono shrink-0">
                {tokenOutName}
              </span>
            </div>
          </div>

          {/* Fee Routing Breakdown */}
          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 text-xs space-y-1.5 font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Swap Fee Tier</span>
              <span>{(swapFeeBps / 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Total Swap Fee</span>
              <span>{totalFee.toFixed(3)} {tokenInName}</span>
            </div>
            <div className="flex justify-between text-emerald-400 font-medium">
              <span>Garden Revenue Cut ({(gardenFeeShareBps / 100).toFixed(0)}%)</span>
              <span>+{gardenFee.toFixed(3)} {tokenInName}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Price Impact / Slippage</span>
              <span>~{slippagePct}%</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={numericAmountIn <= 0 || amountOut <= 0}
            className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow disabled:opacity-50"
          >
            Confirm Swap & Route Garden Fee
          </button>
        </form>
      </div>
    </div>
  );
};
