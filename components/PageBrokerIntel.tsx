
import React, { useState, useMemo, useEffect } from 'react';
import { StockRecommendation, MarketData } from '../types';
import { StockCard } from './StockCard';
import { RefreshCw, Calendar, Zap, TrendingUp, ShieldCheck, Globe, Search, AlertCircle, Newspaper, ArrowRight, MessageSquare, Database, ExternalLink, Key } from 'lucide-react';

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
  const [activeTimeframe, setActiveTimeframe] = useState<'BTST' | 'WEEKLY' | 'MONTHLY'>('BTST');
  const [loadingStep, setLoadingStep] = useState(0);

  const steps = [
    "NAVIGATING TO MONEYCONTROL IDEAS...",
    "PARSING EXPERT RECOMMENDATIONS...",
    "EXTRACTING TARGETS & STOP LOSSES...",
    "SYNCING WITH NSE TICKER CORE...",
    "VALIDATING MOMENTUM SIGNALS..."
  ];

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep(s => (s + 1) % steps.length);
      }, 3000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

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

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      onRefresh();
    }
  };

  return (
    <div className="p-4 pb-24 animate-fade-in max-w-lg mx-auto md:max-w-none">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-black text-white italic leading-none uppercase tracking-tighter flex items-center gap-2">
            Stock Ideas
            <Newspaper size={24} className="text-blue-400" />
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2 text-slate-500">
            <Globe size={12} className="text-indigo-500" />
            Moneycontrol Intelligence Core
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

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 mb-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-blue-400" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Target Grounding URL</span>
            </div>
            <a href="https://www.moneycontrol.com/markets/stock-ideas/" target="_blank" rel="noreferrer" className="text-[9px] text-blue-400 font-black flex items-center gap-1 hover:underline">
                OPEN SOURCE <ExternalLink size={10}/>
            </a>
        </div>
        <div className="flex flex-wrap gap-2">
            <span className="text-[8px] font-black bg-blue-900/20 px-2 py-1.5 rounded-lg border border-blue-800/30 text-blue-400 uppercase">
                Technical Expert Picks
            </span>
            <span className="text-[8px] font-black bg-slate-800/80 px-2 py-1.5 rounded-lg border border-slate-700 text-slate-400 uppercase">
                Institutional Consensus
            </span>
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="flex bg-slate-900/80 backdrop-blur-sm rounded-2xl p-1.5 border border-slate-800 mb-8 sticky top-4 z-30 shadow-2xl">
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
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                : 'text-slate-500 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2 mb-0.5">
              {tab.icon}
              <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
            </div>
            <span className={`text-[8px] font-mono ${activeTimeframe === tab.id ? 'text-blue-200' : 'text-slate-600'}`}>{tab.count} Picks</span>
          </button>
        ))}
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
                <p className="text-[9px] text-slate-500 uppercase font-bold flex items-center justify-center gap-1">
                    <MessageSquare size={10}/> SCANNING MONEYCONTROL STOCK IDEAS
                </p>
            </div>
            <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 animate-[loading_2s_infinite]"></div>
            </div>
        </div>
      ) : error === 'QUOTA_EXCEEDED' ? (
        <div className="text-center py-16 border border-dashed border-red-500/40 rounded-3xl bg-red-900/10 px-6 animate-fade-in">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} className="text-red-400 animate-pulse" />
          </div>
          <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-2 italic">Intelligence Throttled</h3>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed mb-6">
            The Gemini API quota for the shared key has been exhausted.<br/>
            Please select your own API key to continue exploring.
          </p>
          <div className="flex flex-col gap-3 max-w-[240px] mx-auto">
            <button 
              onClick={handleSelectKey} 
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20"
            >
              <Key size={14}/> Select Personal API Key
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noreferrer" 
              className="text-[9px] text-slate-500 font-bold uppercase tracking-widest hover:text-white transition-colors"
            >
              Learn about API Billing & Quotas
            </a>
          </div>
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
            <div className="text-center py-20 border border-dashed border-slate-800 rounded-3xl bg-slate-900/20 px-6">
              <AlertCircle size={32} className="mx-auto text-slate-700 mb-4 opacity-20" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                No active {activeTimeframe} ideas found on Moneycontrol today.<br/>
                Try refreshing or checking search tool permissions.
              </p>
              <button 
                onClick={onRefresh} 
                className="mt-6 flex items-center gap-2 mx-auto bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20"
              >
                Force Deep Crawl <ArrowRight size={14}/>
              </button>
            </div>
          )}
        </div>
      )}
      
      <div className="h-12"></div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};
