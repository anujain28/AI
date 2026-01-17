
import React from 'react';
import { PortfolioItem, MarketData, AssetType, HoldingAnalysis } from '../types';
import { TrendingUp, TrendingDown, DollarSign, Globe, BarChart2, Box, Cpu, Info, X } from 'lucide-react';

interface PortfolioTableProps {
  portfolio: PortfolioItem[];
  marketData: MarketData;
  analysisData?: Record<string, HoldingAnalysis>;
  onSell: (symbol: string, broker: any) => void;
  showAiInsights?: boolean;
  hideBroker?: boolean;
}

export const PortfolioTable: React.FC<PortfolioTableProps> = ({ 
  portfolio, 
  marketData, 
  analysisData = {}, 
  onSell, 
  showAiInsights = true,
  hideBroker = false
}) => {
  if (portfolio.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 md:h-64 text-slate-500 bg-surface rounded-xl border border-slate-800 border-dashed m-2">
        <DollarSign size={32} className="mb-2 opacity-50 text-slate-600" />
        <p className="text-xs">No holdings yet. Start trading!</p>
      </div>
    );
  }

  const getAssetIcon = (type: AssetType) => {
      // Fix: Now comparable as AssetType includes these values
      switch(type) {
          case 'MCX': return <Globe size={14} className="text-yellow-400" />;
          case 'FOREX': return <DollarSign size={14} className="text-green-400" />;
          case 'CRYPTO': return <Cpu size={14} className="text-purple-400" />;
          default: return <BarChart2 size={14} className="text-blue-400" />;
      }
  };

  const getBrokerBadge = (broker: string) => {
      let colorClass = 'bg-slate-700 border-slate-600 text-slate-300';
      if (broker === 'DHAN') colorClass = 'bg-purple-900/30 border-purple-700/50 text-purple-300';
      else if (broker === 'SHOONYA') colorClass = 'bg-orange-900/30 border-orange-700/50 text-orange-300';
      else if (broker === 'ZERODHA') colorClass = 'bg-red-900/30 border-red-700/50 text-red-300';
      else if (broker === 'BINANCE') colorClass = 'bg-yellow-900/30 border-yellow-700/50 text-yellow-300';
      else if (broker === 'COINDCX') colorClass = 'bg-blue-900/30 border-blue-700/50 text-blue-300';
      return <span className={`text-[9px] px-1 py-0.5 rounded border ${colorClass}`}>{broker.substring(0,4)}</span>;
  };

  const formatCurrency = (val: number) => {
      return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="overflow-x-auto bg-surface rounded-xl border border-slate-800 shadow-xl custom-scrollbar">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-800/80 text-slate-400 text-[9px] md:text-xs uppercase tracking-wider backdrop-blur-sm sticky top-0 z-10">
            <th className="p-2 md:p-3 font-bold">Symbol</th>
            <th className="p-2 md:p-3 font-bold text-right hidden md:table-cell">Qty</th>
            <th className="p-2 md:p-3 font-bold text-right hidden md:table-cell">Avg</th>
            <th className="p-2 md:p-3 font-bold text-right">LTP</th>
            <th className="p-2 md:p-3 font-bold text-right hidden md:table-cell text-slate-300">Invested</th>
            <th className="p-2 md:p-3 font-bold text-right hidden md:table-cell text-white">Value</th>
            <th className="p-2 md:p-3 font-bold text-right">P&L</th>
            {showAiInsights && <th className="p-2 md:p-3 font-bold text-center hidden md:table-cell">AI</th>}
            <th className="p-2 md:p-3 font-bold text-center w-10 md:w-16">Act</th>
          </tr>
        </thead>
        <tbody>
          {portfolio.map((item, idx) => {
            const currentPrice = marketData[item.symbol]?.price || item.avgCost;
            
            const investedAmount = item.totalCost;
            const currentValue = currentPrice * item.quantity;
            
            const pl = currentValue - investedAmount;
            const plPercent = investedAmount > 0 ? (pl / investedAmount) * 100 : 0;
            const isProfit = pl >= 0;
            
            const analysis = analysisData[item.symbol];

            return (
              <tr key={`${item.symbol}-${item.broker}-${idx}`} className="border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors text-[10px] md:text-sm group">
                
                {/* Symbol Col */}
                <td className="p-2 md:p-3">
                    <div className="flex items-center gap-2 md:gap-3">
                        <div className="p-1.5 md:p-2 bg-slate-800 rounded-lg border border-slate-700/50 hidden md:block">
                            {getAssetIcon(item.type)}
                        </div>
                        <div>
                            <div className="font-bold text-white tracking-wide text-[10px] md:text-sm truncate max-w-[70px] md:max-w-none">{item.symbol}</div>
                            <div className="flex gap-1 mt-0.5 items-center">
                                {!hideBroker && getBrokerBadge(item.broker)}
                                <span className="md:hidden text-[8px] text-slate-400 whitespace-nowrap">x{item.quantity}</span>
                            </div>
                        </div>
                    </div>
                </td>
                
                {/* Desktop Cols */}
                <td className="p-3 text-right text-slate-300 font-mono hidden md:table-cell">{item.quantity.toFixed(item.type === 'CRYPTO' ? 4 : 0)}</td>
                <td className="p-3 text-right text-slate-400 font-mono hidden md:table-cell">{formatCurrency(item.avgCost)}</td>
                
                {/* LTP */}
                <td className="p-2 md:p-3 text-right text-white font-mono font-medium text-[10px] md:text-sm">
                    {formatCurrency(currentPrice)}
                </td>
                
                {/* Desktop Cols */}
                <td className="p-3 text-right text-slate-400 font-mono hidden md:table-cell">
                    {formatCurrency(investedAmount)}
                </td>
                <td className="p-3 text-right text-white font-mono font-bold hidden md:table-cell">
                    {formatCurrency(currentValue)}
                </td>

                {/* P&L - Horizontal on Mobile, Stacked on Desktop */}
                <td className={`p-2 md:p-3 text-right font-bold font-mono ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                  <div className="flex flex-row md:flex-col items-center justify-end gap-1 md:items-end md:gap-0">
                    <span className="whitespace-nowrap">{pl > 0 ? '+' : ''}{formatCurrency(pl)}</span>
                    <span className={`text-[9px] px-1 py-0.5 rounded md:mt-0.5 ${isProfit ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>
                        {plPercent.toFixed(1)}%
                    </span>
                  </div>
                </td>
                
                {/* AI - Desktop */}
                {showAiInsights && (
                    <td className="p-3 text-center hidden md:table-cell">
                    {analysis ? (
                        <div className="group/tooltip relative flex justify-center">
                            <span className={`cursor-help px-2 py-1 rounded text-[10px] font-bold border shadow-sm ${
                                analysis.action === 'BUY' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 
                                analysis.action === 'SELL' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
                                'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            }`}>
                                {analysis.action}
                            </span>
                        </div>
                    ) : (
                        <span className="text-[10px] text-slate-600">-</span>
                    )}
                    </td>
                )}

                {/* Action */}
                <td className="p-2 md:p-3 text-center">
                  <button
                    onClick={() => onSell(item.symbol, item.broker)}
                    className="p-1 md:px-3 md:py-1.5 text-[10px] md:text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-colors"
                  >
                    <span className="hidden md:inline">SELL</span>
                    <span className="md:hidden"><X size={12}/></span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
