
import React from 'react';
import { StockRecommendation, MarketData } from '../types';
import { TrendingUp, TrendingDown, Zap, BarChart2, Globe, DollarSign, Box, Cpu, Target, Scan } from 'lucide-react';

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

  // --- THEME ENGINE ---
  let theme = {
      border: 'border-slate-700',
      bgGradient: 'from-slate-800 to-slate-900',
      iconColor: 'text-slate-400',
      accent: 'text-slate-200',
      glow: 'shadow-none',
      badgeBg: 'bg-slate-700'
  };

  if (stock.type === 'CRYPTO') {
      theme = {
          border: 'border-purple-500/30 hover:border-purple-500',
          bgGradient: 'from-purple-900/10 to-slate-900',
          iconColor: 'text-purple-400',
          accent: 'text-purple-200',
          glow: 'hover:shadow-[0_0_15px_-3px_rgba(168,85,247,0.3)]',
          badgeBg: 'bg-purple-500/20 text-purple-300'
      };
  } else if (stock.type === 'MCX') {
      theme = {
          border: 'border-yellow-500/30 hover:border-yellow-500',
          bgGradient: 'from-yellow-900/10 to-slate-900',
          iconColor: 'text-yellow-400',
          accent: 'text-yellow-200',
          glow: 'hover:shadow-[0_0_15px_-3px_rgba(234,179,8,0.3)]',
          badgeBg: 'bg-yellow-500/20 text-yellow-300'
      };
  } else if (stock.type === 'FOREX') {
      theme = {
          border: 'border-emerald-500/30 hover:border-emerald-500',
          bgGradient: 'from-emerald-900/10 to-slate-900',
          iconColor: 'text-emerald-400',
          accent: 'text-emerald-200',
          glow: 'hover:shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]',
          badgeBg: 'bg-emerald-500/20 text-emerald-300'
      };
  } else {
      // STOCK
      theme = {
          border: 'border-blue-500/30 hover:border-blue-500',
          bgGradient: 'from-blue-900/10 to-slate-900',
          iconColor: 'text-blue-400',
          accent: 'text-blue-200',
          glow: 'hover:shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]',
          badgeBg: 'bg-blue-500/20 text-blue-300'
      };
  }

  const strengthColor = 
    strength === 'STRONG BUY' ? 'text-green-400 font-bold' :
    strength === 'BUY' ? 'text-blue-400 font-bold' :
    strength === 'SELL' ? 'text-red-400 font-bold' : 'text-slate-400';

  // Asset Icon
  const AssetIcon = stock.type === 'MCX' ? Globe : stock.type === 'FOREX' ? DollarSign : stock.type === 'CRYPTO' ? Cpu : BarChart2;

  // Timeframe Badge Color
  const getTimeframeColor = (tf?: string) => {
      switch(tf) {
          case 'INTRADAY': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
          case 'BTST': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
          case 'WEEKLY': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
          case 'MONTHLY': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
          default: return 'bg-slate-700 text-slate-300 border-slate-600';
      }
  };

  return (
    <div className={`rounded-xl p-4 border ${theme.border} bg-gradient-to-br ${theme.bgGradient} transition-all duration-300 shadow-lg group relative overflow-hidden ${theme.glow}`}>
      {/* Background Decorator */}
      <div className={`absolute -right-6 -top-6 opacity-5 rotate-12 ${theme.iconColor}`}>
           <AssetIcon size={120} />
      </div>

      {/* Score Badge */}
      <div className="absolute top-0 right-0 p-2 text-right z-10">
         <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold font-mono flex items-center justify-end gap-1 mb-1 shadow-sm">
            <Zap size={10} className="text-yellow-400 fill-yellow-400" />
            <span className="text-slate-200">Score: {score.toFixed(0)}</span>
         </div>
         <div className={`text-[10px] uppercase tracking-wider ${strengthColor} bg-slate-900/50 px-1.5 py-0.5 rounded shadow-sm`}>
             {strength}
         </div>
      </div>

      <div className="flex justify-between items-start mb-3 pr-20 relative z-10">
        <div>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${theme.accent}`}>
            <AssetIcon size={18} className={theme.iconColor} />
            {stock.symbol}
            {stock.timeframe && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase shadow-sm ${getTimeframeColor(stock.timeframe)}`}>
                    {stock.timeframe}
                </span>
            )}
          </h3>
          {stock.name !== stock.symbol && (
              <p className="text-xs text-slate-400 font-medium">{stock.name}</p>
          )}
        </div>
      </div>

      <div className="flex justify-between items-end mb-4 relative z-10">
          <div>
            <div className="text-2xl font-mono font-bold text-white tracking-tight drop-shadow-sm">
                ₹{price.toFixed(2)}
            </div>
            <div className={`text-xs flex items-center gap-1 font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {change > 0 ? '+' : ''}{change.toFixed(2)}%
            </div>
          </div>
          <div className="text-right">
             <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1 mb-0.5 font-bold uppercase tracking-wide"><Target size={10}/> Target</div>
             <div className="text-lg font-bold text-green-400 font-mono drop-shadow-sm">₹{stock.targetPrice.toFixed(2)}</div>
          </div>
      </div>

      {/* AI Chart Pattern Logic */}
      <div className="flex items-center gap-2 mb-3 bg-slate-900/60 border border-slate-700/50 p-2 rounded-lg relative z-10 backdrop-blur-sm">
          <Scan size={14} className="text-indigo-400 flex-shrink-0" />
          <div className="text-xs">
              <span className="text-indigo-300 font-bold block">AI Pattern:</span>
              <span className="text-slate-200 italic">{stock.chartPattern || "Trend Follow"}</span>
          </div>
      </div>

      {stock.lotSize !== 1 && (
          <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-2 font-mono">
              <Box size={10} /> Lot: {stock.lotSize}
          </div>
      )}

      <div className="mb-4 space-y-2 relative z-10">
        {/* Active Technical Signals Pills */}
        <div className="flex flex-wrap gap-1.5">
            {tech?.activeSignals.slice(0, 3).map((sig, i) => (
                <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full border shadow-sm ${theme.badgeBg} border-white/5`}>
                    {sig}
                </span>
            ))}
            {(!tech?.activeSignals || tech.activeSignals.length === 0) && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700">
                    Consolidating
                </span>
            )}
        </div>

        {/* Detailed Metrics Strip */}
        <div className="grid grid-cols-3 gap-px bg-slate-700/30 rounded-lg overflow-hidden text-[10px] font-mono mt-2 border border-slate-700/30">
            <div className="bg-slate-900/60 p-1.5 text-center backdrop-blur-sm">
                <span className="text-slate-500 block text-[9px]">RSI</span>
                <span className={`font-bold ${tech?.rsi < 30 ? 'text-green-400' : tech?.rsi > 70 ? 'text-red-400' : 'text-slate-300'}`}>
                    {tech?.rsi.toFixed(0)}
                </span>
            </div>
            <div className="bg-slate-900/60 p-1.5 text-center backdrop-blur-sm">
                <span className="text-slate-500 block text-[9px]">MACD</span>
                <span className={`font-bold ${tech?.macd.histogram > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tech?.macd.macd.toFixed(1)}
                </span>
            </div>
            <div className="bg-slate-900/60 p-1.5 text-center backdrop-blur-sm">
                <span className="text-slate-500 block text-[9px]">EMA</span>
                <span className="text-slate-300 font-bold">
                    {tech?.ema.ema9.toFixed(0)}
                </span>
            </div>
        </div>
      </div>

      <button
        onClick={() => onTrade(stock)}
        className={`w-full py-2.5 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2 text-sm shadow-lg hover:shadow-xl hover:brightness-110 active:scale-[0.98] relative z-10 ${
            stock.type === 'CRYPTO' ? 'bg-purple-600 shadow-purple-500/20' :
            stock.type === 'MCX' ? 'bg-yellow-600 shadow-yellow-500/20' :
            stock.type === 'FOREX' ? 'bg-emerald-600 shadow-emerald-500/20' :
            'bg-blue-600 shadow-blue-500/20'
        }`}
      >
        Trade {stock.symbol}
      </button>
    </div>
  );
};
