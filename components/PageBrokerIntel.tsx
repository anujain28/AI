
import React, { useState, useEffect } from 'react';
import { StockRecommendation, MarketData, NewsItem } from '../types';
import { StockCard } from './StockCard';
import { RefreshCw, Globe, Search, AlertCircle, Newspaper, ExternalLink, BarChart2, Info, Zap, MessageSquareQuote, TrendingUp, ChevronRight, Terminal, Table } from 'lucide-react';

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
    "BOOTING PUPPETEER LOGIC...",
    "PARSING table tr SELECTORS...",
    "CHECKING reco KEYWORDS...",
    "EXTRACTING TARGET PRICES..."
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

  // Check if we have structured table data
  const hasStructuredData = news.some(item => item.stock && item.reco);

  return (
    <div className="p-4 pb-24 animate-fade-in max-w-lg mx-auto md:max-w-none flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-white italic leading-none uppercase tracking-tighter flex items-center gap-2">
            Broker Intel
            <Terminal size={24} className="text-blue-400" />
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2 text-slate-500">
            <Globe size={12} className="text-blue-500" />
            Live Scraper Core v2.1
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

      <div className="space-y-8 flex-1">
        {/* 1. Latest Calls - Scraped Content */}
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <MessageSquareQuote size={20} className="text-yellow-400" />
              <h3 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">Extracted Latest Calls</h3>
            </div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Moneycontrol Scrape</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
             {isLoading ? (
               <div className="p-6 space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-14 bg-slate-800/50 rounded-2xl animate-pulse"></div>
                  ))}
                  <div className="text-center mt-4">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] animate-pulse">
                      {steps[loadingStep]}
                    </p>
                  </div>
               </div>
             ) : news.length > 0 ? (
               <div className="overflow-x-auto">
                 {hasStructuredData ? (
                   <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-800/50 border-b border-slate-700">
                        <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="p-4">Stock</th>
                          <th className="p-4">Recommendation</th>
                          <th className="p-4 text-right">Target</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {news.map((item, idx) => (
                          <tr key={idx} className="hover:bg-blue-600/5 transition-colors">
                            <td className="p-4 text-xs font-black text-white">{item.stock}</td>
                            <td className={`p-4 text-xs font-bold ${item.reco?.toLowerCase().includes('buy') ? 'text-green-400' : 'text-red-400'}`}>
                               {item.reco}
                            </td>
                            <td className="p-4 text-xs font-mono font-bold text-slate-400 text-right">{item.target}</td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                 ) : (
                   <div className="p-2 space-y-2">
                      {news.map((item, idx) => (
                        <div key={idx} className="p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30 flex items-start gap-3 group">
                           <ChevronRight size={14} className="text-yellow-400 shrink-0 mt-1" />
                           <p className="text-xs font-bold text-slate-100 leading-relaxed">{item.title}</p>
                        </div>
                      ))}
                   </div>
                 )}
               </div>
             ) : (
               <div className="py-20 text-center text-slate-700">
                  <AlertCircle size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No active calls found.</p>
               </div>
             )}
          </div>
        </section>

        {/* 2. Live Feed - Iframe */}
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <Globe size={20} className="text-blue-400" />
              <h3 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">Market Context (Source)</h3>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl h-[400px] relative group">
            <iframe 
              src={STOCK_IDEAS_URL} 
              className="w-full h-full border-0 grayscale group-hover:grayscale-0 transition-all duration-500 opacity-60 group-hover:opacity-100"
              title="Moneycontrol Live Context"
              loading="lazy"
            />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-40"></div>
          </div>
        </section>

        {/* 3. Best 5 Recommendations */}
        <section className="pb-10">
          <div className="flex items-center gap-2 mb-6 px-1 border-t border-slate-800 pt-10">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/20">
              <Zap size={20} className="fill-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">Best 5 Quant Picks</h3>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">High-Conviction Technical Alignment</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
            {isLoading ? (
              [1,2,3].map(i => <div key={i} className="h-48 bg-slate-900 border border-slate-800 rounded-3xl animate-pulse"></div>)
            ) : recommendations.length > 0 ? (
              recommendations.map(stock => (
                <StockCard key={stock.symbol} stock={stock} marketData={marketData} onTrade={onTrade} />
              ))
            ) : (
              <div className="col-span-full py-10 text-center border border-dashed border-slate-800 rounded-3xl text-slate-600">
                <Search size={24} className="mx-auto mb-2 opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">Scanning technical alpha...</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="h-6 shrink-0"></div>
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
