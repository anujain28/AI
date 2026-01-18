
import { useMemo, useEffect, useState } from 'react';
import { StockRecommendation, MarketData, MarketSettings } from '../types';
import { StockCard } from './StockCard';
import { RefreshCw, Zap, Sparkles, Bot, Compass, Search, Target, Clock, BarChart2, TrendingUp, Calendar } from 'lucide-react';
import { getMarketStatus } from '../services/marketStatusService';

interface PageMarketProps {
  recommendations: StockRecommendation[];
  marketData: MarketData;
  onTrade: (stock: StockRecommendation) => void;
  onRefresh: () => void;
  isLoading: boolean;
  enabledMarkets: MarketSettings;
  settings: any;
}

export const PageMarket: React.FC<PageMarketProps> = ({
  recommendations,
  marketData,
  onTrade,
  onRefresh,
  isLoading,
}) => {
  const [scanProgress, setScanProgress] = useState(0);
  
  const marketStatus = getMarketStatus('STOCK');

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setScanProgress(p => (p < 95 ? p + 5 : p));
      }, 300); // Faster progress UI
      return () => clearInterval(interval);
    } else {
      setScanProgress(0);
    }
  }, [isLoading]);

  // Categorize recommendations
  const intradayPicks = useMemo(() => recommendations.filter(r => r.timeframe === 'INTRADAY').slice(0, 6), [recommendations]);
  const btstPicks = useMemo(() => recommendations.filter(r => r.timeframe === 'BTST').slice(0, 6), [recommendations]);
  const swingPicks = useMemo(() => recommendations.filter(r => r.timeframe === 'WEEKLY' || r.timeframe === 'MONTHLY').slice(0, 6), [recommendations]);

  return (
    <div className="p-4 pb-24 animate-fade-in max-w-lg mx-auto md:max-w-none">
      <div className="flex justify-between items-start mb-6">
         <div>
             <h1 className="text-3xl font-black text-white italic leading-none uppercase tracking-tighter flex items-center gap-2">
                 Market Ideas
                 <Sparkles size={22} className="text-blue-400 animate-pulse" />
             </h1>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2 text-slate-500">
                 <Zap size={12} className="text-yellow-500" />
                 Shoonya & Yahoo Hybrid Feed
             </p>
         </div>
         <button 
           onClick={onRefresh} 
           disabled={isLoading} 
           className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50"
         >
            <RefreshCw size={22} className={isLoading ? 'animate-spin' : ''} />
         </button>
      </div>

      {isLoading && (
          <div className="mb-8 animate-fade-in">
              <div className="flex justify-between items-end mb-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">
                      Syncing Real-Time Liquidity...
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">{scanProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300 shadow-[0_0_10px_#2563eb]" style={{ width: `${scanProgress}%` }}></div>
              </div>
          </div>
      )}

      {!isLoading && recommendations.length === 0 && (
          <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl">
              <Search size={32} className="mx-auto text-slate-700 mb-4 opacity-20" />
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                  No momentum signals detected.
              </p>
          </div>
      )}

      {/* INTRADAY SECTION */}
      {!isLoading && intradayPicks.length > 0 && (
          <section className="mb-10 animate-slide-up">
               <div className="flex items-center gap-2 mb-4 px-1">
                    <div className="p-2 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20">
                        <Clock size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight italic">INTRADAY SCALPS</h2>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-red-400">Exit Before 3:15 PM</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {intradayPicks.map(item => (
                        <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />
                    ))}
                </div>
          </section>
      )}

      {/* BTST SECTION */}
      {!isLoading && btstPicks.length > 0 && (
          <section className="mb-10 animate-slide-up">
               <div className="flex items-center gap-2 mb-4 px-1">
                    <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl border border-orange-500/20">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight italic">BTST SIGNALS</h2>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-orange-400">Buy Today Sell Tomorrow</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {btstPicks.map(item => (
                        <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />
                    ))}
                </div>
          </section>
      )}

      {/* SWING SECTION */}
      {!isLoading && swingPicks.length > 0 && (
          <section className="mb-10 animate-slide-up">
               <div className="flex items-center gap-2 mb-4 px-1">
                    <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl border border-purple-500/20">
                        <Calendar size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight italic">SWING PICKS</h2>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-purple-400">Weekly & Monthly Horizon</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {swingPicks.map(item => (
                        <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />
                    ))}
                </div>
          </section>
      )}
      
      <div className="h-12"></div>
    </div>
  );
};
