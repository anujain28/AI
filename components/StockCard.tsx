
import React, { useEffect, useState } from 'react';
import { StockRecommendation, MarketData } from '../types';
// Fixed: Added 'Clock' to the imports from 'lucide-react' to resolve the error on line 113.
import { ShieldCheck, Zap, ExternalLink, BrainCircuit, Target, Trophy, TrendingUp, Clock } from 'lucide-react';
import { getMarketStatus } from '../services/marketStatusService';

interface StockCardProps {
  stock: StockRecommendation;
  marketData: MarketData;
  onTrade: (stock: StockRecommendation) => void;
}

export const StockCard: React.FC<StockCardProps> = React.memo(({ stock, marketData, onTrade }) => {
  const currentData = marketData[stock.symbol];
  const price = currentData ? currentData.price : stock.currentPrice;
  const [lastPrice, setLastPrice] = useState(price);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  
  const marketStatus = getMarketStatus(stock.type);
  const isMarketOpen = marketStatus.isOpen;
  
  const score = stock.score || 0;
  const isHighConviction = score >= 100;
  const isTargetAchieved = price >= stock.targetPrice;

  // Visual feedback for price updates
  useEffect(() => {
    if (price !== lastPrice) {
      setPriceFlash(price > lastPrice ? 'up' : 'down');
      setLastPrice(price);
      const timer = setTimeout(() => setPriceFlash(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [price, lastPrice]);

  return (
    <div className={`rounded-2xl p-5 border transition-all duration-500 relative group overflow-hidden ${
        isTargetAchieved 
            ? 'border-green-500/50 bg-green-950/20 shadow-[0_0_20px_rgba(34,197,94,0.15)]' 
            : isHighConviction 
                ? 'border-blue-500/50 bg-slate-900/40 shadow-[0_0_30px_-10px_rgba(59,130,246,0.5)]' 
                : 'border-slate-800 bg-slate-900/20'
    }`}>
      
      {/* Target Achieved Banner */}
      {isTargetAchieved && (
          <div className="absolute top-0 right-0 left-0 bg-green-600/20 border-b border-green-500/30 py-1 text-center animate-fade-in z-20">
              <span className="text-[8px] font-black text-green-400 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                  <Trophy size={10} /> Goal Reached • Target Achieved
              </span>
          </div>
      )}

      {/* Robot convinction visual */}
      {(isHighConviction && !isTargetAchieved) && (
          <div className="absolute -top-4 -right-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
              <BrainCircuit size={100} className="text-blue-500" />
          </div>
      )}

      {/* Header Line */}
      <div className={`flex justify-between items-center mb-4 relative z-10 ${isTargetAchieved ? 'mt-4' : ''}`}>
          <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">
                  {stock.symbol.split('.')[0]}
              </h3>
              <span className="text-slate-500 font-bold px-1.5">•</span>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                  isTargetAchieved ? 'bg-green-600 text-white' : score >= 100 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                  {isTargetAchieved ? 'PROFIT TAKEN' : score >= 100 ? 'STRONG BUY' : 'BUY'} ⚡
              </span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1 flex items-center gap-1.5">
              <ShieldCheck size={12} className={isTargetAchieved ? 'text-green-400' : 'text-blue-400'} />
              <span className="text-[10px] font-mono font-black text-white leading-none">⭐ {score}</span>
          </div>
      </div>

      {/* Price Area */}
      <div className="space-y-1 mb-4 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">💰</span>
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">CMP:</span>
                  <div className={`relative px-2 py-1 rounded-lg transition-colors duration-500 ${
                      priceFlash === 'up' ? 'bg-green-500/20' : priceFlash === 'down' ? 'bg-red-500/20' : ''
                  }`}>
                      <span className={`text-xl font-mono font-black italic tracking-tighter transition-colors ${
                          priceFlash === 'up' ? 'text-green-400' : priceFlash === 'down' ? 'text-red-400' : 'text-white'
                      }`}>
                          ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      {isMarketOpen && (
                          <div className="absolute -right-1 -top-1 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_#22c55e]"></div>
                      )}
                  </div>
              </div>
              
              <span className="text-slate-500 mx-1">|</span>
              
              <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">🎯</span>
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">TGT:</span>
                  <span className={`text-xl font-mono font-black italic tracking-tighter ${isTargetAchieved ? 'text-green-400 underline decoration-2 underline-offset-4' : 'text-slate-400'}`}>
                      ₹{stock.targetPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
              </div>
          </div>

          <div className="flex items-center gap-4 text-[9px] font-black tracking-widest uppercase mt-2">
              <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock size={12} />
                  <span>{stock.timeframe || 'BTST'} Opportunity</span>
              </div>
              {isTargetAchieved && (
                  <div className="flex items-center gap-1.5 text-green-400 animate-pulse">
                      <TrendingUp size={12} />
                      <span>Alpha Realized</span>
                  </div>
              )}
          </div>
      </div>

      {/* Analytics Badge */}
      <div className={`bg-slate-950/60 border rounded-xl p-3 mb-4 relative z-10 transition-colors ${isTargetAchieved ? 'border-green-500/30' : 'border-slate-800/80'}`}>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/80 mb-2">
              <Target size={12} className={isTargetAchieved ? 'text-green-400' : ''} />
              <span className={isTargetAchieved ? 'text-green-400' : ''}>Robot Real-Time P&L</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 font-mono">
              <div className="text-[11px] text-white font-bold">
                  {isTargetAchieved ? 'Actual Yield:' : 'Target Profit:'} 
                  <span className="text-green-400 ml-1">₹{(price - stock.currentPrice + (stock.profitValue || 0)).toFixed(2)}</span>
              </div>
              <div className={`text-[12px] font-black italic ${isTargetAchieved ? 'text-green-400' : 'text-slate-500'}`}>
                  💹 ROI: {(((price - stock.currentPrice + (stock.profitValue || 0)) / stock.currentPrice) * 100).toFixed(2)}%
              </div>
          </div>
      </div>

      {/* Logic Summary */}
      {!isTargetAchieved && (
          <div className="flex items-start gap-3 mb-5 relative z-10">
              <div className="text-sm mt-0.5">🧠</div>
              <div className="text-[10px] font-medium text-slate-400 leading-relaxed italic">
                  <span className="font-black text-slate-200 uppercase tracking-widest not-italic mr-1">Logic:</span> 
                  {stock.reason}
              </div>
          </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 relative z-10">
        <button
            onClick={() => isMarketOpen && onTrade(stock)}
            disabled={!isMarketOpen}
            className={`flex-1 py-3.5 rounded-xl font-black text-white transition-all text-[11px] uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-2 ${
                isTargetAchieved 
                    ? 'bg-green-600 hover:bg-green-500 shadow-green-500/30' 
                    : !isMarketOpen 
                        ? 'bg-slate-800 text-slate-600 border border-slate-700' 
                        : 'bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-blue-500/30'
            }`}
        >
            {isTargetAchieved 
                ? <><Trophy size={14}/> PROFIT ACHIEVED</> 
                : isMarketOpen 
                    ? <><Zap size={14}/> {isHighConviction ? 'EXECUTE ALPHA' : 'BUY NOW'}</> 
                    : 'MARKET CLOSED'}
        </button>
        {stock.sourceUrl && (
            <a 
              href={stock.sourceUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 hover:text-white transition-colors hover:border-blue-500/50 flex items-center justify-center"
            >
                <ExternalLink size={16}/>
            </a>
        )}
      </div>
    </div>
  );
});
