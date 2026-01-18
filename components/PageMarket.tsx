
import { useMemo, useEffect, useState } from 'react';
import { StockRecommendation, MarketData, MarketSettings } from '../types';
import { StockCard } from './StockCard';
import { RefreshCw, Zap, Sparkles, Search, Clock, TrendingUp, Calendar, Repeat } from 'lucide-react';

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
  
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setScanProgress(p => (p < 95 ? p + 2 : p));
      }, 100); 
      return () => clearInterval(interval);
    } else {
      setScanProgress(0);
    }
  }, [isLoading]);

  // Specific Categorization based on TF
  const intradayPicks = useMemo(() => recommendations.filter(r => r.timeframe === 'INTRADAY').slice(0, 4), [recommendations]);
  const btstPicks = useMemo(() => recommendations.filter(r => r.timeframe === 'BTST').slice(0, 4), [recommendations]);
  const weeklyPicks = useMemo(() => recommendations.filter(r => r.timeframe === 'WEEKLY').slice(0, 4), [recommendations]);
  const monthlyPicks = useMemo(() => recommendations.filter(r => r.timeframe === 'MONTHLY').slice(0, 4), [recommendations]);

  const SectionHeader = ({ icon: Icon, title, sub, color }: any) => (
    <div className="flex items-center gap-2 mb-4 px-1 mt-6 first:mt-0">
        <div className={`p-2 ${color} bg-opacity-10 rounded-xl border ${color.replace('text-', 'border-').replace('bg-', 'border-')}`}>
            <Icon size={20} className={color} />
        </div>
        <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight italic">{title}</h2>
            <p className={`text-[9px] font-bold uppercase tracking-widest ${color}`}>{sub}</p>
        </div>
    </div>
  );

  return (
    <div className="p-4 pb-24 animate-fade-in max-w-lg mx-auto md:max-w-none">
      <div className="flex justify-between items-start mb-6">
         <div>
             <h1 className="text-3xl font-black text-white italic leading-none uppercase tracking-tighter flex items-center gap-2">
                 Engine Ideas
                 <Sparkles size={22} className="text-blue-400 animate-pulse" />
             </h1>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2 text-slate-500">
                 <Zap size={12} className="text-yellow-500" />
                 Hybrid Yahoo/Shoonya Quant
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
                      Syncing Quant Universes...
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
                  Scanning for high-alpha setups...
              </p>
          </div>
      )}

      {!isLoading && (
          <div className="space-y-4">
              {intradayPicks.length > 0 && (
                  <section className="animate-slide-up">
                      <SectionHeader icon={Clock} title="Intraday" sub="Scalp & Exit Today" color="text-red-500" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {intradayPicks.map(item => <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />)}
                      </div>
                  </section>
              )}

              {btstPicks.length > 0 && (
                  <section className="animate-slide-up">
                      <SectionHeader icon={Repeat} title="BTST" sub="Buy Today Sell Tomorrow" color="text-orange-500" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {btstPicks.map(item => <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />)}
                      </div>
                  </section>
              )}

              {weeklyPicks.length > 0 && (
                  <section className="animate-slide-up">
                      <SectionHeader icon={TrendingUp} title="Weekly" sub="Swing for 1-2 Weeks" color="text-blue-500" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {weeklyPicks.map(item => <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />)}
                      </div>
                  </section>
              )}

              {monthlyPicks.length > 0 && (
                  <section className="animate-slide-up">
                      <SectionHeader icon={Calendar} title="Monthly" sub="Core Position Trades" color="text-purple-500" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {monthlyPicks.map(item => <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />)}
                      </div>
                  </section>
              )}
          </div>
      )}
      
      <div className="h-12"></div>
    </div>
  );
};
