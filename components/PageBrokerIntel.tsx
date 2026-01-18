
import React, { useState, useEffect } from 'react';
import { StockRecommendation, MarketData, NewsItem } from '../types';
import { StockCard } from './StockCard';
import { RefreshCw, Globe, Search, AlertCircle, Newspaper, ArrowRight, ExternalLink, BarChart2, Info, Zap, Clock, MessageSquareQuote, TrendingUp, ChevronRight, Target } from 'lucide-react';

// Fixed: Defined missing constant STOCK_IDEAS_URL used in the iframe and source link.
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
    "SCRAPING LIVE STOCK IDEAS...",
    "PARSING BROKER TARGETS...",
    "SYNCING MARKET CONTEXT...",
    "EXTRACTING LATEST CALLS..."
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

  // Helper to extract data from title for UI badges
  const getCallInfo = (title: string) => {
    const isBuy = title.toLowerCase().includes('buy');
    const isSell = title.toLowerCase().includes('sell');
    const targetMatch = title.match(/target\s+of\s+Rs\s+([\d,.]+)/i);
    const brokerMatch = title.match(/:\s+(.*)$/i);
    
    return {
      type: isBuy ? 'BUY' : isSell ? 'SELL' : 'HOLD',
      target: targetMatch ? targetMatch[1] : null,
      broker: brokerMatch ? brokerMatch[1] : "Expert"
    };
  };

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

      {/* Latest Calls Section - Scraped from Moneycontrol Stock Ideas */}
      <div className="mb-10 space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-yellow-400 fill-yellow-400" />
            <h3 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">Latest Broker Calls</h3>
          </div>
          <div className="text-[8px] font-black bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-widest">
            Moneycontrol Scraper
          </div>
        </div>

        {isLoading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center gap-6">
             <Loader2 className="animate-spin text-blue-500" size={40} />
             <div className="text-center">
                <p className="text-xs font-black text-white uppercase tracking-widest mb-1">{steps[loadingStep]}</p>
                <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-blue-600 animate-pulse" style={{ width: '60%' }}></div>
                </div>
             </div>
          </div>
        ) : news.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
            {news.map((item, idx) => {
              const info = getCallInfo(item.title);
              return (
                <a 
                  key={idx} 
                  href={item.link} 
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-blue-500/50 transition-all group overflow-hidden relative"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest border ${
                      info.type === 'BUY' ? 'bg-green-600/20 text-green-400 border-green-500/20' : 
                      info.type === 'SELL' ? 'bg-red-600/20 text-red-400 border-red-500/20' : 
                      'bg-blue-600/20 text-blue-400 border-blue-500/20'
                    }`}>
                      {info.type} CALL
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">LIVE FEED</span>
                  </div>
                  
                  <h4 className="text-sm md:text-base font-black text-white leading-tight mb-3 group-hover:text-blue-400 transition-colors">
                    {item.title.split(':')[0]}
                  </h4>

                  <div className="flex items-end justify-between mt-auto pt-3 border-t border-slate-800/50">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Target Price</span>
                      <span className="text-lg font-mono font-black text-green-400">₹{info.target || 'TBA'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Brokerage</span>
                      <span className="text-[10px] font-bold text-slate-300">{info.broker}</span>
                    </div>
                  </div>

                  <div className="absolute -right-2 -bottom-2 opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                    <TrendingUp size={80} />
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-600">
             <AlertCircle size={32} className="mx-auto opacity-20 mb-3" />
             <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
               Unable to scrape latest calls.<br/>
               Please try refreshing in a few moments.
             </p>
          </div>
        )}
      </div>

      {/* Technical Alpha (Quant Picks) Section */}
      <div className="flex items-center justify-between mb-4 px-1 border-t border-slate-800 pt-10">
          <div className="flex items-center gap-2">
            <BarChart2 size={20} className="text-blue-400" />
            <h3 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">Quant Alpha Signals</h3>
          </div>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Institutional Scanner</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
        {recommendations.length > 0 ? (
          recommendations.map(stock => (
            <StockCard key={stock.symbol} stock={stock} marketData={marketData} onTrade={onTrade} />
          ))
        ) : !isLoading && (
          <div className="col-span-full py-10 text-center border border-dashed border-slate-800 rounded-3xl">
              <Search size={24} className="mx-auto text-slate-700 mb-2 opacity-20" />
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No matching quant signals found.</p>
          </div>
        )}
      </div>

      {/* Source Iframe - Minimized */}
      <div className="mt-16 opacity-30 hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Raw Stock Ideas Feed</p>
          <a href={STOCK_IDEAS_URL} target="_blank" rel="noreferrer" className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1">LIVE SOURCE <ExternalLink size={10}/></a>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden h-[180px] shadow-xl">
          <iframe 
            src={STOCK_IDEAS_URL} 
            className="w-full h-full border-0 grayscale hover:grayscale-0 transition-all"
            title="Moneycontrol Feed"
            loading="lazy"
          />
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
