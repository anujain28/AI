
import React from 'react';
import { StockRecommendation, MarketData, MarketSettings } from '../types';
import { StockCard } from './StockCard';
import { RefreshCw, List, ShieldAlert, Settings } from 'lucide-react';

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
  return (
    <div className="p-4 pb-24 animate-fade-in max-w-lg mx-auto md:max-w-none">
      <div className="flex justify-between items-start mb-6">
         <div>
             <h1 className="text-3xl font-black text-white italic leading-none uppercase tracking-tighter">AI Analysis</h1>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                 <List size={12} className="text-blue-500" /> Watchlist Scanning Active
             </p>
         </div>
         <button onClick={onRefresh} disabled={isLoading} className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl hover:bg-blue-500 transition-all active:scale-95">
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
         </button>
      </div>

      <div className="space-y-4">
        {recommendations.length > 0 ? (
          recommendations.map(item => (
            <div key={item.symbol} className="relative group">
                <StockCard stock={item} marketData={marketData} onTrade={onTrade} />
                
                {/* Support/Resistance Overlay for Card */}
                {marketData[item.symbol] && (
                    <div className="mt-2 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-xl flex justify-between text-[10px] font-mono">
                        <div className="text-red-400 flex items-center gap-1">RES: ₹{marketData[item.symbol].technicals.resistance.toFixed(1)}</div>
                        <div className="text-blue-400 flex items-center gap-1">VWAP: ₹{marketData[item.symbol].technicals.vwap?.toFixed(1)}</div>
                        <div className="text-green-400 flex items-center gap-1">SUP: ₹{marketData[item.symbol].technicals.support.toFixed(1)}</div>
                    </div>
                )}
            </div>
          ))
        ) : !isLoading && (
            <div className="text-center py-20 px-6 border-2 border-dashed border-slate-800 rounded-3xl">
                <ShieldAlert size={48} className="mx-auto mb-4 text-slate-700" />
                <h3 className="text-white font-bold mb-2">No High-Confidence Signals</h3>
                <p className="text-xs text-slate-500 mb-6">Either your watchlist is empty or no stocks currently meet the OI profiling criteria.</p>
                <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Manage your symbols in the Config tab</p>
            </div>
        )}
      </div>
    </div>
  );
};
