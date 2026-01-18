
import React from 'react';
import { StockRecommendation, MarketData } from '../types';
import { TrendingUp, TrendingDown, Zap, BarChart2, Target, Scan, Star, ExternalLink, ShieldCheck } from 'lucide-react';
import { getMarketStatus } from '../services/marketStatusService';

interface StockCardProps {
  stock: StockRecommendation;
  marketData: MarketData;
  onTrade: (stock: StockRecommendation) => void;
}

export const StockCard: React.FC<StockCardProps> = React.memo(({ stock, marketData, onTrade }) => {
  const currentData = marketData[stock.symbol];
  const price = currentData ? currentData.price : stock.currentPrice;
  const change = currentData ? currentData.changePercent : 0;
  const isPositive = change >= 0;
  
  const marketStatus = getMarketStatus(stock.type);
  const isMarketOpen = marketStatus.isOpen;
  
  const tech = currentData?.technicals;
  const score = tech?.score || stock.score || 0;

  const upside = ((stock.targetPrice - price) / price) * 100;

  let theme = {
      border: stock.isTopPick ? 'border-indigo-500/50' : 'border-slate-700',
      bgGradient: stock.isTopPick ? 'from-slate-900 via-indigo-900/10 to-slate-900' : 'from-slate-800 to-slate-900',
      iconColor: stock.isTopPick ? 'text-indigo-400' : 'text-blue-400',
      accent: 'text-slate-200',
      glow: stock.isTopPick ? 'shadow-[0_0_20px_-5px_rgba(79,70,229,0.3)]' : 'shadow-none',
      badgeBg: 'bg-slate-700'
  };

  const timeframeColors: Record<string, string> = {
    'INTRADAY': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'BTST': 'bg-green-500/20 text-green-400 border-green-500/30',
    'WEEKLY': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'MONTHLY': 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  };

  return (
    <div className={`rounded-2xl p-4 border ${theme.border} bg-gradient-to-br ${theme.bgGradient} transition-all duration-300 shadow-xl group relative overflow-hidden ${theme.glow} hover:scale-[1.01]`}>
      {stock.isTopPick && (
          <div className="absolute top-0 left-0 bg-indigo-600 text-white px-3 py-1 text-[9px] font-black uppercase tracking-tighter flex items-center gap-1.5 z-20 rounded-br-xl shadow-lg">
              <Star size={10} fill="white" className="animate-pulse" /> AI ROBOT PICK
          </div>
      )}

      <div className="absolute top-0 right-0 p-3 text-right z-10 flex flex-col items-end gap-2">
         <div className={`bg-slate-900/80 backdrop-blur-md border ${stock.isTopPick ? 'border-indigo-500/50' : 'border-slate-700'} rounded-xl px-3 py-1.5 text-[11px] font-black font-mono flex items-center justify-end gap-1.5 shadow-sm`}>
            <ShieldCheck size={12} className={stock.isTopPick ? 'text-indigo-400' : 'text-blue-400'} />
            <span className="text-white">{score.toFixed(0)}</span>
         </div>
         {stock.timeframe && (
             <div className={`px-2 py-0.5 rounded-lg text-[8px] font-black border uppercase tracking-widest ${timeframeColors[stock.timeframe] || 'bg-slate-800 text-slate-400'}`}>
                 {stock.timeframe}
             </div>
         )}
      </div>

      <div className="flex justify-between items-start mb-4 pr-16 relative z-10">
        <div>
          <h3 className={`text-lg md:text-xl font-black flex items-center gap-2 tracking-tight ${theme.accent}`}>
            {stock.symbol.split('.')[0]}
          </h3>
          <div className="flex gap-1.5 mt-1.5">
              <span className={`text-[8px] px-2 py-0.5 rounded-md border border-slate-700 bg-slate-800/80 text-slate-400 font-black uppercase tracking-widest`}>
                  NSE EQUITY
              </span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end mb-4 relative z-10">
          <div className="flex-1">
            <div className="text-xl md:text-3xl font-mono font-black text-white tracking-tighter">
                ₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <div className={`text-[11px] flex items-center gap-1 font-black tracking-tight ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {change.toFixed(2)}%
            </div>
          </div>
          <div className="text-right">
             <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest flex items-center justify-end gap-1 mb-1"><Target size={10}/> Target</div>
             <div className="text-lg md:text-xl font-black text-green-400 font-mono flex flex-col items-end leading-none">
                 ₹{stock.targetPrice.toFixed(2)}
                 <span className="text-[9px] text-green-500/70 mt-1.5 font-bold">+{upside.toFixed(1)}% POTENTIAL</span>
             </div>
          </div>
      </div>

      <div className="flex items-center gap-2 mb-4 bg-slate-900/40 border border-slate-800/50 p-2.5 rounded-xl relative z-10 backdrop-blur-sm">
          <Scan size={14} className={stock.isTopPick ? 'text-indigo-400' : 'text-blue-400'} />
          <div className="text-[10px] md:text-[11px] leading-tight text-slate-300 italic line-clamp-2 font-medium">
              {stock.reason}
          </div>
      </div>

      <div className="flex gap-2 relative z-10">
        <button
            onClick={() => isMarketOpen && onTrade(stock)}
            disabled={!isMarketOpen}
            className={`flex-1 py-3 rounded-xl font-black text-white transition-all text-xs tracking-widest shadow-lg ${
                !isMarketOpen ? 'bg-slate-700 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-blue-500/20'
            }`}
        >
            {isMarketOpen ? 'EXECUTE TRADE' : 'MARKET CLOSED'}
        </button>
        {stock.sourceUrl && (
            <a href={stock.sourceUrl} target="_blank" rel="noreferrer" className="p-3 bg-slate-800 rounded-xl text-slate-500 hover:text-white transition-colors border border-slate-700 hover:border-blue-500/50">
                <ExternalLink size={18}/>
            </a>
        )}
      </div>
    </div>
  );
});
