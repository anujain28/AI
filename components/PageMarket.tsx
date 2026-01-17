import React, { useMemo } from 'react';
import { StockRecommendation, MarketData, MarketSettings } from '../types';
import { StockCard } from './StockCard';
import { RefreshCw, Zap, Clock, Sparkles, BarChart3, ShieldCheck } from 'lucide-react';

interface PageMarketProps {
  recommendations: StockRecommendation[];
  marketData: MarketData;
  onTrade: (stock: StockRecommendation) => void;
  onRefresh: () => void;
  isLoading: boolean;
  enabledMarkets: MarketSettings;
}

export const PageMarket: React.FC<PageMarketProps> = ({
  recommendations,
  marketData,
  onTrade,
  onRefresh,
  isLoading,
}) => {
  
  const intradayRobotPicks = useMemo(() => 
    recommendations.filter(r => r.timeframe === 'INTRADAY').slice(0, 5), 
    [recommendations]
  );
  
  const btstRobotPicks = useMemo(() => 
    recommendations.filter(r => r.timeframe === 'BTST').slice(0, 5), 
    [recommendations]
  );

  return (
    <div className="p-4 pb-24 animate-fade-in max-w-lg mx-auto md:max-w-none">
      <div className="flex justify-between items-start mb-8">
         <div>
             <h1 className="text-3xl font-black text-white italic leading-none uppercase tracking-tighter flex items-center gap-2">
                 AI Robots
                 <Sparkles size={20} className="text-blue-400 animate-pulse" />
             </h1>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                 <BarChart3 size={12} className="text-blue-500" /> Top 5 Momentum Scanning Active
             </p>
         </div>
         <button 
           onClick={onRefresh} 
           disabled={isLoading} 
           className={`p-3 bg-blue-600 rounded-2xl text-white shadow-xl hover:bg-blue-500 transition-all active:scale-95 ${isLoading ? 'opacity-50' : ''}`}
         >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
         </button>
      </div>

      <div className="space-y-12">
        {/* Intraday Robot Section */}
        <section className="animate-slide-up">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-orange-500/20 rounded-xl text-orange-400 border border-orange-500/20 shadow-lg shadow-orange-500/5">
                        <Zap size={18} fill="currentColor" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white uppercase tracking-tight italic">Intraday Robot</h2>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Scalp & Momentum Picks</p>
                    </div>
                </div>
                <div className="text-[9px] font-black text-slate-700 uppercase tracking-tighter bg-slate-900 px-2 py-1 rounded border border-slate-800">
                    TOP 5 SIGNAL
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isLoading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={`loader-intra-${i}`} className="h-40 bg-slate-900/50 rounded-2xl border border-slate-800 animate-pulse"></div>
                    ))
                ) : intradayRobotPicks.length > 0 ? (
                    intradayRobotPicks.map(item => (
                        <StockCard key={`intra-${item.symbol}`} stock={item} marketData={marketData} onTrade={onTrade} />
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center bg-slate-900/30 border border-slate-800 rounded-3xl border-dashed">
                        <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">Waiting for Intraday Robot Alpha...</p>
                    </div>
                )}
            </div>
        </section>

        {/* BTST Robot Section */}
        <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400 border border-purple-500/20 shadow-lg shadow-purple-500/5">
                        <Clock size={18} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white uppercase tracking-tight italic">BTST Robot</h2>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Buy Today Sell Tomorrow</p>
                    </div>
                </div>
                <div className="text-[9px] font-black text-slate-700 uppercase tracking-tighter bg-slate-900 px-2 py-1 rounded border border-slate-800">
                    TOP 5 SIGNAL
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isLoading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={`loader-btst-${i}`} className="h-40 bg-slate-900/50 rounded-2xl border border-slate-800 animate-pulse"></div>
                    ))
                ) : btstRobotPicks.length > 0 ? (
                    btstRobotPicks.map(item => (
                        <StockCard key={`btst-${item.symbol}`} stock={item} marketData={marketData} onTrade={onTrade} />
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center bg-slate-900/30 border border-slate-800 rounded-3xl border-dashed">
                        <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">Waiting for BTST Robot Setup...</p>
                    </div>
                )}
            </div>
        </section>

        {recommendations.length === 0 && !isLoading && (
            <div className="text-center py-20 px-6 border-2 border-dashed border-slate-800 rounded-3xl animate-fade-in bg-slate-900/10">
                <ShieldCheck size={48} className="mx-auto mb-4 text-slate-800" />
                <h3 className="text-white font-bold mb-2 uppercase italic tracking-tighter text-xl">Robots Standby</h3>
                <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
                    Check your <span className="text-blue-400 font-bold">Config</span> watchlists.<br/>
                    The robots are currently scanning for high-probability setups.
                </p>
                <button 
                  onClick={onRefresh}
                  className="px-6 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-700 hover:bg-slate-700 transition-all"
                >
                    Force Global Re-Scan
                </button>
            </div>
        )}
      </div>
      
      <div className="h-12"></div>
    </div>
  );
};