
import React, { useState } from 'react';
import { PortfolioItem, MarketData, Funds, HoldingAnalysis, Transaction } from '../types';
import { PortfolioTable } from './PortfolioTable';
import { ActivityFeed } from './ActivityFeed';
import { Wallet, PieChart, Sparkles, RefreshCw, Power, BarChart2, TrendingUp, Coins, AlertCircle, Clock, Zap } from 'lucide-react';
import { getMarketStatus } from '../services/marketStatusService';

interface PagePaperTradingProps {
  holdings: PortfolioItem[];
  marketData: MarketData;
  analysisData: Record<string, HoldingAnalysis>;
  onSell: (symbol: string, broker: any) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  funds: Funds;
  activeBots: Record<string, boolean>;
  onToggleBot: (broker: string) => void;
  transactions: Transaction[];
  onUpdateFunds: (newFunds: Funds) => void;
}

export const PagePaperTrading: React.FC<PagePaperTradingProps> = ({ 
  holdings, marketData, analysisData, onSell, onAnalyze, isAnalyzing, funds,
  activeBots, onToggleBot, transactions, onUpdateFunds
}) => {
  
  const [activeTab, setActiveTab] = useState<'PORTFOLIO' | 'AUTO_BOT'>('PORTFOLIO');
  const [editMode, setEditMode] = useState(false);
  const [tempFunds, setTempFunds] = useState<Funds>(funds);

  const marketStatus = getMarketStatus('STOCK');
  const paperHoldings = holdings.filter(h => h.broker === 'PAPER');
  
  const currentVal = paperHoldings.reduce((acc, h) => acc + ((marketData[h.symbol]?.price || h.avgCost) * h.quantity), 0);
  const totalCost = paperHoldings.reduce((acc, h) => acc + h.totalCost, 0);
  const totalPnl = currentVal - totalCost;
  const pnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  
  const availableCash = funds.stock;
  const totalAccountValue = availableCash + currentVal;

  const handleFundUpdate = () => {
      onUpdateFunds(tempFunds);
      setEditMode(false);
  };

  return (
    <div className="p-4 pb-24 animate-fade-in flex flex-col h-full">
       <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl text-indigo-400 border border-indigo-500/30"><Wallet size={24} /></div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Paper Trading</h1>
                <p className="text-[10px] md:text-xs text-slate-400 font-medium">Virtual Portfolio & Real-time P&L</p>
              </div>
           </div>
           
           <div className="flex bg-slate-800/80 backdrop-blur-sm rounded-lg p-1 border border-slate-700">
               <button onClick={() => setActiveTab('PORTFOLIO')} className={`px-3 py-1.5 rounded-md text-[10px] md:text-xs font-bold transition-all ${activeTab === 'PORTFOLIO' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}>Portfolio</button>
               <button onClick={() => setActiveTab('AUTO_BOT')} className={`px-3 py-1.5 rounded-md text-[10px] md:text-xs font-bold transition-all ${activeTab === 'AUTO_BOT' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-white'}`}>Auto-Bot</button>
           </div>
       </div>

       {/* Market Closed Warning Overlay for Auto-Bot */}
       {activeTab === 'AUTO_BOT' && !marketStatus.isOpen && (
           <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3 animate-fade-in">
                <Clock className="text-amber-500 shrink-0" size={18} />
                <div className="flex-1">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none">Market Currently Closed</p>
                    <p className="text-[9px] text-amber-500/70 font-bold mt-1 uppercase">Auto-Trading is paused until 09:15 IST.</p>
                </div>
           </div>
       )}

       <div className={`bg-gradient-to-br from-indigo-950 via-slate-900 to-black rounded-2xl border ${totalPnl >= 0 ? 'border-green-500/30' : 'border-red-500/30'} p-5 md:p-6 shadow-2xl relative overflow-hidden mb-6 group transition-colors duration-500`}>
            <div className="absolute -top-10 -right-10 opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-700 text-indigo-400"><PieChart size={180} /></div>
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${totalPnl >= 0 ? 'from-green-500 via-emerald-500 to-blue-500' : 'from-red-500 via-orange-500 to-pink-500'}`}></div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10 mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <p className="text-indigo-300 text-[10px] md:text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                            <TrendingUp size={12}/> Total Real-Time P&L
                        </p>
                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${totalPnl >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    </div>
                    <div className={`text-2xl md:text-4xl font-mono font-black tracking-tight break-words ${totalPnl >= 0 ? 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.4)]' : 'text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.4)]'}`}>
                        {totalPnl >= 0 ? '+' : ''}₹{totalPnl.toLocaleString(undefined, {maximumFractionDigits: 2})}
                    </div>
                    <div className={`text-xs md:text-sm font-bold mt-2 px-2 py-0.5 rounded-full w-fit ${totalPnl >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        {pnlPercent.toFixed(2)}% ROI
                    </div>
                </div>
                <div className="text-left sm:text-right flex flex-col justify-end">
                    <p className="text-indigo-300 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">Total Account Equity</p>
                    <div className="text-xl md:text-2xl font-mono font-black text-white break-words">₹{totalAccountValue.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                    <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1 justify-start sm:justify-end">
                        <Zap size={10} className="text-yellow-500" />
                        Live calculation active
                    </div>
                </div>
            </div>

            <div className="bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                 <div className="flex items-center gap-2 text-indigo-200 text-[10px] md:text-xs font-bold"><Wallet size={14} className="text-indigo-400"/> Cash Liquidity</div>
                 <div className="font-mono font-bold text-white text-base md:text-lg break-all">₹{availableCash.toLocaleString()}</div>
            </div>
       </div>

       {activeTab === 'PORTFOLIO' ? (
           <div className="space-y-6 animate-slide-up flex-1 flex flex-col min-h-0">
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-3 shrink-0">
                        <h3 className="text-sm md:text-lg font-bold text-white flex items-center gap-2"><Sparkles size={16} className="text-yellow-400"/> Active Holdings</h3>
                        <button onClick={onAnalyze} disabled={isAnalyzing} className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20">{isAnalyzing ? <RefreshCw className="animate-spin" size={14}/> : <Sparkles size={14}/>} AI Insights</button>
                    </div>
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <PortfolioTable portfolio={paperHoldings} marketData={marketData} analysisData={analysisData} onSell={onSell} showAiInsights={false} hideBroker={true} />
                    </div>
                </div>
           </div>
       ) : (
           <div className="space-y-6 animate-slide-up">
               <div className="bg-surface rounded-xl border border-slate-800 p-5 shadow-lg relative overflow-hidden">
                   <div className="flex justify-between items-center mb-4">
                       <h3 className="text-sm font-bold text-white flex items-center gap-2"><Coins size={16} className="text-yellow-400"/> Capital Manager</h3>
                       {!editMode ? (
                           <button onClick={() => { setTempFunds(funds); setEditMode(true); }} className="text-xs text-blue-400 font-bold hover:text-blue-300">Edit Funds</button>
                       ) : (
                           <button onClick={handleFundUpdate} className="text-xs text-white bg-green-600 px-3 py-1.5 rounded-lg font-bold">Save</button>
                       )}
                   </div>
                   
                   <div className="grid grid-cols-1 gap-3">
                       <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                           <div className="flex items-center gap-2 text-xs text-slate-400 mb-1 font-bold uppercase"><BarChart2 size={12} className="text-blue-400"/> Stock Funds</div>
                           {editMode ? (
                               <input type="number" value={tempFunds.stock} onChange={e => setTempFunds({...tempFunds, stock: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm font-mono"/>
                           ) : (
                               <div className="text-sm font-bold text-white font-mono tracking-wide">₹{funds.stock.toLocaleString()}</div>
                           )}
                       </div>
                   </div>
               </div>

               <div className="grid grid-cols-1 gap-4">
                  {Object.entries(activeBots).map(([broker, isActive]) => (
                    <div key={broker} className={`relative p-5 rounded-xl border transition-all duration-300 ${isActive ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-green-500/50 shadow-lg shadow-green-900/20' : 'bg-slate-900/50 border-slate-800'}`}>
                        <div className="flex justify-between items-center mb-2 relative z-10">
                            <div>
                                <h3 className="font-bold text-white text-lg">{broker} Trading Bot</h3>
                                <p className="text-xs text-slate-500 font-medium">Strategy: Momentum Breakout</p>
                            </div>
                            <button onClick={() => onToggleBot(broker)} className={`p-3 rounded-xl transition-all shadow-lg ${isActive ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                              <Power size={22} />
                            </button>
                        </div>
                        {isActive && !marketStatus.isOpen && (
                            <div className="mt-3 flex items-center gap-2 text-amber-500/80 animate-pulse">
                                <AlertCircle size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Bot Active but On Standby (Market Closed)</span>
                            </div>
                        )}
                    </div>
                  ))}
               </div>
               
               <div>
                   <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-blue-400"/> Execution Log</h3>
                   <ActivityFeed transactions={transactions} />
               </div>
           </div>
       )}
    </div>
  );
};
