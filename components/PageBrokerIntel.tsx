
import React, { useState, useEffect } from 'react';
import { StockRecommendation, MarketData, NewsItem } from '../types';
import { StockCard } from './StockCard';
import { RefreshCw, Globe, Search, AlertCircle, Newspaper, ExternalLink, BarChart2, Info, Zap, MessageSquareQuote, TrendingUp } from 'lucide-react';

const STOCK_IDEAS_URL = "https://www.moneycontrol.com/markets/stock-ideas/";

interface PageBrokerIntelProps {
  recommendations: StockRecommendation[];
  news: NewsItem[];
  marketData: MarketData;
  onTrade: (stock: StockRecommendation) => void;
  onRefresh: () => void;
  isLoading: boolean;
  error?: string | null;
}

export const PageBrokerIntel: React.FC<PageBrokerIntelProps> = ({
  recommendations,
  news = [],
  marketData,
  onTrade,
  onRefresh,
  isLoading,
  error
}) => {
  const [loadingStep, setLoadingStep] = useState(0);

  const steps = [
    "EXECUTING MONEYCONTROL SCRAPER...",
    "EXTRACTING LATEST CALLS...",
    "SYNCING BEST 5 RECOMMENDATIONS...",
    "PARSING EXPERT TARGETS..."
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
            Live Scraped Stock Ideas
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

      {/* 1. Show it as it is - Moneycontrol Iframe */}
      <div className="mb-10 space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Globe size={20} className="text-blue-400" />
            <h3 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">Live Feed (As it is)</h3>
          </div>
          <a href={STOCK_IDEAS_URL} target="_blank" rel="noreferrer" className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1.5 hover:text-blue-400 transition-colors">
            OPEN SOURCE <ExternalLink size={10}/>
          </a>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl h-[500px] relative">
          <iframe 
            src={STOCK_IDEAS_URL} 
            className="w-full h-full border-0"
            title="Moneycontrol Stock Ideas"
            loading="lazy"
          />
          {isLoading && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10">
               <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
               <p className="text-xs font-black text-white uppercase tracking-widest">{steps[loadingStep]}</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Latest Calls - Extracted List */}
      <div className="mb-10 space-y-4">
        <div className="flex items-center gap-2 px-1">
          <MessageSquareQuote size={20} className="text-yellow-400" />
          <h3 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">Extracted Latest Calls</h3>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          {isLoading ? (
            <div className="space-y-4">
               {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-800 rounded-xl animate-pulse"></div>)}
            </div>
          ) : news.length > 0 ? (
            <div className="space-y-3">
              {news.map((item, idx) => (
                <div 
                  key={idx} 
                  className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50 hover:bg-slate-800 transition-all flex items-start gap-3 group"
                >
                  <div className="p-2 bg-slate-900 rounded-xl text-yellow-400 shrink-0 group-hover:bg-yellow-400/10 transition-colors">
                    <TrendingUp size={16} />
                  </div>
                  <p className="text-xs font-bold text-slate-100 leading-relaxed">
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-600">
               <Info size={32} className="mx-auto opacity-20 mb-3" />
               <p className="text-[10px] font-black uppercase tracking-widest">No active calls extracted.</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Best 5 Recommendations (Clean UI) */}
      <div className="mb-4 px-1 border-t border-slate-800 pt-10">
          <div className="flex items-center gap-2 mb-6">
            <Zap size={20} className="text-blue-400 fill-blue-400" />
            <h3 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">Best 5 Recommendations</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
            {recommendations.length > 0 ? (
              recommendations.map(stock => (
                <StockCard key={stock.symbol} stock={stock} marketData={marketData} onTrade={onTrade} />
              ))
            ) : !isLoading && (
              <div className="col-span-full py-10 text-center border border-dashed border-slate-800 rounded-3xl">
                  <Search size={24} className="mx-auto text-slate-700 mb-2 opacity-20" />
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Scanning technical alpha...</p>
              </div>
            )}
          </div>
      </div>
      
      <div className="h-12"></div>
    </div>
  );
};

const Loader2 = ({ size, className }: { size: number, className: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
