
import React from 'react';
import { StockRecommendation, MarketData } from '../types';
import { ShieldCheck, Zap, ExternalLink, BrainCircuit, Target, BarChart2 } from 'lucide-react';
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
  
  const marketStatus = getMarketStatus(stock.type);
  const isMarketOpen = marketStatus.isOpen;
  
  const score = stock.score || 0;
  const isHighConviction = score >= 100;

  return (
    <div className={`rounded-2xl p-5 border ${isHighConviction ? 'border-blue-500/50 bg-slate-900/40 shadow-[0_0_30px_-10px_rgba(59,130,246,0.5)]' : 'border-slate-800 bg-slate-900/20'} transition-all duration-300 relative group overflow-hidden`}>
      
      {/* Robot convinction visual */}
      {isHighConviction && (
          <div className="absolute -top-4 -right-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
              <BrainCircuit size={100} className="text-blue-500" />
          </div>
      )}

      {/* Header Line: ONGC • STRONG BUY ⚡ */}
      <div className="flex justify-between items-center mb-4 relative z-10">
          <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-white italic tracking-tighter uppercase">
                  {stock.symbol.split('.')[0]}
              </h3>
              <span className="text-slate-500 font-bold px-1.5">•</span>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${score >= 100 ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'}`}>
                  {score >= 100 ? 'STRONG BUY' : 'BUY'} ⚡
              </span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1 flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-blue-400" />
              <span className="text-[10px] font-mono font-black text-white leading-none">⭐ Score: {score}</span>
          </div>
      </div>

      {/* 💰 CMP: ₹247.23 | 🎯 Target: ₹249.10 */}
      <div className="space-y-1 mb-4 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm">💰</span>
              <span className="text-slate-400 text-[11px] font-black uppercase tracking-widest">CMP:</span>
              <span className="text-lg font-mono font-black text-white italic tracking-tighter">₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span className="text-slate-500 mx-1">|</span>
              <span className="text-sm">🎯</span>
              <span className="text-slate-400 text-[11px] font-black uppercase tracking-widest">Target:</span>
              <span className="text-lg font-mono font-black text-green-400 italic tracking-tighter">₹{stock.targetPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="flex items-center gap-4 text-[10px] font-black tracking-widest uppercase mt-2">
              <div className="flex items-center gap-1.5 text-slate-500">
                  <span>⏱</span>
                  <span>1–3 days (BTST)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                  <span>📊</span>
                  <span className="text-blue-400">{stock.timeframe || 'BTST'}</span>
              </div>
          </div>
      </div>

      {/* 📈 Target Profit: ₹1.87 • 💹 Profit %: 0.76% */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 mb-4 relative z-10">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/80 mb-2">
              <span>📈</span>
              <span>Robot Analytics</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 font-mono">
              <div className="text-[12px] text-white font-bold">
                  Target Profit: <span className="text-green-400">₹{stock.profitValue?.toFixed(2)}</span>
              </div>
              <div className="text-[12px] text-green-400 font-black italic">
                  💹 Profit %: {stock.profitPercent?.toFixed(2)}%
              </div>
          </div>
      </div>

      {/* 🧠 Reason: ... */}
      <div className="flex items-start gap-3 mb-5 relative z-10">
          <div className="text-sm mt-0.5">🧠</div>
          <div className="text-[10px] font-medium text-slate-400 leading-relaxed italic">
              <span className="font-black text-slate-200 uppercase tracking-widest not-italic mr-1">Reason:</span> 
              {stock.reason}
          </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 relative z-10">
        <button
            onClick={() => isMarketOpen && onTrade(stock)}
            disabled={!isMarketOpen}
            className={`flex-1 py-3.5 rounded-xl font-black text-white transition-all text-[11px] uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-2 ${
                !isMarketOpen ? 'bg-slate-800 text-slate-600 border border-slate-700' : 'bg-blue-600 hover:bg-blue-500 active:scale-95 shadow-blue-500/30'
            }`}
        >
            {isMarketOpen ? <><Zap size={14}/> EXECUTE ALPHA TRADE</> : 'MARKET CLOSED'}
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
