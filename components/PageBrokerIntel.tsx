
import React from 'react';
import { RefreshCw, Globe, Terminal, ExternalLink } from 'lucide-react';

const STOCK_IDEAS_URL = "https://www.moneycontrol.com/markets/stock-ideas/";

interface PageBrokerIntelProps {
  onRefresh: () => void;
  isLoading: boolean;
}

export const PageBrokerIntel: React.FC<PageBrokerIntelProps> = ({
  onRefresh,
  isLoading,
}) => {
  return (
    <div className="h-full flex flex-col animate-fade-in max-w-lg mx-auto md:max-w-none">
      {/* Header - Minimalist */}
      <div className="p-4 flex justify-between items-start shrink-0">
        <div>
          <h1 className="text-3xl font-black text-white italic leading-none uppercase tracking-tighter flex items-center gap-2">
            Broker Intel
            <Terminal size={24} className="text-blue-400" />
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2 text-slate-500">
            <Globe size={12} className="text-blue-500" />
            Live MoneyControl Feed
          </p>
        </div>
        <div className="flex gap-2">
            <a 
                href={STOCK_IDEAS_URL} 
                target="_blank" 
                rel="noreferrer"
                className="p-3 bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition-all border border-slate-700"
                title="Open in Browser"
            >
                <ExternalLink size={20} />
            </a>
            <button 
                onClick={onRefresh} 
                disabled={isLoading} 
                className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-50"
            >
                <RefreshCw size={22} className={isLoading ? 'animate-spin' : ''} />
            </button>
        </div>
      </div>

      {/* Main View - Dedicated Live Iframe */}
      <div className="flex-1 px-4 pb-24">
        <div className="w-full h-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative group bg-slate-950">
          {isLoading && (
              <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] animate-pulse">Syncing Live Source...</p>
              </div>
          )}
          
          <iframe 
            src={STOCK_IDEAS_URL} 
            className="w-full h-full border-0 transition-opacity duration-500"
            title="Moneycontrol Live Context"
            loading="lazy"
            onLoad={() => {}} // Optional: Can trigger loading state end here if preferred
          />
          
          {/* Overlay gradient to blend bottom edge */}
          <div className="absolute bottom-0 left-0 w-full h-20 pointer-events-none bg-gradient-to-t from-slate-950 to-transparent"></div>
        </div>
      </div>
    </div>
  );
};
