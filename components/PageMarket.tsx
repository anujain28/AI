
import React, { useMemo, useEffect, useState } from 'react';
import { StockRecommendation, MarketData, MarketSettings } from '../types';
import { StockCard } from './StockCard';
import { RefreshCw, Zap, Sparkles, Target, Loader2, Trophy } from 'lucide-react';
import { fetchBrokerIntel } from '../services/brokerIntelService';

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
  scanProgress,
  settings
}) => {
  const [top5, setTop5] = useState<StockRecommendation[]>([]);

  useEffect(() => {
    fetchBrokerIntel(settings).then(res => setTop5(res.data));
  }, [recommendations]);

  const intraday = useMemo(() => recommendations.filter(r => r.timeframe === 'INTRADAY').slice(0, 8), [recommendations]);
  const btst = useMemo(() => recommendations.filter(r => r.timeframe === 'BTST').slice(0, 8), [recommendations]);

  const SectionTitle = ({ icon: Icon, title, sub, color }: any) => (
    <div className="flex items-center gap-3 mb-4 px-1 mt-6 first:mt-0">
        <div className={`p-2.5 ${color} bg-opacity-10 rounded-xl border border-current`}>
            <Icon size={20} className={color} />
        </div>
        <div>
            <h2 className="text-lg font-black text-white uppercase tracking-tight italic leading-none">{title}</h2>
            <p className={`text-[8px] font-bold uppercase tracking-widest mt-1 opacity-80 ${color}`}>{sub}</p>
        </div>
    </div>
  );

  return (
    <div className="p-4 pb-24 animate-fade-in max-w-lg mx-auto md:max-w-none">
      <div className="flex justify-between items-start mb-6">
         <div>
             <h1 className="text-3xl font-black text-white italic leading-none uppercase tracking-tighter flex items-center gap-2">
                 Market Engine
                 <Sparkles size={22} className="text-blue-400" />
             </h1>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2 text-slate-500">
                 <Zap size={12} className="text-yellow-500" />
                 High-Conviction Terminal
             </p>
         </div>
         <button onClick={onRefresh} disabled={isLoading} className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50">
            <RefreshCw size={22} className={isLoading ? 'animate-spin' : ''} />
         </button>
      </div>

      {isLoading && (
          <div className="mb-6 bg-blue-600/10 border border-blue-500/20 p-4 rounded-3xl flex items-center gap-4 animate-slide-up">
              <Loader2 size={20} className="text-blue-400 animate-spin" />
              <div className="flex-1">
                  <div className="flex justify-between text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1.5">
                      <span>Syncing Robot Signals...</span>
                      <span>{scanProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${scanProgress}%` }}></div>
                  </div>
              </div>
          </div>
      )}

      {/* TOP 5 ROBOT ALPHA - PRIMARY FEATURE */}
      {top5.length > 0 && !isLoading && (
        <section className="mb-10 p-5 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-black border border-indigo-500/30 shadow-[0_0_40px_-10px_rgba(79,70,229,0.3)]">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-500/40 animate-pulse">
                    <Trophy size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">Top 5 Picks</h2>
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1">Institutional Conviction Engine</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {top5.map(stock => (
                    <div key={stock.symbol} className="scale-100 hover:scale-[1.02] transition-transform">
                        <StockCard stock={stock} marketData={marketData} onTrade={onTrade} />
                    </div>
                ))}
            </div>
        </section>
      )}

      <div className="space-y-4">
          {intraday.length > 0 && (
              <section>
                  <SectionTitle icon={Target} title="Intraday Pulse" sub="High Velocity Signals" color="text-red-500" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {intraday.map(item => <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />)}
                  </div>
              </section>
          )}

          {btst.length > 0 && (
              <section>
                  <SectionTitle icon={Zap} title="BTST Momentum" sub="Overnight Opportunities" color="text-orange-500" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {btst.map(item => <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />)}
                  </div>
              </section>
          )}
      </div>
      
      <div className="h-12"></div>
    </div>
  );
};
