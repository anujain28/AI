import React, { useMemo, useState } from 'react';
import { StockRecommendation, MarketData, MarketSettings, AssetType } from '../types';
import { StockCard } from './StockCard';
import { RefreshCw, TrendingUp, Trophy, Star, Clock, Cpu } from 'lucide-react';

interface PageMarketProps {
  recommendations: StockRecommendation[];
  marketData: MarketData;
  onTrade: (stock: StockRecommendation) => void;
  onRefresh: () => void;
  isLoading: boolean;
  enabledMarkets: MarketSettings;
}

type TimeframeFilter = 'ALL' | 'INTRADAY' | 'BTST' | 'WEEKLY' | 'MONTHLY';

export const PageMarket: React.FC<PageMarketProps> = ({
  recommendations,
  marketData,
  onTrade,
  onRefresh,
  isLoading,
  enabledMarkets,
}) => {
  const [activeTf, setActiveTf] = useState<TimeframeFilter>('ALL');
  
  // Best 5 across all categories for the "Robot" picks
  const robotPicks = useMemo(() => {
    return [...recommendations]
      .sort((a, b) => (marketData[b.symbol]?.technicals.score || 0) - (marketData[a.symbol]?.technicals.score || 0))
      .slice(0, 5);
  }, [recommendations, marketData]);

  const filteredRecommendations = useMemo(() => {
    let filtered = recommendations;
    if (activeTf !== 'ALL') {
      filtered = recommendations.filter(r => r.timeframe === activeTf);
    }
    // Remove duplicates from robot picks to keep main list fresh
    const robotIds = new Set(robotPicks.map(r => r.symbol));
    
    return filtered
      .filter(r => activeTf !== 'ALL' || !robotIds.has(r.symbol))
      .sort((a, b) => (marketData[b.symbol]?.technicals.score || 0) - (marketData[a.symbol]?.technicals.score || 0));
  }, [recommendations, marketData, activeTf, robotPicks]);

  const timeframeTabs: {id: TimeframeFilter, label: string}[] = [
    { id: 'ALL', label: 'All Picks' },
    { id: 'INTRADAY', label: 'Intraday' },
    { id: 'BTST', label: 'BTST' },
    { id: 'WEEKLY', label: 'Weekly' },
    { id: 'MONTHLY', label: 'Monthly' },
  ];

  return (
    <div className="p-4 pb-24 animate-fade-in max-w-lg mx-auto md:max-w-none">
      <div className="flex justify-between items-start mb-6">
         <div>
             <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-white">
                 Market Intelligence
             </h1>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Scanning 190+ NSE Stocks</p>
         </div>
         <button 
            onClick={onRefresh} 
            disabled={isLoading}
            className={`p-2 bg-blue-600 rounded-full text-white shadow-lg transition-transform active:scale-95 ${isLoading ? 'animate-spin bg-slate-700' : 'hover:bg-blue-500'}`}
         >
            <RefreshCw size={18} />
         </button>
      </div>

      {/* Top 5 AI Robot Picks (Streamlit Robot Logic) */}
      {activeTf === 'ALL' && robotPicks.length > 0 && !isLoading && (
          <div className="mb-10 animate-slide-up">
              <div className="flex items-center justify-between mb-4 bg-gradient-to-r from-indigo-900/40 to-slate-900/40 border border-indigo-500/30 p-4 rounded-2xl relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-10 group-hover:rotate-12 transition-transform duration-1000"><Cpu size={100}/></div>
                  <div className="flex items-center gap-3 relative z-10">
                      <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]"><Trophy size={24} fill="currentColor"/></div>
                      <div>
                          <h2 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">Best 5 Robot Picks</h2>
                          <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">High Accuracy Technical Setups</p>
                      </div>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {robotPicks.map(item => <StockCard key={`robot-${item.symbol}`} stock={item} marketData={marketData} onTrade={onTrade} />)}
              </div>
          </div>
      )}

      {/* Main Signal Scanner */}
      <div className="mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sticky top-0 bg-background/95 backdrop-blur-md z-30 py-3 border-b border-slate-800/50 px-1">
          <div className="flex items-center gap-2">
              <div className={`p-2 bg-slate-800 rounded-lg text-blue-400`}><Clock size={18}/></div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Scanner Results</h3>
          </div>
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
              {timeframeTabs.map(tab => (
                  <button 
                      key={tab.id}
                      onClick={() => setActiveTf(tab.id)}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border ${activeTf === tab.id ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'}`}
                  >
                      {tab.label}
                  </button>
              ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="h-48 bg-slate-800/40 rounded-2xl border border-slate-700/50 animate-pulse flex flex-col p-4 gap-3">
                  <div className="h-6 w-1/2 bg-slate-700 rounded"></div>
                  <div className="h-10 w-full bg-slate-700/50 rounded mt-auto"></div>
              </div>
            ))
          ) : filteredRecommendations.length > 0 ? (
            filteredRecommendations.map(item => <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />)
          ) : (
              <div className="col-span-full py-20 text-center bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                  <TrendingUp size={48} className="mx-auto mb-4 text-slate-700 opacity-30" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No active signals in {activeTf} scan</p>
                  <button onClick={onRefresh} className="mt-4 text-blue-400 text-[10px] font-black uppercase tracking-tighter hover:underline">Force Market Re-Scan</button>
              </div>
          )}
        </div>
      </div>
      
      <div className="h-20"></div>
    </div>
  );
};