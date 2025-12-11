import React from 'react';
import { StockRecommendation, MarketData } from '../types';
import { TrendingUp, TrendingDown, Activity, AlertCircle, Zap, BarChart2, Globe, DollarSign, Box, Cpu, Target, Clock } from 'lucide-react';

interface StockCardProps {
  stock: StockRecommendation;
  marketData: MarketData;
  onTrade: (stock: StockRecommendation) => void;
}

export const StockCard: React.FC<StockCardProps> = ({ stock, marketData, onTrade }) => {
  const currentData = marketData[stock.symbol];
  const price = currentData ? currentData.price : stock.currentPrice;
  const change = currentData ? currentData.changePercent : 0;
  const isPositive = change >= 0;
  
  // Get Technicals
  const tech = currentData?.technicals;
  const score = tech?.score || 0;
  const strength = tech?.signalStrength || 'HOLD';

  const strengthColor = 
    strength === 'STRONG BUY' ? 'text-green-400' :
    strength === 'BUY' ? 'text-blue-400' :
    strength === 'SELL' ? 'text-red-400' : 'text-slate-400';

  // Asset Icon
  const AssetIcon = stock.type === 'MCX' ? Globe : stock.type === 'FOREX' ? DollarSign : stock.type === 'CRYPTO' ? Cpu : BarChart2;

  // Timeframe Badge Color
  const getTimeframeColor = (tf?: string) => {
      switch(tf) {
          case 'INTRADAY': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
          case 'BTST': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
          case 'WEEKLY': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
          case 'MONTHLY': return 'bg-green-500/20 text-green-400 border-green-500/30';
          default: return 'bg-slate-700 text-slate-300 border-slate-600';
      }
  };

  return (
    <div className="bg-surface rounded-xl p-4 border border-slate-700 hover:border-blue-500 transition-all duration-200 shadow-lg group relative overflow-hidden">
      {/* Score Badge */}
      <div className="absolute top-0 right-0 p-2 text-right">
         <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold font-mono flex items-center justify-end gap-1 mb-1">
            <Zap size={10} className="text-yellow-400" />
            Score: {score.toFixed(0)}
         </div>
         <div className={`text-[10px] font-bold uppercase tracking-wider ${strengthColor}`}>
             {strength}
         </div>
      </div>

      <div className="flex justify-between items-start mb-3 pr-20">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <AssetIcon size={16} className="text-slate-500" />
            {stock.symbol}
            {stock.timeframe && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${getTimeframeColor(stock.timeframe)}`}>
                    {stock.timeframe}
                </span>
            )}
          </h3>
          <p className="text-xs text-slate-400">{stock.name}</p>
        </div>
      </div>

      <div className="flex justify-between items-end mb-4">
          <div>
            <div className="text-2xl font-mono font-bold text-white">
                ₹{price.toFixed(2)}
            </div>
            <div className={`text-xs flex items-center gap-1 ${isPositive ? 'text-success' : 'text-danger'}`}>
                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(change).toFixed(2)}%
            </div>
          </div>
          <div className="text-right">
             <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1 mb-0.5"><Target size={10}/> Target</div>
             <div className="text-lg font-bold text-green-400 font-mono">₹{stock.targetPrice}</div>
          </div>
      </div>

      {stock.lotSize !== 1 && (
          <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-2">
              <Box size={10} /> Lot Size: {stock.lotSize}
          </div>
      )}

      <div className="mb-4 space-y-2">
        {/* Active Technical Signals Pills */}
        <div className="flex flex-wrap gap-1.5">
            {tech?.activeSignals.slice(0, 3).map((sig, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    {sig}
                </span>
            ))}
            {(!tech?.activeSignals || tech.activeSignals.length === 0) && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500">
                    No clear signals
                </span>
            )}
        </div>

        {/* Detailed Metrics Strip */}
        <div className="grid grid-cols-3 gap-1 bg-slate-900/50 p-2 rounded-lg text-[10px] font-mono mt-2">
            <div>
                <span className="text-slate-500 block">RSI</span>
                <span className={tech?.rsi < 30 ? 'text-green-400' : tech?.rsi > 70 ? 'text-red-400' : 'text-slate-300'}>
                    {tech?.rsi.toFixed(1)}
                </span>
            </div>
            <div>
                <span className="text-slate-500 block">MACD</span>
                <span className={tech?.macd.histogram > 0 ? 'text-green-400' : 'text-red-400'}>
                    {tech?.macd.macd.toFixed(1)}
                </span>
            </div>
            <div>
                <span className="text-slate-500 block">EMA(9)</span>
                <span className="text-slate-300">
                    {tech?.ema.ema9.toFixed(0)}
                </span>
            </div>
        </div>
      </div>

      <button
        onClick={() => onTrade(stock)}
        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 opacity-90 hover:opacity-100 text-sm"
      >
        Execute Trade
      </button>
    </div>
  );
};