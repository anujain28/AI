
import React, { useState, useEffect } from 'react';
import { StockRecommendation, MarketData } from '../types';
import { StockCard } from './StockCard';
import { RefreshCw, Globe, Search, AlertCircle, Newspaper, ArrowRight, ExternalLink, BarChart2, Info } from 'lucide-react';

interface PageBrokerIntelProps {
  recommendations: StockRecommendation[];
  marketData: MarketData;
  onTrade: (stock: StockRecommendation) => void;
  onRefresh: () => void;
  isLoading: boolean;
  error?: string | null;
}

export const PageBrokerIntel: React.FC<PageBrokerIntelProps> = ({
  recommendations,
  marketData,
  onTrade,
  onRefresh,
  isLoading,
  error
}) => {
  const [loadingStep, setLoadingStep] = useState(0);

  const steps = [
    "SYNCING WITH NSE TICKER CORE...",
    "CALCULATING TECHNICAL CONVICTION...",
    "VALIDATING MOMENTUM SIGNALS...",
    "FETCHING MONEYCONTROL CONTEXT..."
  ];

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep(s => (s + 1) % steps.length);
      }, 1500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <div className="p-4 pb-24 animate-fade-in max-w-lg mx-auto md:max-w-none">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-black text-white italic leading-none uppercase tracking-tighter flex items-center gap-2">
            Broker Intel
            <Newspaper size={24} className="text-blue-400" />
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2 text-slate-500">
            <Globe size={12} className="text-blue-500" />
            Moneycontrol Stock Ideas Core
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

      {/* Live Web Section - "Show it as it is" */}
      <div className="mb-8 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-3 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-blue-400" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Moneycontrol Web Feed</span>
            </div>
            <a 
              href="https://www.moneycontrol.com/markets/stock-ideas/" 
              target="_blank" 
              rel="noreferrer" 
              className="px-3 py-1 bg-blue-600 rounded-lg text-[9px] font-black text-white flex items-center gap-1.5 hover:bg-blue-500 transition-colors"
            >
              OPEN FULL SITE <ExternalLink size={10}/>
            </a>
          </div>
          
          {/* Iframe View - Some browsers/sites may block this via X-Frame-Options */}
          <div className="relative aspect-[16/10] md:aspect-[21/9] bg-slate-950">
            <iframe 
              src="https://www.moneycontrol.com/markets/stock-ideas/" 
              className="w-full h-full border-0"
              title="Moneycontrol Stock Ideas"
              loading="lazy"
            />
            {/* Fallback Overlay for blocked frames */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 text-center bg-slate-950/60 backdrop-blur-[1px]">
               <Info size={24} className="text-slate-600 mb-2" />
               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest max-w-[200px]">
                 Note: Web view may be limited by external site policies. Use trading cards below for execution.
               </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 px-1">
          <BarChart2 size={16} className="text-blue-500" />
          <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Active Trading Ideas</h3>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-6 animate-fade-in">
            <div className="relative">
                <Search size={48} className="text-blue-500 animate-pulse" />
                <div className="absolute inset-0 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
                <p className="text-xs font-black text-white uppercase tracking-widest mb-1 min-h-[1.5em] transition-all duration-500">
                  {steps[loadingStep]}
                </p>
                <p className="text-[9px] text-slate-500 uppercase font-bold">
                    SYNCING INSTITUTIONAL DATA
                </p>
            </div>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
              {recommendations.map(stock => (
                <StockCard key={stock.symbol} stock={stock} marketData={marketData} onTrade={onTrade} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl bg-slate-900/20 px-6">
              <AlertCircle size={32} className="mx-auto text-slate-700 mb-4 opacity-20" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                No active ideas found.<br/>
                Try refreshing for latest market consensus.
              </p>
              <button 
                onClick={onRefresh} 
                className="mt-6 flex items-center gap-2 mx-auto bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20"
              >
                Refresh Data <ArrowRight size={14}/>
              </button>
            </div>
          )}
        </div>
      )}
      
      <div className="h-12"></div>
    </div>
  );
};
