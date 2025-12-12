import React from 'react';
import { PortfolioItem, MarketData, HoldingAnalysis } from '../types';
import { TrendingUp, PieChart, Sparkles, RefreshCw } from 'lucide-react';

interface PageLivePositionsProps {
  holdings: PortfolioItem[];
  marketData: MarketData;
  analysisData: Record<string, HoldingAnalysis>;
  onSell: (symbol: string, broker: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  totalPnl: number;
  totalCapital: number;
}

const currency = (v: number) =>
  `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const pct = (v: number) => `${v.toFixed(2)}%`;

export const PageLivePositions: React.FC<PageLivePositionsProps> = ({
  holdings,
  marketData,
  analysisData,
  onSell,
  onAnalyze,
  isAnalyzing,
  totalPnl,
  totalCapital,
}) => {
  const currentVal = holdings.reduce((acc, h) => {
    const price = marketData[h.symbol]?.price ?? h.avgCost;
    return acc + price * h.quantity;
  }, 0);

  const totalCost = holdings.reduce((acc, h) => acc + h.totalCost, 0);
  const pnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  const isPnlNeg = totalPnl < 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-3 py-4 md:px-6 md:py-6">
      {/* Header */}
      <div className="mb-5">
        <div className="inline-flex items-center rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Live Positions
        </div>
        <h1 className="mt-3 text-2xl md:text-3xl font-semibold text-slate-50">
          Real-time P&amp;L tracking
        </h1>
        <p className="mt-1 text-xs md:text-sm text-slate-400">
          All open positions across brokers with AI views per stock.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 md:grid-cols-3 mb-6">
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-rose-500/10 p-4 shadow-lg shadow-slate-900/70">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                Total P&amp;L
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  className={`text-2xl md:text-3xl font-semibold ${
                    isPnlNeg ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {totalPnl >= 0 ? '+' : ''}
                  {currency(Math.abs(totalPnl))}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    isPnlNeg
                      ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {isPnlNeg ? '▼' : '▲'} {pct(pnlPercent)} Return
                </span>
              </div>
            </div>
            <div className="h-12 w-12 rounded-full bg-slate-900/70 border border-slate-700 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Mark-to-market P&amp;L across all open positions.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <PieChart className="h-3.5 w-3.5 text-sky-400" />
            Portfolio Snapshot
          </div>
          <div className="mt-2 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Current Value</span>
              <span className="font-semibold text-slate-50">
                {currency(currentVal)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-slate-400">Invested Capital</span>
              <span className="font-medium text-slate-100">
                {currency(totalCost)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-slate-400">Deployed vs Capital</span>
              <span className="text-xs font-medium text-slate-200">
                {totalCapital > 0
                  ? `${pct((totalCost / totalCapital) * 100)} used`
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                AI Portfolio Analysis
              </span>
              <button
                onClick={onAnalyze}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-1 rounded-full border border-sky-500/50 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-200 hover:bg-sky-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Scanning…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Run AI Scan
                  </>
                )}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Uses your indicator engine to score each position and surface
              high‑conviction adds, trims, and exits.
            </p>
          </div>
        </div>
      </div>

      {/* Positions table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm md:text-base font-semibold text-slate-50">
              Open Positions ({holdings.length})
            </h2>
            <p className="text-[11px] text-slate-400">
              Per‑stock P&amp;L with AI recommendation and action buttons.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-3 py-2 text-left">Symbol</th>
                <th className="px-3 py-2 text-left">Broker</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Avg Cost</th>
                <th className="px-3 py-2 text-right">LTP</th>
                <th className="px-3 py-2 text-right">P/L</th>
                <th className="px-3 py-2 text-left">AI View</th>
                <th className="px-3 py-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="text-xs md:text-sm">
              {holdings.map((h) => {
                const mkt = marketData[h.symbol];
                const ltp = mkt?.price ?? h.avgCost;
                const pnl = (ltp - h.avgCost) * h.quantity;
                const pnlPct =
                  h.avgCost > 0
                    ? (pnl / (h.avgCost * h.quantity)) * 100
                    : 0;
                const negative = pnl < 0;

                const analysis = analysisData[h.symbol];
                const aiText =
                  analysis?.signalStrength && analysis?.reasons
                    ? `${analysis.signalStrength}: ${analysis.reasons.slice(
                        0,
                        80
                      )}${analysis.reasons.length > 80 ? '…' : ''}`
                    : analysis?.signalStrength || '—';

                return (
                  <tr
                    key={`${h.symbol}-${h.broker}`}
                    className="border-t border-slate-800/70 hover:bg-slate-900/80 transition-colors"
                  >
                    <td className="px-3 py-2 font-medium text-slate-100">
                      {h.symbol}
                    </td>
                    <td className="px-3 py-2 text-slate-300">{h.broker}</td>
                    <td className="px-3 py-2 text-right text-slate-200">
                      {h.quantity}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-200">
                      {currency(h.avgCost)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-200">
                      {currency(ltp)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          negative
                            ? 'bg-rose-500/10 text-rose-300'
                            : 'bg-emerald-500/10 text-emerald-300'
                        }`}
                      >
                        <span>{currency(Math.abs(pnl))}</span>
                        <span className="opacity-80">
                          ({negative ? '-' : '+'}
                          {pct(Math.abs(pnlPct))})
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-300 max-w-[260px]">
                      {aiText}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => onSell(h.symbol, h.broker)}
                        className="rounded-full border border-rose-500/60 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/20"
                      >
                        Sell
                      </button>
                    </td>
                  </tr>
                );
              })}
              {holdings.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-6 text-center text-[11px] text-slate-500"
                  >
                    No open positions. Connect broker or start trading to see
                    live data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
