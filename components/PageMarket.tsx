
import { useMemo } from 'react';
import { StockRecommendation, MarketData, MarketSettings } from '../types';
import { StockCard } from './StockCard';
import { RefreshCw, Zap, Sparkles, Search, Clock, TrendingUp, Calendar, Repeat, Target, Radar } from 'lucide-react';

interface PageMarketProps {
  recommendations: StockRecommendation[];
  marketData: MarketData;
  onTrade: (stock: StockRecommendation) => void;
  onRefresh: () => void;
  isLoading: boolean;
  scanProgress: number;
  enabledMarkets: MarketSettings;
  settings: any;
}

export const PageMarket: React.FC<PageMarketProps> = ({
  recommendations,
  marketData,
  onTrade,
  onRefresh,
  isLoading,
  scanProgress
}) => {
  // Conviction-based categorization
  const intraday = useMemo(() => recommendations.filter(r => r.timeframe === 'INTRADAY').slice(0, 10), [recommendations]);
  const btst = useMemo(() => recommendations.filter(r => r.timeframe === 'BTST').slice(0, 10), [recommendations]);
  const weekly = useMemo(() => recommendations.filter(r => r.timeframe === 'WEEKLY').slice(0, 10), [recommendations]);
  const monthly = useMemo(() => recommendations.filter(r => r.timeframe === 'MONTHLY').slice(0, 10), [recommendations]);

  const SectionTitle = ({ icon: Icon, title, sub, color }: any) => (
    <div className="flex items-center gap-3 mb-4 px-1 mt-6 first:mt-0">
        <div className={`p-2.5 ${color} bg-opacity-10 rounded-xl border border-current shadow-sm`}>
            <Icon size={20} className={color} />
        </div>
        <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight italic leading-none">{title}</h2>
            <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 opacity-80 ${color}`}>{sub}</p>
        </div>
    </div>
  );

  return (
    <div className="p-4 pb-24 animate-fade-in max-w-lg mx-auto md:max-w-none">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
         <div>
             <h1 className="text-3xl font-black text-white italic leading-none uppercase tracking-tighter flex items-center gap-2">
                 Robot Ideas
                 <Sparkles size={22} className="text-blue-400" />
             </h1>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2 text-slate-500">
                 <Zap size={12} className="text-yellow-500" />
                 1% Alpha Filter Active
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
          <div className="mb-8 animate-fade-in bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
              <div className="flex justify-between items-end mb-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                      <Target size={12} className="animate-pulse" />
                      Deep Scanning 150 Symbols...
                  </span>
                  <span className="text-[10px] font-mono text-white font-bold">{scanProgress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300 shadow-[0_0_12px_#2563eb]" 
                    style={{ width: `${scanProgress}%` }}
                  ></div>
              </div>
          </div>
      )}

      {!isLoading && recommendations.length === 0 && (
          <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl bg-slate-900/20 px-6">
              <Search size={32} className="mx-auto text-slate-700 mb-4 opacity-20" />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Scanning For 1% Alpha</h3>
              <p className="text-[9px] text-slate-600 uppercase font-bold mt-2 leading-relaxed">
                  The Robot did not find stocks with &gt;1% projected profit in the current 150-symbol scan. 
                  Try again during active market hours (09:15 - 15:30).
              </p>
              <button 
                onClick={onRefresh}
                className="mt-6 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mx-auto border border-slate-700"
              >
                <Radar size={14} className="text-blue-400" />
                Rerun Quantitative Scan
              </button>
          </div>
      )}

      {!isLoading && (
          <div className="space-y-4">
              {intraday.length > 0 && (
                  <section className="animate-slide-up">
                      <SectionTitle icon={Clock} title="High Conviction" sub="High Velocity Signals" color="text-red-500" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          {intraday.map(item => <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />)}
                      </div>
                  </section>
              )}

              {btst.length > 0 && (
                  <section className="animate-slide-up">
                      <SectionTitle icon={Repeat} title="BTST Alpha" sub="Overnight Momentum" color="text-orange-500" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          {btst.map(item => <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />)}
                      </div>
                  </section>
              )}

              {weekly.length > 0 && (
                  <section className="animate-slide-up">
                      <SectionTitle icon={TrendingUp} title="Swing Ideas" sub="3-5 Day Timeframe" color="text-blue-500" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          {weekly.map(item => <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />)}
                      </div>
                  </section>
              )}

              {monthly.length > 0 && (
                  <section className="animate-slide-up">
                      <SectionTitle icon={Calendar} title="Position Trades" sub="Weekly/Monthly Horizons" color="text-purple-500" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          {monthly.map(item => <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />)}
                      </div>
                  </section>
              )}
          </div>
      )}
      
      <div className="h-12"></div>
    </div>
  );
};
