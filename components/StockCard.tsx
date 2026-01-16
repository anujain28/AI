import React from 'react';
import { StockRecommendation, MarketData } from '../types';
import { TrendingUp, TrendingDown, Zap, BarChart2, Globe, DollarSign, Target, Scan, Star, ExternalLink } from 'lucide-react';
import { getMarketStatus } from '../services/marketStatusService';

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
  
  const marketStatus = getMarketStatus(stock.type);
  const isMarketOpen = marketStatus.isOpen;
  
  const tech = currentData?.technicals;
  const score = tech?.score || 0;
  const strength = tech?.signalStrength || 'HOLD';

  let theme = {
      border: stock.isTopPick ? 'border-yellow-500/50' : 'border-slate-700',
      bgGradient: stock.isTopPick ? 'from-slate-900 to-indigo-900/20' : 'from-slate-800 to-slate-900',
      iconColor: stock.isTopPick ? 'text-yellow-400' : 'text-blue-400',
      accent: 'text-slate-200',
      glow: stock.isTopPick ? 'shadow-[0_0_15px_-5px_rgba(234,179,8,0.4)]' : 'shadow-none',
      badgeBg: 'bg-slate-700'
  };

  const strengthColor = 
    strength === 'STRONG BUY' ? 'text-green-400 font-bold' :
    strength === 'BUY' ? 'text-blue-400 font-bold' :
    strength === 'SELL' ? 'text-red-400 font-bold' : 'text-slate-400';

  const AssetIcon = stock.type === 'MCX' ? Globe : stock.type === 'FOREX' ? DollarSign : BarChart2;

  return (
    <div className={`rounded-xl p-3 md:p-4 border ${theme.border} bg-gradient-to-br ${theme.bgGradient} transition-all duration-300 shadow-lg group relative overflow-hidden ${theme.glow}`}>
      {stock.isTopPick && (
          <div className="absolute top-0 left-0 bg-yellow-500 text-black px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter flex items-center gap-1 z-20">
              <Star size={8} fill="black"/> AIRobots Pick
          </div>
      )}

      <div className="absolute top-0 right-0 p-2 text-right z-10">
         <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-lg px-2 py-1 text-[10px] font-bold font-mono flex items-center justify-end gap-1 mb-1 shadow-sm">
            <Zap size={10} className="text-yellow-400 fill-yellow-400" />
            <span className="text-slate-200">{score.toFixed(0)}</span>
         </div>
      </div>

      <div className="flex justify-between items-start mb-2 pr-12 relative z-10">
        <div>
          <h3 className={`text-base md:text-lg font-bold flex items-center gap-2 ${theme.accent}`}>
            <AssetIcon size={16} className={theme.iconColor} />
            {stock.symbol.split('.')[0]}
          </h3>
          <div className="flex gap-1 mt-1">
              <span className={`text-[8px] px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800 text-slate-400 font-bold uppercase`}>
                  {stock.type}
              </span>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end mb-3 relative z-10">
          <div className="flex-1">
            <div className="text-lg md:text-2xl font-mono font-bold text-white tracking-tight">
                ₹{price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <div className={`text-[10px] flex items-center gap-1 font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {change.toFixed(2)}%
            </div>
          </div>
          <div className="text-right">
             <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wide flex items-center justify-end gap-1"><Target size={10}/> Target</div>
             <div className="text-base md:text-lg font-bold text-green-400 font-mono">₹{stock.targetPrice.toFixed(2)}</div>
          </div>
      </div>

      <div className="flex items-center gap-2 mb-3 bg-slate-900/60 border border-slate-700/50 p-2 rounded-lg relative z-10">
          <Scan size={12} className="text-indigo-400 flex-shrink-0" />
          <div className="text-[9px] md:text-[10px] leading-tight text-slate-300 italic line-clamp-2">
              {stock.reason}
          </div>
      </div>

      <div className="flex gap-2">
        <button
            onClick={() => isMarketOpen && onTrade(stock)}
            disabled={!isMarketOpen}
            className={`flex-1 py-2 rounded-lg font-bold text-white transition-all text-xs shadow-lg ${
                !isMarketOpen ? 'bg-slate-700 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 active:scale-95'
            }`}
        >
            {isMarketOpen ? 'TRADE' : 'CLOSED'}
        </button>
        {stock.sourceUrl && (
            <a href={stock.sourceUrl} target="_blank" rel="noreferrer" className="p-2 bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-colors border border-slate-700">
                <ExternalLink size={14}/>
            </a>
        )}
      </div>
    </div>
  );
};