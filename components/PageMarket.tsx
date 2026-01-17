
import React from 'react';
import { StockRecommendation, MarketData, MarketSettings } from '../types';
import { StockCard } from './StockCard';
import { RefreshCw, Zap, Clock, ShieldAlert, BarChart3 } from 'lucide-react';

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
  const intradayPicks = recommendations.filter(r => r.timeframe === 'INTRADAY');
  const btstPicks = recommendations.filter(r => r.timeframe === 'BTST');

  return (
    <div className="p-4 pb-24 animate-fade-in max-w-lg mx-auto md:max-w-none">
      <div className="flex justify-between items-start mb-8">
         <div>
             <h1 className="text-3xl font-black text-white italic leading-none uppercase tracking-tighter">AI Robots</h1>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                 <BarChart3 size={12} className="text-blue-500" /> Top 5 Momentum Scanning
             </p>
         </div>
         <button 
           onClick={onRefresh} 
           disabled={isLoading} 
           className={`p-3 bg-blue-600 rounded-2xl text-white shadow-xl hover:bg-blue-500 transition-all active:scale-95 ${isLoading ? 'opacity-50' : ''}`}
         >
            <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
         </button>
      </div>

      <div className="space-y-10">
        {/* Intraday Robot Section */}
        <section>
            <div className="flex items-center gap-2 mb-4 px-1">
                <div className="p-2 bg-orange-500/20 rounded-xl text-orange-400 border border-orange-500/20">
                    <Zap size={18} fill="currentColor" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white uppercase tracking-tight italic">Intraday AI Robot</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Top 5 Momentum Picks</p>
                </div>
            </div>
            
            <div className="space-y-4">
                {intradayPicks.length > 0 ? (
                    intradayPicks.map(item => (
                        <div key={`intraday-${item.symbol}`} className="relative group">
                            <StockCard stock={item} marketData={marketData} onTrade={onTrade} />
                            {marketData[item.symbol] && (
                                <div className="mt-2 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-xl flex justify-between text-[10px] font-mono">
                                    <div className="text-red-400">RES: ₹{marketData[item.symbol].technicals.resistance.toFixed(1)}</div>
                                    <div className="text-blue-400">VWAP: ₹{marketData[item.symbol].technicals.vwap?.toFixed(1)}</div>
                                    <div className="text-green-400">SUP: ₹{marketData[item.symbol].technicals.support.toFixed(1)}</div>
                                </div>
                            )}
                        </div>
                    ))
                ) : !isLoading && (
                    <div className="py-8 text-center bg-slate-900/50 border border-slate-800 rounded-2xl border-dashed">
                        <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">No Intraday Signals</p>
                    </div>
                )}
            </div>
        </section>

        {/* BTST Robot Section */}
        <section>
            <div className="flex items-center gap-2 mb-4 px-1">
                <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400 border border-purple-500/20">
                    <Clock size={18} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white uppercase tracking-tight italic">BTST AI Robot</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Top 5 Carry Forward Picks</p>
                </div>
            </div>
            
            <div className="space-y-4">
                {btstPicks.length > 0 ? (
                    btstPicks.map(item => (
                        <div key={`btst-${item.symbol}`} className="relative group">
                            <StockCard stock={item} marketData={marketData} onTrade={onTrade} />
                            {marketData[item.symbol] && (
                                <div className="mt-2 px-3 py-2 bg-slate-900/50 border border-slate-800 rounded-xl flex justify-between text-[10px] font-mono">
                                    <div className="text-red-400">TARGET: ₹{item.targetPrice.toFixed(1)}</div>
                                    <div className="text-green-400">SUPPORT: ₹{item.support?.toFixed(1)}</div>
                                </div>
                            )}
                        </div>
                    ))
                ) : !isLoading && (
                    <div className="py-8 text-center bg-slate-900/50 border border-slate-800 rounded-2xl border-dashed">
                        <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">No BTST Signals</p>
                    </div>
                )}
            </div>
        </section>

        {recommendations.length === 0 && !isLoading && (
            <div className="text-center py-20 px-6 border-2 border-dashed border-slate-800 rounded-3xl">
                <ShieldAlert size={48} className="mx-auto mb-4 text-slate-700" />
                <h3 className="text-white font-bold mb-2 uppercase italic tracking-tighter text-xl">System Standby</h3>
                <p className="text-xs text-slate-500 mb-6 font-medium">Please select stocks in the <span className="text-blue-400 font-bold">Config</span> tab to enable AI Robot scanning.</p>
            </div>
        )}
      </div>
    </div>
  );
};
