
import React, { useMemo } from 'react';
import { StockRecommendation, MarketData, MarketSettings } from '../types';
import { StockCard } from './StockCard';
import { RefreshCw, Zap, TrendingUp, Calendar, Clock, Sparkles, Search } from 'lucide-react';

interface PageMarketProps {
  recommendations: StockRecommendation[];
  marketData: MarketData;
  onTrade: (stock: StockRecommendation) => void;
  onRefresh: () => void;
  isLoading: boolean;
  enabledMarkets: MarketSettings;
}

const SECTION_CONFIG = {
  'INTRADAY': { icon: <Clock size={20}/>, color: 'text-blue-400', bg: 'from-blue-500/10', border: 'border-blue-500/20', label: 'Intraday Picks' },
  'BTST': { icon: <Zap size={20}/>, color: 'text-green-400', bg: 'from-green-500/10', border: 'border-green-500/20', label: 'BTST Picks' },
  'WEEKLY': { icon: <Calendar size={20}/>, color: 'text-purple-400', bg: 'from-purple-500/10', border: 'border-purple-500/20', label: 'Weekly Swing' },
  'MONTHLY': { icon: <TrendingUp size={20}/>, color: 'text-orange-400', bg: 'from-orange-500/10', border: 'border-orange-500/20', label: 'Monthly Positional' }
};

export const PageMarket: React.FC<PageMarketProps> = ({
  recommendations,
  marketData,
  onTrade,
  onRefresh,
  isLoading,
}) => {
  
  const groups = useMemo(() => {
    const grouped: Record<string, StockRecommendation[]> = {
      'INTRADAY': [],
      'BTST': [],
      'WEEKLY': [],
      'MONTHLY': []
    };

    recommendations.forEach(rec => {
      if (rec.timeframe && grouped[rec.timeframe]) {
        grouped[rec.timeframe].push(rec);
      }
    });

    return grouped;
  }, [recommendations]);

  const renderSection = (timeframe: keyof typeof SECTION_CONFIG) => {
    const config = SECTION_CONFIG[timeframe];
    const items = groups[timeframe];

    if (!isLoading && items.length === 0) return null;

    return (
      <div key={timeframe} className="mb-10 animate-slide-up">
        <div className={`flex items-center justify-between mb-4 p-4 rounded-2xl bg-gradient-to-r ${config.bg} to-slate-900/40 border ${config.border}`}>
            <div className="flex items-center gap-3">
                <div className={`p-2 bg-slate-900 rounded-lg ${config.color}`}>{config.icon}</div>
                <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tighter">{config.label}</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Score > 70 | {timeframe}</p>
                </div>
            </div>
            {!isLoading && <div className="text-[10px] font-black text-slate-600 uppercase">{items.length} Signals</div>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-44 bg-slate-800/20 rounded-xl border border-slate-800/50 animate-pulse flex flex-col p-4 gap-3">
                  <div className="h-4 w-1/3 bg-slate-800 rounded"></div>
                  <div className="h-10 w-full bg-slate-800 rounded mt-auto"></div>
              </div>
            ))
          ) : (
            items.map(item => <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />)
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 pb-24 animate-fade-in max-w-lg mx-auto md:max-w-none">
      <div className="flex justify-between items-start mb-8">
         <div>
             <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-white tracking-tighter uppercase italic leading-none">
                 AI Trading Ideas
             </h1>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                 <Sparkles size={12} className="text-yellow-500" /> Tiered Ultra-Fast Scan Active
             </p>
         </div>
         <button 
            onClick={onRefresh} 
            disabled={isLoading}
            className={`p-3 bg-blue-600 rounded-2xl text-white shadow-xl transition-all active:scale-90 ${isLoading ? 'animate-spin bg-slate-700' : 'hover:bg-blue-500 hover:shadow-blue-500/20'}`}
         >
            <RefreshCw size={20} />
         </button>
      </div>

      {isLoading && (
          <div className="mb-8 p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl flex items-center gap-4 animate-pulse">
              <div className="p-2 bg-blue-600/20 rounded-lg text-blue-400"><Search size={20}/></div>
              <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-tighter">Fast-Scanning Market...</h4>
                  <div className="w-48 h-1 bg-slate-800 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-blue-500 w-1/2 animate-[progress_2s_ease-in-out_infinite]"></div>
                  </div>
              </div>
          </div>
      )}

      {!isLoading && recommendations.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center gap-4">
              <div className="p-6 bg-slate-900 rounded-full border border-slate-800 text-slate-700">
                  <TrendingUp size={40} />
              </div>
              <div>
                  <h3 className="text-white font-bold">No High-Score Signals</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">Try again in a few minutes or force a re-scan.</p>
              </div>
              <button onClick={onRefresh} className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold border border-slate-700">Scan Market Now</button>
          </div>
      ) : (
          <>
            {renderSection('INTRADAY')}
            {renderSection('BTST')}
            {renderSection('WEEKLY')}
            {renderSection('MONTHLY')}
          </>
      )}
      
      <div className="h-20"></div>
    </div>
  );
};
