
import { useMemo, useEffect, useState } from 'react';
import { StockRecommendation, MarketData, MarketSettings } from '../types';
import { StockCard } from './StockCard';
import { RefreshCw, Zap, Sparkles, Bot, Compass, Search, Target, Link2, ExternalLink, BarChart2 } from 'lucide-react';
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
  const isWeekend = !marketStatus.isOpen && marketStatus.message.includes('Weekend');
  const isAfterHours = !marketStatus.isOpen && marketStatus.message.includes('After Hours');

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setScanProgress(p => (p < 95 ? p + 5 : p));
      }, 500);
      return () => clearInterval(interval);
    } else {
      setScanProgress(0);
    }
  }, [isLoading]);

  const best5Picks = useMemo(() => recommendations.filter(r => r.isTopPick).slice(0, 5), [recommendations]);
  const alphaSignals = useMemo(() => recommendations.filter(r => !r.isTopPick).slice(0, 15), [recommendations]);

  return (
    <div className="p-4 pb-24 animate-fade-in max-w-lg mx-auto md:max-w-none">
      <div className="flex justify-between items-start mb-6">
         <div>
             <h1 className="text-3xl font-black text-white italic leading-none uppercase tracking-tighter flex items-center gap-2">
                 {isWeekend ? 'Weekend Scout' : isAfterHours ? 'Post-Market Alpha' : 'Live Momentum Hub'}
                 {isWeekend ? <Compass size={24} className="text-indigo-400 animate-pulse" /> : <Sparkles size={22} className="text-blue-400 animate-pulse" />}
             </h1>
             <p className={`text-[10px] font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2 ${marketStatus.isOpen ? 'text-green-500' : 'text-slate-500'}`}>
                 <BarChart2 size={12} className={isWeekend ? 'text-indigo-500' : 'text-blue-500'} />
                 Quantitative Technical Engine v4.2
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

      {!isLoading && (
        <div className="mb-6 p-4 bg-slate-900/80 border border-slate-800 rounded-2xl animate-slide-up">
            <div className="flex items-center gap-3 mb-2">
                <Search size={16} className="text-blue-400" />
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                  Live Technical Grounding
                </span>
            </div>
            <div className="flex items-center justify-between">
                <p className="text-[9px] text-slate-400 font-bold uppercase">
                  Active Universe: <span className="text-white">NSE India Top 100</span>
                </p>
                <div className="text-[9px] text-blue-400 font-black flex items-center gap-1">
                    REAL-TIME SYNC <BarChart2 size={10}/>
                </div>
            </div>
        </div>
      )}

      {isLoading && (
          <div className="mb-8 animate-fade-in">
              <div className="flex justify-between items-end mb-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">
                      Syncing Real-Time Market Data...
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">{scanProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${scanProgress}%` }}></div>
              </div>
          </div>
      )}

      {/* BEST 5 Section */}
      {!isLoading && best5Picks.length > 0 && (
          <section className="mb-10 animate-slide-up">
               <div className="flex items-center gap-2 mb-4 px-1">
                    <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/20 shadow-lg shadow-blue-500/10">
                        <Zap size={20} className="animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight italic">
                            TOP CONVICTION PICKS
                        </h2>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-blue-400">
                            High Intensity Market Alpha
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {best5Picks.map(item => (
                        <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />
                    ))}
                </div>
          </section>
      )}

      {/* ALPHA SIGNALS Section */}
      {!isLoading && alphaSignals.length > 0 && (
          <section className="animate-fade-in">
              <div className="flex items-center gap-2 mb-4 px-1 border-t border-slate-800 pt-8">
                 <div className="p-2 bg-slate-900 rounded-xl border border-slate-800">
                    <Target size={18} className="text-slate-500" />
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-300 uppercase italic tracking-tight">ALPHA MARKET SIGNALS</h3>
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Global Technical Pulse: Top 20</p>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {alphaSignals.map(stock => (
                      <StockCard key={stock.symbol} stock={stock} marketData={marketData} onTrade={onTrade} />
                  ))}
              </div>
          </section>
      )}

      {!isLoading && recommendations.length === 0 && (
          <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl">
              <Search size={32} className="mx-auto text-slate-700 mb-4 opacity-20" />
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                  Market Scan Complete. No valid signals.
              </p>
          </div>
      )}
      
      <div className="h-12"></div>
    </div>
  );
};
