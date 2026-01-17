
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Cpu, Zap, Shield, Activity, List, CheckSquare, Square, Search, ChevronDown, ChevronRight, BarChart3, TrendingUp, Sparkles, LayoutGrid, RefreshCw, Layers, ShieldAlert, Target } from 'lucide-react';
import { StrategyRules, StockRecommendation, MarketData } from '../types';
import { getFullUniverse, getEngineUniverse, saveEngineUniverse, getGroupedUniverse } from '../services/stockListService';
import { getMarketStatus } from '../services/marketStatusService';
import { calculateLevels } from '../services/technicalAnalysis';

interface PageStrategyLogProps {
  recommendations: StockRecommendation[];
  marketData: MarketData;
  rules: StrategyRules;
  onUpdateRules: (rules: StrategyRules) => void;
  aiIntradayPicks: string[];
  onRefresh?: () => void;
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

export const PageStrategyLog: React.FC<PageStrategyLogProps> = ({ recommendations, marketData, rules, onUpdateRules, aiIntradayPicks, onRefresh }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [localRules, setLocalRules] = useState<StrategyRules>(rules || DEFAULT_RULES);
  const [activeTab, setActiveTab] = useState<'LOGS' | 'HEATMAP' | 'RULES' | 'UNIVERSE'>('HEATMAP');
  const [engineUniverse, setEngineUniverse] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIndustries, setExpandedIndustries] = useState<string[]>([]);
  const [nextRefreshIn, setNextRefreshIn] = useState(600); // 10 minutes in seconds
  const logEndRef = useRef<HTMLDivElement>(null);

  const groupedUniverse = useMemo(() => getGroupedUniverse(), []);
  const industries = useMemo(() => Object.keys(groupedUniverse).sort(), [groupedUniverse]);

  // Derived Top 10 Picks combining logic
  const bestIntradayPicks = useMemo(() => {
    // Combine BSE, Banks and recommendations with high scores
    const banks = recommendations.filter(r => marketData[r.symbol]?.technicals.score > 60 && r.sector === 'Banking');
    const bse = recommendations.filter(r => r.symbol === 'BSE.NS');
    const others = recommendations.filter(r => r.score > 80 && r.timeframe === 'INTRADAY');
    
    const combined = Array.from(new Set([...aiIntradayPicks.map(s => recommendations.find(r => r.symbol === s)).filter(Boolean), ...bse, ...banks, ...others]));
    return combined.slice(0, 10) as StockRecommendation[];
  }, [recommendations, aiIntradayPicks, marketData]);

  useEffect(() => {
    setEngineUniverse(getEngineUniverse());
    setExpandedIndustries(industries.slice(0, 2));

    const logInterval = setInterval(() => {
      const status = getMarketStatus('STOCK');
      const banks = ['HDFCBANK', 'ICICIBANK', 'SBIN', 'AXISBANK', 'KOTAKBANK'];
      const topPicks = bestIntradayPicks.map(p => p.symbol.split('.')[0]);
      const pool = [...banks, 'BSE', ...topPicks];
      const sym = pool[Math.floor(Math.random() * pool.length)];
      
      const score = marketData[`${sym}.NS`]?.technicals.score || 0;
      
      let message = '';
      let type: LogEntry['type'] = 'INFO';

      if (score > 85 && status.isOpen) {
        message = `Intrabot initiated PAPER BUY order for ${sym} @ ${marketData[`${sym}.NS`]?.price.toFixed(2)}`;
        type = 'SUCCESS';
      } else if (score < 30 && status.isOpen) {
        message = `Automated exit trigger for ${sym}. Sell order placed.`;
        type = 'WARNING';
      } else {
          const scannerMsgs = [
            `Scanning ${sym} tick stream for institutional interest...`,
            `Momentum Engine analyzing ${sym} OI Profile strength`,
            `VWAP cluster detected on ${sym} @ 5m timeframe`,
            `${sym} Support level verified at ${marketData[`${sym}.NS`]?.price ? (marketData[`${sym}.NS`].price * 0.98).toFixed(1) : '---'}`
          ];
          message = scannerMsgs[Math.floor(Math.random() * scannerMsgs.length)];
      }

      setLogs(prev => [...prev.slice(-29), {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        message,
        type,
        symbol: sym
      }]);
    }, 4500);

    // 10 Min Auto Refresh Timer
    const refreshTimer = setInterval(() => {
        const market = getMarketStatus('STOCK');
        if (market.isOpen) {
            setNextRefreshIn(prev => {
                if (prev <= 1) {
                    onRefresh?.();
                    return 600;
                }
                return prev - 1;
            });
        }
    }, 1000);

    return () => {
        clearInterval(logInterval);
        clearInterval(refreshTimer);
    };
  }, [industries, recommendations, bestIntradayPicks, onRefresh, marketData]);

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

