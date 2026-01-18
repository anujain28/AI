
import React, { useState, useEffect } from 'react';
import { StockRecommendation, MarketData, NewsItem } from '../types';
import { StockCard } from './StockCard';
import { RefreshCw, Globe, Search, AlertCircle, Newspaper, ArrowRight, ExternalLink, BarChart2, Info, Zap, Clock, MessageSquareQuote } from 'lucide-react';

interface PageBrokerIntelProps {
  recommendations: StockRecommendation[];
  news: NewsItem[]; // Added news prop
  marketData: MarketData;
  onTrade: (stock: StockRecommendation) => void;
  onRefresh: () => void;
  isLoading: boolean;
  error?: string | null;
}

export const PageBrokerIntel: React.FC<PageBrokerIntelProps> = ({
  recommendations,
  news = [], // Default to empty array
  marketData,
  onTrade,
  onRefresh,
  isLoading,
  error
}) => {
  const [loadingStep, setLoadingStep] = useState(0);

  const steps = [
    "SYNCING WITH NSE TICKER CORE...",
    "PARSING RSS ADVICE FEED...",
    "CALCULATING ALPHA TARGETS...",
    "EXTRACTING MOMENTUM SIGNALS..."
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
            Consensus & Advice Stream
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

      {/* Live News & Expert Advice Section */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center gap-2 px-1">
          <MessageSquareQuote size={20} className="text-blue-400" />
          <h3 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">News & Expert Advice</h3>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl overflow-hidden min-h-[200px] flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
               <Loader2 className="animate-spin text-blue-500" size={32} />
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Parsing Live News Feed...</p>
            </div>
          ) : news.length > 0 ? (
            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
              {news.map((item, idx) => (
                <a 
                  key={idx} 
                  href={item.link} 
                  target="_blank" 
                  rel="noreferrer"
                  className="block p-3 bg-slate-800/40 rounded-2xl border border-slate-700/50 hover:bg-slate-800 transition-all group"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[8px] font-black bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded uppercase tracking-widest border border-blue-500/20">
                      {item.source}
                    </span>
                    <span className="text-[8px] font-mono text-slate-500 flex items-center gap-1">
                      <Clock size={10} /> {new Date(item.pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition-colors leading-tight mb-1">
                    {item.title}
                  </h4>
                  <div className="text-[9px] text-slate-500 line-clamp-2 italic" dangerouslySetInnerHTML={{ __html: item.description }}></div>
                </a>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-slate-600">
               <Info size={32} className="opacity-20 mb-2" />
               <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">
                 RSS Feed Unavailable.<br/>
                 Using Iframe below as primary source.
               </p>
            </div>
          )}
        </div>
      </div>

      {/* Live Web Section - Show it as it is */}
      <div className="mb-10 space-y-4">
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
          
          <div className="relative aspect-[16/12] md:aspect-[21/7] bg-slate-950">
            <iframe 
              src="https://www.moneycontrol.com/markets/stock-ideas/" 
              className="w-full h-full border-0"
              title="Moneycontrol Stock Ideas"
              loading="lazy"
            />
          </div>
        </div>
      </div>

      {/* Latest Calls Section */}
      <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-yellow-400 fill-yellow-400" />
            <h3 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">Hot Technical Calls</h3>
          </div>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Consensus Alpha</span>
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
                    SCANNING INSTITUTIONAL DATA
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
                No active momentum calls identified.<br/>
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
