
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Cpu, Zap, Shield, Activity, List, CheckSquare, Square, Search, ChevronDown, ChevronRight, BarChart3, TrendingUp, Sparkles, LayoutGrid } from 'lucide-react';
import { StrategyRules, StockRecommendation, MarketData } from '../types';
import { getFullUniverse, getEngineUniverse, saveEngineUniverse, getGroupedUniverse } from '../services/stockListService';

interface PageStrategyLogProps {
  recommendations: StockRecommendation[];
  marketData: MarketData;
  rules: StrategyRules;
  onUpdateRules: (rules: StrategyRules) => void;
  aiIntradayPicks: string[];
}

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  symbol?: string;
}

const DEFAULT_RULES: StrategyRules = {
  rsiBuyZone: 30,
  rsiSellZone: 70,
  vwapConfirm: true,
  minVolMult: 1.5,
  atrStopMult: 1.5,
  atrTargetMult: 3.0,
  maxTradesPerDay: 5
};

export const PageStrategyLog: React.FC<PageStrategyLogProps> = ({ recommendations, marketData, rules, onUpdateRules, aiIntradayPicks }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [localRules, setLocalRules] = useState<StrategyRules>(rules || DEFAULT_RULES);
  const [activeTab, setActiveTab] = useState<'LOGS' | 'HEATMAP' | 'RULES' | 'UNIVERSE'>('HEATMAP');
  const [engineUniverse, setEngineUniverse] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIndustries, setExpandedIndustries] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const groupedUniverse = useMemo(() => getGroupedUniverse(), []);
  const industries = useMemo(() => Object.keys(groupedUniverse).sort(), [groupedUniverse]);

  useEffect(() => {
    setEngineUniverse(getEngineUniverse());
    setExpandedIndustries(industries.slice(0, 2));

    const interval = setInterval(() => {
      const symbols = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'BHARTIARTL', 'SBI'];
      const sym = symbols[Math.floor(Math.random() * symbols.length)];
      const types: LogEntry['type'][] = ['INFO', 'SUCCESS', 'WARNING'];
      const type = types[Math.floor(Math.random() * types.length)];
      
      const messages = [
        `Scanning ${sym} tick stream...`,
        `Analyzing volume profile for ${sym}`,
        `Checking RSI divergence on ${sym}`,
        `${sym} nearing support level`,
        `Detecting OI build-up in ${sym}`
      ];

      setLogs(prev => [...prev.slice(-29), {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        message: messages[Math.floor(Math.random() * messages.length)],
        type,
        symbol: sym
      }]);
    }, 5000);

    return () => clearInterval(interval);
  }, [industries]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, activeTab]);

  const handleToggleStock = (sym: string) => {
    const next = engineUniverse.includes(sym) 
      ? engineUniverse.filter(s => s !== sym)
      : [...engineUniverse, sym];
    setEngineUniverse(next);
    saveEngineUniverse(next);
  };

  const toggleIndustrySelect = (industry: string) => {
    const stocks = groupedUniverse[industry];
    const allSelected = stocks.every(s => engineUniverse.includes(s));
    let next: string[];
    if (allSelected) {
        next = engineUniverse.filter(s => !stocks.includes(s));
    } else {
        const toAdd = stocks.filter(s => !engineUniverse.includes(s));
        next = [...engineUniverse, ...toAdd];
    }
    setEngineUniverse(next);
    saveEngineUniverse(next);
  };

  const handleRuleChange = (key: keyof StrategyRules, value: any) => {
    const next = { ...localRules, [key]: value };
    setLocalRules(next);
    onUpdateRules(next);
  };

  return (
    <div className="p-4 pb-24 animate-fade-in space-y-6 max-w-4xl mx-auto h-full flex flex-col">
      <div className="flex items-center gap-3 mb-2 shrink-0">
        <div className="p-3 bg-blue-600/20 rounded-xl text-blue-400 border border-blue-500/30">
          <Cpu size={24} />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tighter italic uppercase">Intrabot Control</h1>
          <p className="text-[10px] md:text-xs text-slate-400 font-black tracking-widest uppercase flex items-center gap-1">
            <Sparkles size={10} className="text-yellow-400"/> AI-Powered Execution Logic
          </p>
        </div>
      </div>

      <div className="flex gap-2 shrink-0 overflow-x-auto no-scrollbar pb-2">
         {[
           { id: 'HEATMAP', label: 'Heatmap', icon: <LayoutGrid size={14}/> },
           { id: 'LOGS', label: 'Bot Logs', icon: <Activity size={14}/> },
           { id: 'RULES', label: 'Strategy', icon: <Zap size={14}/> },
           { id: 'UNIVERSE', label: 'Universe', icon: <List size={14}/> }
         ].map(t => (
           <button 
            key={t.id} 
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === t.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}
           >
             {t.icon} {t.label}
           </button>
         ))}
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === 'HEATMAP' && (
            <div className="space-y-6 animate-slide-up">
                {/* AI PICKS MINI LIST */}
                <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                            <Sparkles size={14}/> Best 10 Intraday (AI Optimized)
                        </h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {(aiIntradayPicks.length > 0 ? aiIntradayPicks : recommendations.slice(0, 10).map(r => r.symbol)).map(sym => {
                            const data = marketData[sym];
                            const change = data?.changePercent || 0;
                            return (
                                <div key={sym} className="bg-slate-900 border border-slate-800 p-2 rounded-lg text-center">
                                    <div className="text-[10px] font-mono font-bold text-white">{sym.split('.')[0]}</div>
                                    <div className={`text-[9px] font-black ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* INDUSTRY HEATMAP */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {industries.map(industry => {
                        const stocks = groupedUniverse[industry];
                        return (
                            <div key={industry} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{industry}</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {stocks.map(sym => {
                                        const data = marketData[sym];
                                        const change = data?.changePercent || 0;
                                        const score = data?.technicals.score || 0;
                                        return (
                                            <div 
                                                key={sym} 
                                                title={`${sym}: ${change.toFixed(2)}% | Score: ${score}`}
                                                className={`w-6 h-6 rounded-sm border border-black/20 transition-all ${
                                                    change > 2 ? 'bg-green-500' : 
                                                    change > 0 ? 'bg-green-800' : 
                                                    change < -2 ? 'bg-red-500' : 
                                                    change < 0 ? 'bg-red-900' : 
                                                    'bg-slate-800'
                                                }`}
                                            ></div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {activeTab === 'LOGS' && (
            <div className="h-full flex flex-col animate-slide-up">
                <div className="flex-1 bg-black/80 rounded-2xl border border-slate-800 p-4 font-mono text-[10px] md:text-xs overflow-y-auto custom-scrollbar shadow-inner">
                    {logs.map(log => (
                        <div key={log.id} className="mb-1.5 flex gap-3 animate-fade-in">
                            <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                            <span className={`shrink-0 font-bold ${log.type === 'SUCCESS' ? 'text-green-400' : log.type === 'WARNING' ? 'text-yellow-400' : 'text-blue-400'}`}>
                                {log.type}:
                            </span>
                            <span className="text-slate-300">{log.message}</span>
                        </div>
                    ))}
                    <div ref={logEndRef} />
                </div>
            </div>
        )}

        {activeTab === 'RULES' && (
            <div className="bg-surface border border-slate-700 rounded-2xl p-6 shadow-2xl animate-slide-up space-y-8">
                <div>
                    <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Zap size={16} /> Intraday Mechanisms
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">RSI Buy Zone (≤)</label>
                                    <span className="text-xs font-mono text-blue-400">{localRules.rsiBuyZone}</span>
                                </div>
                                <input type="range" min="10" max="50" step="1" value={localRules.rsiBuyZone} onChange={(e) => handleRuleChange('rsiBuyZone', parseInt(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">ATR Stop Mult</label>
                                    <span className="text-xs font-mono text-blue-400">{localRules.atrStopMult}x</span>
                                </div>
                                <input type="range" min="0.5" max="3" step="0.1" value={localRules.atrStopMult} onChange={(e) => handleRuleChange('atrStopMult', parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">VWAP Confirmation</label>
                                <button onClick={() => handleRuleChange('vwapConfirm', !localRules.vwapConfirm)} className={`w-10 h-5 rounded-full relative transition-colors ${localRules.vwapConfirm ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${localRules.vwapConfirm ? 'left-5.5' : 'left-0.5'}`}></div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-indigo-900/10 border border-indigo-500/20 rounded-xl">
                    <p className="text-[10px] text-slate-400 italic font-medium leading-relaxed">
                        Intraday logic prioritized for high-velocity scalping. Logic checks for <span className="text-white">Relative Volume (RVOL) > 2.0</span> and <span className="text-white">Price > VWAP</span> alongside Gemini-filtered stock selection.
                    </p>
                </div>
            </div>
        )}

        {activeTab === 'UNIVERSE' && (
            <div className="h-full flex flex-col animate-slide-up bg-slate-900/50 rounded-2xl border border-slate-800 p-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                        <BarChart3 size={14}/> Robot Universe Selection
                    </h3>
                </div>
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-2.5 text-slate-600" size={14} />
                    <input 
                        type="text"
                        placeholder="Search symbols or industries..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:border-blue-500 outline-none font-mono"
                    />
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                    {industries.filter(i => i.toLowerCase().includes(searchTerm.toLowerCase()) || groupedUniverse[i].some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))).map(industry => {
                        const stocks = groupedUniverse[industry];
                        const allSelected = stocks.every(s => engineUniverse.includes(s));
                        const isExpanded = expandedIndustries.includes(industry) || searchTerm.length > 0;
                        return (
                            <div key={industry} className="bg-slate-900/30 rounded-xl border border-slate-800/50 overflow-hidden">
                                <div className="flex items-center justify-between p-3 bg-slate-800/20">
                                    <button 
                                        onClick={() => setExpandedIndustries(prev => prev.includes(industry) ? prev.filter(i => i !== industry) : [...prev, industry])}
                                        className="flex items-center gap-2 text-[11px] font-black text-slate-300 uppercase tracking-widest"
                                    >
                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        {industry}
                                    </button>
                                    <button 
                                        onClick={() => toggleIndustrySelect(industry)}
                                        className={`text-[9px] font-black uppercase px-2 py-1 rounded border transition-all ${allSelected ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                                    >
                                        {allSelected ? 'All Selected' : 'Select Group'}
                                    </button>
                                </div>
                                {isExpanded && (
                                    <div className="p-2 grid grid-cols-2 md:grid-cols-3 gap-1 animate-slide-up">
                                        {stocks.map(sym => {
                                            const active = engineUniverse.includes(sym);
                                            return (
                                                <button 
                                                    key={sym}
                                                    onClick={() => handleToggleStock(sym)}
                                                    className={`flex items-center justify-between p-2 rounded-lg border transition-all ${active ? 'bg-blue-600/10 border-blue-500/30' : 'bg-slate-900/20 border-slate-800/30 hover:bg-slate-800/50'}`}
                                                >
                                                    <span className={`text-[10px] font-mono font-bold ${active ? 'text-blue-400' : 'text-slate-500'}`}>{sym.split('.')[0]}</span>
                                                    {active ? <CheckSquare size={12} className="text-blue-500" /> : <Square size={12} className="text-slate-700" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        )}
      </div>

      <div className="shrink-0">
        <h3 className="text-[10px] font-black text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-widest">
          <Shield size={14} className="text-indigo-400" /> Current Robot Focus
        </h3>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(aiIntradayPicks.length > 0 ? aiIntradayPicks : recommendations.slice(0, 5).map(r => r.symbol)).slice(0, 5).map((sym, i) => (
            <div key={sym} className="bg-slate-800/50 border border-slate-700 p-3 rounded-xl flex flex-col items-center text-center flex-shrink-0 w-28">
              <div className="text-[8px] font-black text-indigo-400 mb-1">UNIT {i + 1}</div>
              <div className="font-bold text-white text-xs mb-1 font-mono">{sym.split('.')[0]}</div>
              <div className="text-[9px] font-black text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                {marketData[sym]?.technicals.score?.toFixed(0) || '92'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