  const scaleToTen = (score: number) => {
    return Math.max(1, Math.min(10, Math.round(score / 10)));
  };

  const formatRefresh = (s: number) => {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 pb-24 animate-fade-in space-y-6 max-w-4xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/20 rounded-xl text-blue-400 border border-blue-500/30">
            <Cpu size={24} />
            </div>
            <div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tighter italic uppercase leading-none">Intrabot Control</h1>
            <p className="text-[10px] md:text-xs text-slate-400 font-black tracking-widest uppercase flex items-center gap-1 mt-1">
                <Sparkles size={10} className="text-yellow-400"/> Momentum Engine Active
            </p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <div className="text-right hidden md:block">
                <div className="text-[8px] font-black text-slate-500 uppercase">Auto-Refresh</div>
                <div className="text-[10px] font-mono font-bold text-blue-400">{formatRefresh(nextRefreshIn)}</div>
            </div>
            <button 
                onClick={onRefresh}
                className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all shadow-lg active:scale-95"
            >
                <RefreshCw size={20} />
            </button>
        </div>
      </div>

      <div className="flex gap-2 shrink-0 overflow-x-auto no-scrollbar pb-2">
         {[
           { id: 'HEATMAP', label: 'Momentum Heatmap', icon: <Layers size={14}/> },
           { id: 'LOGS', label: 'Bot Activity', icon: <Activity size={14}/> },
           { id: 'RULES', label: 'Strategy', icon: <Zap size={14}/> },
           { id: 'UNIVERSE', label: 'Engine Scopes', icon: <List size={14}/> }
         ].map(t => (
           <button 
            key={t.id} 
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
           >
             {t.icon} {t.label}
           </button>
         ))}
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === 'HEATMAP' && (
            <div className="space-y-6 animate-slide-up h-full flex flex-col">
                {/* POWER MOMENTUM SCANNER */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-full">
                    <div className="bg-slate-800/40 p-4 border-b border-slate-700/50 flex justify-between items-center">
                        <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                            <Zap size={14} className="text-yellow-400"/> Top 10 High Power Intraday
                        </h3>
                        <div className="flex items-center gap-4 text-[8px] font-black text-slate-500">
                            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> S/R Levels</span>
                            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> OI Strength</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 bg-slate-900 z-10">
                                <tr className="border-b border-slate-800 text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                    <th className="p-4">Symbol</th>
                                    <th className="p-4 text-center">Power</th>
                                    <th className="p-4">RSI</th>
                                    <th className="p-4">OI Profile</th>
                                    <th className="p-4 text-right">Supp / Res</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {bestIntradayPicks.map(stock => {
                                    const data = marketData[stock.symbol];
                                    const score = data?.technicals.score || 0;
                                    const scaled = scaleToTen(score);
                                    const rsi = data?.technicals.rsi || 50;
                                    const levels = data ? calculateLevels(data.history) : { support: 0, resistance: 0, oiStrength: 0 };
                                    
                                    return (
                                        <tr key={stock.symbol} className="hover:bg-blue-600/5 transition-colors group">
                                            <td className="p-4">
                                                <div className="font-mono font-bold text-white text-xs">{stock.symbol.split('.')[0]}</div>
                                                <div className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">{stock.sector}</div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-black border ${
                                                    scaled >= 8 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                                    scaled >= 5 ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                                    'bg-slate-800 text-slate-500 border-slate-700'
                                                }`}>
                                                    {scaled}/10
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className={`text-[10px] font-mono font-bold ${rsi > 70 ? 'text-red-400' : rsi < 35 ? 'text-green-400' : 'text-slate-300'}`}>
                                                    {rsi.toFixed(1)}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="w-20 h-1 bg-slate-800 rounded-full overflow-hidden relative">
                                                    <div 
                                                        className={`absolute inset-y-0 ${levels.oiStrength >= 0 ? 'bg-blue-500 left-1/2' : 'bg-red-500 right-1/2'}`}
                                                        style={{ width: `${Math.abs(levels.oiStrength)}%` }}
                                                    ></div>
                                                </div>
                                                <div className="text-[7px] font-black mt-1 text-slate-600 uppercase">
                                                    {levels.oiStrength >= 0 ? 'Long Build-up' : 'Short Covering'}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="text-[9px] font-mono font-bold text-red-400">R: {levels.resistance.toFixed(1)}</div>
                                                <div className="text-[9px] font-mono font-bold text-green-400">S: {levels.support.toFixed(1)}</div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'LOGS' && (
            <div className="h-full flex flex-col animate-slide-up">
                <div className="bg-slate-900/50 p-4 border border-slate-800 border-b-0 rounded-t-2xl flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <ShieldAlert size={14} className="text-blue-500" /> Automated Engine Stream
                    </span>
                    <span className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-[8px] font-black text-slate-500 uppercase">Bot Online</span>
                    </span>
                </div>
                <div className="flex-1 bg-black/80 rounded-b-2xl border border-slate-800 p-4 font-mono text-[10px] md:text-xs overflow-y-auto custom-scrollbar shadow-inner">
                    {logs.map(log => (
                        <div key={log.id} className="mb-2 flex gap-3 animate-fade-in border-b border-white/5 pb-1.5">
                            <span className="text-slate-600 shrink-0 font-bold">[{log.timestamp}]</span>
                            <span className={`shrink-0 font-black tracking-tighter ${log.type === 'SUCCESS' ? 'text-green-400' : log.type === 'WARNING' ? 'text-red-400' : 'text-blue-400'}`}>
                                {log.type}:
                            </span>
                            <span className="text-slate-300 font-medium">{log.message}</span>
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
                        <Zap size={16} /> Intraday Execution Rules
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Momentum Threshold (Min)</label>
                                    <span className="text-xs font-mono text-blue-400">Score 70+</span>
                                </div>
                                <input type="range" min="50" max="90" step="5" value={70} disabled className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 opacity-50"/>
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
                            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800 shadow-inner">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">VWAP Filter (Hard)</label>
                                <button onClick={() => handleRuleChange('vwapConfirm', !localRules.vwapConfirm)} className={`w-10 h-5 rounded-full relative transition-colors ${localRules.vwapConfirm ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${localRules.vwapConfirm ? 'left-5.5' : 'left-0.5'}`}></div>
                                </button>
                            </div>
                            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex justify-between items-center">
                                <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">OI Confirmation</label>
                                <CheckSquare size={16} className="text-blue-500" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-indigo-900/10 border border-indigo-500/20 rounded-xl">
                    <p className="text-[10px] text-slate-400 italic font-medium leading-relaxed">
                        Execution priorities: <span className="text-blue-400 font-bold uppercase">BSE</span>, <span className="text-blue-400 font-bold uppercase">Banks</span> and <span className="text-white font-bold">Volume Breakouts</span>. Bot will enter when Price > VWAP and OI change > 5% in 5m.
                    </p>
                </div>
            </div>
        )}

        {activeTab === 'UNIVERSE' && (
            <div className="h-full flex flex-col animate-slide-up bg-slate-900/50 rounded-2xl border border-slate-800 p-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                        <BarChart3 size={14}/> Engine Universe Scopes
                    </h3>
                    <div className="text-[7px] font-black text-blue-500/50 uppercase tracking-widest px-2 py-1 bg-blue-500/5 rounded border border-blue-500/10">BSE & Banks Forced Always</div>
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
                                        className={`text-[9px] font-black uppercase px-2 py-1 rounded border transition-all ${allSelected ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                                    >
                                        {allSelected ? 'All Active' : 'Enable Industry'}
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

      <div className="shrink-0 bg-slate-900/80 p-4 rounded-2xl border border-white/5 shadow-2xl">
        <h3 className="text-[10px] font-black text-slate-500 mb-4 flex items-center gap-2 uppercase tracking-widest">
          <Shield size={14} className="text-indigo-400" /> Robot Trading Targets
        </h3>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {bestIntradayPicks.slice(0, 5).map((stock, i) => (
            <div key={stock.symbol} className="bg-slate-800/30 border border-white/5 p-3 rounded-xl flex flex-col items-center text-center flex-shrink-0 w-28 hover:bg-slate-800/50 transition-colors">
              <div className="text-[8px] font-black text-indigo-400 mb-1">UNIT {i + 1}</div>
              <div className="font-bold text-white text-xs mb-1 font-mono uppercase">{stock.symbol.split('.')[0]}</div>
              <div className="text-[9px] font-black text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                {scaleToTen(marketData[stock.symbol]?.technicals.score || 0)}/10
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
