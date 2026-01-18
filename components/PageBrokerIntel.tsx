
import React, { useState, useMemo } from 'react';
import { StockRecommendation, MarketData } from '../types';
import { StockCard } from './StockCard';
import { Building2, RefreshCw, Calendar, Zap, TrendingUp, Info, ExternalLink, ShieldCheck } from 'lucide-react';

interface PageBrokerIntelProps {
  recommendations: StockRecommendation[];
  marketData: MarketData;
  onTrade: (stock: StockRecommendation) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const PageBrokerIntel: React.FC<PageBrokerIntelProps> = ({
  recommendations,
  marketData,
  onTrade,
  onRefresh,
  isLoading
}) => {
  const [activeTimeframe, setActiveTimeframe] = useState<'BTST' | 'WEEKLY' | 'MONTHLY'>('BTST');

  const filteredPicks = useMemo(() => {
    return recommendations.filter(r => r.timeframe === activeTimeframe);
  }, [recommendations, activeTimeframe]);

  const stats = useMemo(() => {
    return {
      btst: recommendations.filter(r => r.timeframe === 'BTST').length,
      weekly: recommendations.filter(r => r.timeframe === 'WEEKLY').length,
      monthly: recommendations.filter(r => r.timeframe === 'MONTHLY').length,
    };
  }, [recommendations]);

  return (
    <div className="p-4 pb-24 animate-fade-in max-w-lg mx-auto md:max-w-none">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-black text-white italic leading-none uppercase tracking-tighter flex items-center gap-2">
            Broker Intel
            <ShieldCheck size={24} className="text-indigo-400" />
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2 text-slate-500">
            <Building2 size={12} className="text-indigo-500" />
            Institutional Alpha Aggregator
          </p>
        </div>
        <button 
          onClick={onRefresh} 
          disabled={isLoading} 
          className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={22} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Info size={14} className="text-indigo-400" />
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Synthesized Sources</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {['Angel One', '5paisa', 'Kotak', 'HDFC', 'Groww', 'Sharekhan'].map(s => (
            <span key={s} className="text-[8px] font-black bg-slate-800 px-2 py-1 rounded text-slate-400 uppercase">{s}</span>
          ))}
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="flex bg-slate-900/80 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-800 mb-8">
        {[
          { id: 'BTST', label: 'BTST', icon: <Zap size={14} />, count: stats.btst },
          { id: 'WEEKLY', label: 'Weekly', icon: <Calendar size={14} />, count: stats.weekly },
          { id: 'MONTHLY', label: 'Monthly', icon: <TrendingUp size={14} />, count: stats.monthly }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTimeframe(tab.id as any)}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 rounded-xl transition-all ${
              activeTimeframe === tab.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                : 'text-slate-500 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2 mb-0.5">
              {tab.icon}
              <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
            </div>
            <span className={`text-[8px] font-mono ${activeTimeframe === tab.id ? 'text-indigo-200' : 'text-slate-600'}`}>{tab.count} Picks</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-slate-900/50 rounded-2xl border border-slate-800 animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPicks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
              {filteredPicks.map(stock => (
                <StockCard key={stock.symbol} stock={stock} marketData={marketData} onTrade={onTrade} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl">
              <Zap size={32} className="mx-auto text-slate-700 mb-4 opacity-20" />
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                Scouting {activeTimeframe} Alpha...
              </p>
            </div>
          )}
        </div>
      )}
      
      <div className="h-12"></div>
    </div>
  );
};
