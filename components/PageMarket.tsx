import { useMemo, useEffect, useState } from 'react';
import { StockRecommendation, MarketData, MarketSettings } from '../types';
import { StockCard } from './StockCard';
import { RefreshCw, Zap, Sparkles, Bot, LayoutGrid, ChevronRight, Activity, Map, Compass } from 'lucide-react';
import { getMarketStatus } from '../services/marketStatusService';
import { getGroupedUniverse } from '../services/stockListService';

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
  settings
}) => {
  const [scanProgress, setScanProgress] = useState(0);
  
  const marketStatus = getMarketStatus('STOCK');
  const isWeekend = !marketStatus.isOpen && marketStatus.message.includes('Weekend');
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setScanProgress(p => (p < 95 ? p + 5 : p));
      }, 400);
      return () => clearInterval(interval);
    } else {
      setScanProgress(0);
    }
  }, [isLoading]);

  const best5Picks = useMemo(() => recommendations.filter(r => r.isTopPick).slice(0, 5), [recommendations]);
  const otherPicks = useMemo(() => recommendations.filter(r => !r.isTopPick), [recommendations]);

  const industryGroups = useMemo(() => {
    const mapping = getGroupedUniverse();
    const result: Record<string, StockRecommendation[]> = {};
    
    otherPicks.forEach(rec => {
        const industry = Object.entries(mapping).find(([_, stocks]) => stocks.includes(rec.symbol))?.[0] || 'Others';
        if (!result[industry]) result[industry] = [];
        result[industry].push(rec);
    });
    return result;
  }, [otherPicks]);

  const industries = useMemo(() => Object.keys(industryGroups).sort(), [industryGroups]);

  return (
    <div className="p-4 pb-24 animate-fade-in max-w-lg mx-auto md:max-w-none">
      <div className="flex justify-between items-start mb-6">
         <div>
             <h1 className="text-3xl font-black text-white italic leading-none uppercase tracking-tighter flex items-center gap-2">
                 {isWeekend ? 'Weekend Explorer' : 'AI Trading Hub'}
                 {isWeekend ? <Compass size={24} className="text-indigo-400 animate-pulse" /> : <Sparkles size={22} className="text-blue-400 animate-pulse" />}
             </h1>
             <p className={`text-[10px] font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2 ${marketStatus.isOpen ? 'text-green-500' : 'text-slate-500'}`}>
                 <Bot size={12} className={isWeekend ? 'text-indigo-500' : 'text-blue-500'} />
                 {isWeekend ? 'Weekly Robot Intelligence' : 'Robot Intelligence v4.2'}
             </p>
         </div>
         <button 
           onClick={onRefresh} 
           disabled={isLoading} 
           className={`p-3 ${isWeekend ? 'bg-indigo-600' : 'bg-blue-600'} rounded-2xl text-white shadow-xl hover:opacity-80 transition-all active:scale-95 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
         >
            <RefreshCw size={22} className={isLoading ? 'animate-spin' : ''} />
         </button>
      </div>

      {isWeekend && (
          <div className="mb-6 p-4 bg-indigo-600/10 border border-indigo-500/30 rounded-2xl animate-slide-up">
              <div className="flex items-center gap-3 mb-2">
                  <Map size={18} className="text-indigo-400" />
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Weekend Scouting Mode Active</span>
              </div>
              <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed">
                  Scanning <span className="text-white">airobots.streamlit.app</span> and global technical indicators to prepare high-conviction swing ideas for the upcoming market session.
              </p>
          </div>
      )}

      {isLoading && (
          <div className="mb-8 animate-fade-in">
              <div className="flex justify-between items-end mb-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${isWeekend ? 'text-indigo-400' : 'text-blue-400'}`}>
                      {isWeekend ? 'Mapping Weekly Alpha...' : 'Processing AI Robot Signals...'}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">{scanProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${isWeekend ? 'bg-indigo-600' : 'bg-blue-600'}`} style={{ width: `${scanProgress}%` }}></div>
              </div>
          </div>
      )}

      {/* Hero Section: Best 5 AI Robot Picks */}
      {!isLoading && best5Picks.length > 0 && (
          <section className="mb-10 animate-slide-up">
               <div className="flex items-center gap-2 mb-4 px-1">
                    <div className={`p-2 rounded-xl border shadow-lg ${isWeekend ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20' : 'bg-blue-500/20 text-blue-400 border-blue-500/20'}`}>
                        <Zap size={20} className={isWeekend ? 'animate-bounce' : 'animate-pulse'} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tight italic">
                            {isWeekend ? 'Weekly Alpha Picks' : 'Best 5 AI Robot Picks'}
                        </h2>
                        <p className={`text-[9px] font-bold uppercase tracking-widest ${isWeekend ? 'text-indigo-400' : 'text-blue-400'}`}>
                            {isWeekend ? '7-Day High Conviction Targets' : 'Intraday Breakout Signals'}
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {best5Picks.map(item => (
                        <StockCard key={`robot-${item.symbol}`} stock={item} marketData={marketData} onTrade={onTrade} />
                    ))}
                </div>
          </section>
      )}

      {/* Industry Filter for the rest */}
      {!isLoading && industries.length > 0 && (
          <div className="space-y-8 animate-fade-in">
              <div className="flex items-center gap-2 mb-2 px-1">
                 <Activity size={16} className="text-slate-500" />
                 <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Sector Explorer</h3>
              </div>
              
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  {industries.map(industry => (
                      <button 
                        key={industry}
                        onClick={() => setSelectedIndustry(industry === selectedIndustry ? null : industry)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${selectedIndustry === industry ? (isWeekend ? 'bg-indigo-600 border-indigo-500' : 'bg-blue-600 border-blue-500') + ' text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white'}`}
                      >
                        <LayoutGrid size={14} />
                        {industry}
                      </button>
                  ))}
              </div>

              {selectedIndustry ? (
                  <div className="space-y-4">
                      <div className="flex items-center justify-between px-1">
                          <h2 className="text-lg font-black text-white uppercase italic tracking-tight flex items-center gap-2">
                              {selectedIndustry} <ChevronRight size={16} className="text-slate-600" />
                          </h2>
                          <span className="text-[9px] font-black text-slate-500 uppercase">{industryGroups[selectedIndustry].length} Signals</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {industryGroups[selectedIndustry].map(stock => (
                              <StockCard key={stock.symbol} stock={stock} marketData={marketData} onTrade={onTrade} />
                          ))}
                      </div>
                  </div>
              ) : (
                  <div className="text-center py-10 border border-dashed border-slate-800 rounded-3xl">
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                          {isWeekend ? 'Scout Weekly Momentum sectors' : 'Select a sector to view more recommendations'}
                      </p>
                  </div>
              )}
          </div>
      )}
      
      <div className="h-12"></div>
    </div>
  );
};