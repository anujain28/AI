
import React, { useState, useEffect } from 'react';
import { StockRecommendation, MarketData, NewsItem } from '../types';
import { StockCard } from './StockCard';
import { RefreshCw, Globe, Search, AlertCircle, Newspaper, ArrowRight, ExternalLink, BarChart2, Info, Zap, Clock, MessageSquareQuote, TrendingUp } from 'lucide-react';

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
    "SCANNING ECONOMIC TIMES FEED...",
    "PARSING BROKER RESEARCH...",
    "SYNCING MOMENTUM SIGNALS...",
    "EXTRACTING HIGH CONVICTION CALLS..."
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
            Live ET & Consensus Recommendations
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

      {/* Expert Recommendations (ET Feed) */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-400" />
            <h3 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">ET Expert Calls</h3>
          </div>
          <div className="text-[8px] font-black bg-slate-800 text-slate-500 px-2 py-0.5 rounded border border-slate-700 uppercase tracking-widest">
            Latest Research
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl overflow-hidden min-h-[250px] flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
               <Loader2 className="animate-spin text-blue-500" size={32} />
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{steps[loadingStep]}</p>
            </div>
          ) : news.length > 0 ? (
            <div className="space-y-4 max-h-[450px] overflow-y-auto custom-scrollbar pr-1">
              {news.map((item, idx) => (
                <a 
                  key={idx} 
                  href={item.link} 
                  target="_blank" 
                  rel="noreferrer"
                  className="block p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50 hover:bg-slate-800 transition-all group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest border ${
                      item.source === 'Economic Times' ? 'bg-orange-600/20 text-orange-400 border-orange-500/20' : 'bg-blue-600/20 text-blue-400 border-blue-500/20'
                    }`}>
                      {item.source}
                    </span>
                    <span className="text-[8px] font-mono text-slate-500 flex items-center gap-1">
                      <Clock size={10} /> {new Date(item.pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-100 group-hover:text-blue-400 transition-colors leading-snug mb-2 relative z-10">
                    {item.title}
                  </h4>
                  <div className="text-[10px] text-slate-500 line-clamp-2 italic leading-relaxed relative z-10" dangerouslySetInnerHTML={{ __html: item.description }}></div>
                  
                  {/* Visual Hint for ET items */}
                  {item.source === 'Economic Times' && (
                    <div className="absolute -right-4 -bottom-4 opacity-5 rotate-12">
                      <Newspaper size={80} />
                    </div>
                  )}
                </a>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-600">
               <AlertCircle size={32} className="opacity-20 mb-3" />
               <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">
                 Expert feed temporarily unavailable.<br/>
                 Check terminal for technical alpha.
               </p>
            </div>
          )}
        </div>
      </div>

      {/* Technical Momentum Cards */}
      <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-yellow-400 fill-yellow-400" />
            <h3 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">Execution Targets</h3>
          </div>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Momentum Core</span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
                <div key={i} className="h-48 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse"></div>
            ))}
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
              <Search size={32} className="mx-auto text-slate-700 mb-4 opacity-20" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Scanning for momentum signals...
              </p>
            </div>
          )}
        </div>
      )}

      {/* Legacy Iframe View - Minimized */}
      <div className="mt-12 mb-8 opacity-40 hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">External Markets View</p>
          <a href="https://www.moneycontrol.com/markets/stock-ideas/" target="_blank" rel="noreferrer" className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1">Source <ExternalLink size={10}/></a>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden h-[200px] shadow-xl">
          <iframe 
            src="https://www.moneycontrol.com/markets/stock-ideas/" 
            className="w-full h-full border-0 grayscale hover:grayscale-0 transition-all"
            title="Markets Feed"
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
