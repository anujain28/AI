
import React from 'react';
import { PortfolioItem, MarketData, AssetType, HoldingAnalysis } from '../types';
import { TrendingUp, TrendingDown, DollarSign, Globe, BarChart2, Box, Cpu, Info } from 'lucide-react';

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
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 bg-surface rounded-xl border border-slate-800 border-dashed">
        <DollarSign size={48} className="mb-2 opacity-50 text-slate-600" />
        <p>No holdings yet. Start trading!</p>
      </div>
    );
  }

  const getAssetIcon = (type: AssetType) => {
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
      else if (broker === 'BINANCE') colorClass = 'bg-yellow-900/30 border-yellow-700/50 text-yellow-300';
      else if (broker === 'COINDCX') colorClass = 'bg-blue-900/30 border-blue-700/50 text-blue-300';
      return <span className={`text-[10px] px-2 py-0.5 rounded border ${colorClass}`}>{broker}</span>;
  };

  const formatCurrency = (val: number) => {
      return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="overflow-x-auto bg-surface rounded-xl border border-slate-800 shadow-xl custom-scrollbar">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider backdrop-blur-sm sticky top-0 z-10">
            <th className="p-4 font-bold text-center w-20">Action</th>
            <th className="p-4 font-bold">Symbol</th>
            <th className="p-4 font-bold text-right">Qty</th>
            <th className="p-4 font-bold text-right">Avg Price</th>
            <th className="p-4 font-bold text-right">LTP</th>
            <th className="p-4 font-bold text-right text-slate-300">Invested</th>
            <th className="p-4 font-bold text-right text-white">Cur. Value</th>
            <th className="p-4 font-bold text-right">P&L</th>
            {showAiInsights && <th className="p-4 font-bold text-center">AI Insight</th>}
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
              <tr key={`${item.symbol}-${item.broker}-${idx}`} className="border-b border-slate-800/50 hover:bg-slate-800/50 transition-colors text-sm group">
                <td className="p-4 text-center">
                  <button
                    onClick={() => onSell(item.symbol, item.broker)}
                    className="px-3 py-1.5 text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-colors opacity-80 group-hover:opacity-100"
                  >
                    SELL
                  </button>
                </td>
                <td className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-800 rounded-lg border border-slate-700/50">
                            {getAssetIcon(item.type)}
                        </div>
                        <div>
                            <div className="font-bold text-white tracking-wide">{item.symbol}</div>
                            {!hideBroker && getBrokerBadge(item.broker)}
                        </div>
                    </div>
                </td>
                <td className="p-4 text-right text-slate-300 font-mono">{item.quantity.toFixed(item.type === 'CRYPTO' ? 4 : 0)}</td>
                <td className="p-4 text-right text-slate-400 font-mono text-xs">{formatCurrency(item.avgCost)}</td>
                <td className="p-4 text-right text-white font-mono font-medium">{formatCurrency(currentPrice)}</td>
                
                <td className="p-4 text-right text-slate-400 font-mono text-xs">
                    {formatCurrency(investedAmount)}
                </td>
                
                <td className="p-4 text-right text-white font-mono font-bold">
                    {formatCurrency(currentValue)}
                </td>

                <td className={`p-4 text-right font-bold font-mono ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                  <div className="flex flex-col items-end">
                    <span>{pl > 0 ? '+' : ''}{formatCurrency(pl)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isProfit ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>
                        {plPercent.toFixed(2)}%
                    </span>
                  </div>
                </td>
                
                {showAiInsights && (
                    <td className="p-4 text-center">
                    {analysis ? (
                        <div className="group/tooltip relative flex justify-center">
                            <span className={`cursor-help px-2 py-1 rounded text-[10px] font-bold border shadow-sm ${
                                analysis.action === 'BUY' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 
                                analysis.action === 'SELL' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
                                'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            }`}>
                                {analysis.action}
                            </span>
                            {/* Tooltip */}
                            <div className="absolute right-10 top-0 w-48 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50 hidden group-hover/tooltip:block text-left">
                                <div className="text-[10px] text-slate-300 italic">"{analysis.reason}"</div>
                            </div>
                        </div>
                    ) : (
                        <span className="text-[10px] text-slate-600">-</span>
                    )}
                    </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
