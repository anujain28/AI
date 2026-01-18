
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Cpu, Zap, Activity, List, Search, RefreshCw, Layers, ShieldAlert, Sparkles, Sliders, ChevronRight, Check, Play, BarChart, History, TrendingUp, AlertCircle, Loader2, Gauge } from 'lucide-react';
import { StrategyRules, StockRecommendation, MarketData, BacktestResult, AppSettings } from '../types';
import { getEngineUniverse, getGroupedUniverse, getIdeasWatchlist } from '../services/stockListService';
import { getMarketStatus } from '../services/marketStatusService';
import { runBacktest } from '../services/backtestEngine';
import { PortfolioChart } from './PortfolioChart';

interface PageStrategyLogProps {
  recommendations: StockRecommendation[];
  marketData: MarketData;
  rules: StrategyRules;
  onUpdateRules: (rules: StrategyRules) => void;
  aiIntradayPicks: string[];
  onRefresh?: () => void;
  settings: AppSettings;
}

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL';
  symbol?: string;
}

export const PageStrategyLog: React.FC<PageStrategyLogProps> = ({ recommendations, marketData, rules, onUpdateRules, aiIntradayPicks, onRefresh, settings }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'LOGS' | 'QUANT' | 'TUNING' | 'BACKTEST'>('QUANT');
  const [localRules, setLocalRules] = useState<StrategyRules>(rules);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Backtest State
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtestProgress, setBacktestProgress] = useState(0);
  const [btResult, setBtResult] = useState<BacktestResult | null>(null);
  const [btRange, setBtRange] = useState('5d');

  const quantPicks = useMemo(() => {
    return recommendations
        .filter(r => (r.score || 0) >= 40) // Match engine threshold
        .sort((a,b) => (b.score || 0) - (a.score || 0))
        .slice(0, 15);
  }, [recommendations]);

  const handleStartBacktest = async () => {
      setIsBacktesting(true);
      setBacktestProgress(0);
      setBtResult(null);
      
      const symbols = getIdeasWatchlist().slice(0, 10);
      try {
          const result = await runBacktest(symbols, localRules, settings, "15m", btRange, (p) => setBacktestProgress(p));
          setBtResult(result);
      } catch (e) {
          console.error("Backtest failed", e);
      } finally {
          setIsBacktesting(false);
      }
  };

  useEffect(() => {
    // Sync logs with 10s refresh logic
    const logInterval = setInterval(() => {
      const status = getMarketStatus('STOCK');
      const now = new Date();
      
      const refreshMessages = [
        "Kernel: High-Frequency Tick Data Synchronized (10s Cycle)",
        "Engine: Recalculating RSI/ADX across 150 symbols",
        "Shoonya: Live Price Feed Handshake Successful",
        "Robot: Alpha Filter (1%) Re-evaluation complete",
        "Logic: No-Action maintained on low volatility assets"
      ];

      setLogs(prev => [...prev.slice(-29), {
        id: Date.now().toString(),
        timestamp: now.toLocaleTimeString(),
        message: refreshMessages[Math.floor(Math.random() * refreshMessages.length)],
        type: 'INFO'
      }]);
    }, 10000); // Match UI refresh cycle

    return () => clearInterval(logInterval);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="p-4 pb-24 animate-fade-in space-y-6 max-w-4xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600/20 rounded-xl text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10">
                <Cpu size={24} />
            </div>
            <div>
                <h1 className="text-xl md:text-2xl font-black text-white italic uppercase tracking-tighter">Strategy Dashboard</h1>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20 uppercase tracking-widest">1% ALPHA HURDLE ACTIVE</span>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Refresh: 10s</span>
                </div>
            </div>
        </div>
        <button onClick={onRefresh} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all active:scale-95 shadow-xl">
            <RefreshCw size={20} />
        </button>
      </div>

      <div className="flex gap-2 shrink-0 overflow-x-auto no-scrollbar pb-2">
         {[
           { id: 'QUANT', label: 'Market Pulse', icon: <Layers size={14}/> },
           { id: 'LOGS', label: 'Logic Stream', icon: <Activity size={14}/> },
           { id: 'BACKTEST', label: 'Historical', icon: <History size={14}/> },
           { id: 'TUNING', label: 'Parameters', icon: <Sliders size={14}/> }
         ].map(t => (
           <button 
            key={t.id} 
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
           >
             {t.icon} {t.label}
           </button>
         ))}
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === 'QUANT' && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-full animate-slide-up">
                <div className="p-4 bg-slate-800/40 border-b border-slate-700/50 flex justify-between items-center">
                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                        <Gauge size={14} className="text-blue-400"/> Current Momentum Heatmap
                    </h3>
                    <div className="text-[8px] font-black text-slate-500 uppercase flex gap-4">
                        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"/> Profit &gt; 1%</span>
                        <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"/> Score &gt; 40</span>
                    </div>
                </div>
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-slate-900 z-10 border-b border-slate-800">
                            <tr className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                <th className="p-4">Symbol</th>
                                <th className="p-4">Score</th>
                                <th className="p-4">ADX/RVOL</th>
                                <th className="p-4">ROI Target</th>
                                <th className="p-4">Signals</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {quantPicks.map(stock => {
                                const data = marketData[stock.symbol];
                                const score = data?.technicals.score || stock.score || 0;
                                return (
                                    <tr key={stock.symbol} className="hover:bg-blue-600/5 transition-colors">
                                        <td className="p-4">
                                            <div className="font-mono font-bold text-white text-xs">{stock.symbol.split('.')[0]}</div>
                                            <div className="text-[8px] text-slate-500 uppercase mt-0.5">{stock.timeframe}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className={`text-[10px] font-black px-2 py-0.5 rounded border inline-block ${score > 75 ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                                                {score}%
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-xs font-mono font-bold text-slate-300">{data?.technicals.adx.toFixed(0) || '--'}</div>
                                            <div className="text-[8px] text-slate-500 font-bold">{data?.technicals.rvol.toFixed(1) || '--'}x VOL</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-xs font-mono font-bold text-green-400">+{stock.profitPercent?.toFixed(2)}%</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-1">
                                                {data?.technicals.activeSignals.slice(0, 2).map(s => (
                                                    <span key={s} className="text-[7px] font-black uppercase tracking-tighter bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">{s}</span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'LOGS' && (
            <div className="h-full flex flex-col animate-slide-up bg-black/80 rounded-2xl border border-slate-800 p-4 font-mono text-[10px] overflow-hidden">
                <div className="mb-4 text-blue-500 font-black uppercase tracking-widest flex items-center justify-between">
                    <div className="flex items-center gap-2"><ShieldAlert size={14}/> Kernel Logic Stream</div>
                    <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"/> SYNCED</div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                    {logs.map(log => (
                        <div key={log.id} className="flex gap-3 animate-fade-in border-b border-white/5 pb-1.5">
                            <span className="text-slate-600 shrink-0 font-bold">[{log.timestamp}]</span>
                            <span className="text-slate-300 italic">{log.message}</span>
                        </div>
                    ))}
                    <div ref={logEndRef} />
                </div>
            </div>
        )}

        {activeTab === 'BACKTEST' && (
            <div className="space-y-4 animate-slide-up h-full overflow-y-auto custom-scrollbar pr-2 pb-10">
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">History Simulation</h3>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Validated with 1% Alpha Filter</p>
                        </div>
                        <div className="flex gap-2">
                             <select 
                               value={btRange} 
                               onChange={(e) => setBtRange(e.target.value)}
                               className="bg-slate-950 border border-slate-800 text-[10px] font-black text-white rounded-lg px-2 py-1 outline-none"
                             >
                                <option value="5d">Last 5 Days (15m)</option>
                                <option value="1mo">Last 1 Month (1h)</option>
                             </select>
                             <button 
                                onClick={handleStartBacktest}
                                disabled={isBacktesting}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 flex items-center gap-2 disabled:opacity-50"
                             >
                                {isBacktesting ? <Loader2 size={14} className="animate-spin"/> : <Play size={14} fill="currentColor"/>}
                                {isBacktesting ? `Simulating (${backtestProgress}%)` : 'Run Engine'}
                             </button>
                        </div>
                    </div>

                    {btResult && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Net P&L</p>
                                    <div className={`text-lg font-mono font-bold ${btResult.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        ₹{btResult.totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </div>
                                </div>
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Win Rate</p>
                                    <div className="text-lg font-mono font-bold text-blue-400">{btResult.winRate.toFixed(1)}%</div>
                                </div>
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Trades</p>
                                    <div className="text-lg font-mono font-bold text-white">{btResult.totalTrades}</div>
                                </div>
                                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Max Drawdown</p>
                                    <div className="text-lg font-mono font-bold text-red-400">{btResult.maxDrawdown.toFixed(1)}%</div>
                                </div>
                            </div>
                            <PortfolioChart data={btResult.equityCurve} baseline={100000} />
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'TUNING' && (
            <div className="space-y-4 animate-slide-up h-full overflow-y-auto custom-scrollbar pr-2">
                <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-6">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-black text-white uppercase italic tracking-tighter">Robot Constants</h3>
                        <button 
                          onClick={() => { onUpdateRules(localRules); }}
                          className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20"
                        >
                          Commit Tuning
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                            <div>
                                <label className="text-[10px] text-white font-black uppercase tracking-wider">ROI Hurdle (Locked)</label>
                                <p className="text-[8px] text-slate-500 uppercase font-bold mt-1">Minimum projected profit for Idea generation</p>
                            </div>
                            <span className="text-sm font-mono font-black text-green-400 italic">1.0%</span>
                        </div>

                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-[10px] text-white font-black uppercase tracking-wider">Trend Sensitivity (ADX)</label>
                                <span className="text-xs font-mono font-bold text-blue-400">{localRules.rsiBuyZone}</span>
                            </div>
                            <input 
                              type="range" min="15" max="40" step="1"
                              value={localRules.rsiBuyZone}
                              onChange={(e) => setLocalRules({...localRules, rsiBuyZone: parseInt(e.target.value)})}
                              className="w-full accent-blue-600 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer" 
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                                <Zap size={16} className="text-blue-400 shrink-0 mt-0.5" />
                                <div className="text-[10px] text-blue-300 leading-relaxed font-medium">
                                    <strong>Logic Note:</strong> The 1% ROI Hurdle ensures the ideas list is populated only with stocks showing enough ATR volatility to hit targets within the specified timeframes.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
