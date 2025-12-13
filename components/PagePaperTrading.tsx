
import React, { useState } from 'react';
import { PortfolioItem, MarketData, Funds, HoldingAnalysis, Transaction, AssetType } from '../types';
import { PortfolioTable } from './PortfolioTable';
import { ActivityFeed } from './ActivityFeed';
import { Wallet, PieChart, Sparkles, RefreshCw, Power, Globe, DollarSign, Cpu, BarChart2, TrendingUp, Coins, CheckCircle2 } from 'lucide-react';

interface PagePaperTradingProps {
  holdings: PortfolioItem[];
  marketData: MarketData;
  analysisData: Record<string, HoldingAnalysis>;
  onSell: (symbol: string, broker: any) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  funds: Funds;
  // Bot Props
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

  // Filter only Paper Holdings
  const paperHoldings = holdings.filter(h => h.broker === 'PAPER');
  
  // Aggregate Calculations
  const currentVal = paperHoldings.reduce((acc, h) => acc + ((marketData[h.symbol]?.price || h.avgCost) * h.quantity), 0);
  const totalCost = paperHoldings.reduce((acc, h) => acc + h.totalCost, 0);
  const totalPnl = currentVal - totalCost;
  const pnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  
  const availableCash = funds.stock + funds.mcx + funds.forex + funds.crypto;
  const totalAccountValue = availableCash + currentVal;

  const handleFundUpdate = () => {
      onUpdateFunds(tempFunds);
      setEditMode(false);
  };

  return (
    <div className="p-4 pb-20 animate-fade-in flex flex-col h-full">
       <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl text-indigo-400 border border-indigo-500/30"><Wallet size={24} /></div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">Paper Trading</h1>
                <p className="text-[10px] md:text-xs text-slate-400 font-medium">Virtual Portfolio & Bots</p>
              </div>
           </div>
           
           <div className="flex bg-slate-800/80 backdrop-blur-sm rounded-lg p-1 border border-slate-700">
               <button 
                  onClick={() => setActiveTab('PORTFOLIO')}
                  className={`px-3 py-1.5 rounded-md text-[10px] md:text-xs font-bold transition-all ${activeTab === 'PORTFOLIO' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}
               >
                  Portfolio
               </button>
               <button 
                  onClick={() => setActiveTab('AUTO_BOT')}
                  className={`px-3 py-1.5 rounded-md text-[10px] md:text-xs font-bold transition-all ${activeTab === 'AUTO_BOT' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'text-slate-400 hover:text-white'}`}
               >
                  Auto-Bot
               </button>
           </div>
       </div>

        {/* Summary Card */}
       <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-black rounded-2xl border border-indigo-500/30 p-5 md:p-6 shadow-2xl relative overflow-hidden mb-6 group">
            <div className="absolute -top-10 -right-10 opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-700 text-indigo-400"><PieChart size={180} /></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10 mb-4">
                <div>
                    <p className="text-indigo-300 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingUp size={12}/> Total P&L</p>
                    <div className={`text-2xl md:text-3xl font-mono font-bold tracking-tight break-words ${totalPnl >= 0 ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.3)]' : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.3)]'}`}>
                        {totalPnl >= 0 ? '+' : ''}₹{totalPnl.toLocaleString(undefined, {maximumFractionDigits: 0})}
                    </div>
                    <div className={`text-xs md:text-sm font-bold mt-1 px-2 py-0.5 rounded w-fit ${totalPnl >= 0 ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                        {pnlPercent.toFixed(2)}% Return
                    </div>
                </div>
                <div className="text-left sm:text-right">
                    <p className="text-indigo-300 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-1">Total Invested</p>
                    <div className="text-lg md:text-2xl font-mono font-bold text-white break-words">
                        ₹{totalCost.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                    </div>
                    <p className="text-[10px] md:text-xs text-slate-400 mt-2 font-medium">Cur. Value: <span className="text-white">₹{currentVal.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span></p>
                </div>
            </div>

            <div className="bg-black/30 backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                 <div className="flex items-center gap-2 text-indigo-200 text-[10px] md:text-xs font-bold"><Wallet size={14} className="text-indigo-400"/> Available Buying Power</div>
                 <div className="font-mono font-bold text-white text-base md:text-lg break-all">₹{availableCash.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>
            </div>
       </div>

       {/* Tab Content */}
       {activeTab === 'PORTFOLIO' ? (
           <div className="space-y-6 animate-slide-up">
                
                {/* Holdings Table */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm md:text-lg font-bold text-white flex items-center gap-2"><Sparkles size={16} className="text-yellow-400"/> Open Positions</h3>
                        <button 
                            onClick={onAnalyze} 
                            disabled={isAnalyzing}
                            className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
                        >
                            {isAnalyzing ? <RefreshCw className="animate-spin" size={14}/> : <Sparkles size={14}/>} 
                            AI Analyze
                        </button>
                    </div>
                    <PortfolioTable 
                        portfolio={paperHoldings} 
                        marketData={marketData} 
                        analysisData={analysisData} 
                        onSell={onSell} 
                        showAiInsights={false}
                        hideBroker={true}
                    />
                </div>
           </div>
       ) : (
           <div className="space-y-6 animate-slide-up">
               
               {/* CAPITAL MANAGER WIDGET */}
               <div className="bg-surface rounded-xl border border-slate-800 p-5 shadow-lg relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 via-blue-500 to-purple-500"></div>
                   <div className="flex justify-between items-center mb-4">
                       <h3 className="text-sm font-bold text-white flex items-center gap-2"><Coins size={16} className="text-yellow-400"/> Capital Manager</h3>
                       {!editMode ? (
                           <button onClick={() => { setTempFunds(funds); setEditMode(true); }} className="text-xs text-blue-400 font-bold hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">Modify Funds</button>
                       ) : (
                           <div className="flex gap-2">
                               <button onClick={() => setEditMode(false)} className="text-xs text-slate-400 font-bold hover:text-slate-300 px-3 py-1.5">Cancel</button>
                               <button onClick={handleFundUpdate} className="text-xs text-white bg-green-600 hover:bg-green-500 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 shadow-lg shadow-green-500/20"><CheckCircle2 size={12}/> Save Changes</button>
                           </div>
                       )}
                   </div>
                   
                   <div className="grid grid-cols-2 gap-3">
                       {/* Stock Fund */}
                       <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 relative group hover:border-blue-500/30 transition-colors">
                           <div className="flex items-center gap-2 text-xs text-slate-400 mb-1 font-bold uppercase">
                               <BarChart2 size={12} className="text-blue-400"/> Stocks
                           </div>
                           {editMode ? (
                               <input type="number" value={tempFunds.stock} onChange={e => setTempFunds({...tempFunds, stock: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm font-mono focus:border-blue-500 outline-none"/>
                           ) : (
                               <div className="text-sm font-bold text-white font-mono tracking-wide">₹{funds.stock.toLocaleString()}</div>
                           )}
                       </div>
                       
                       {/* Crypto Fund */}
                       <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 relative group hover:border-purple-500/30 transition-colors">
                           <div className="flex items-center gap-2 text-xs text-slate-400 mb-1 font-bold uppercase">
                               <Cpu size={12} className="text-purple-400"/> Crypto
                           </div>
                           {editMode ? (
                               <input type="number" value={tempFunds.crypto} onChange={e => setTempFunds({...tempFunds, crypto: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm font-mono focus:border-purple-500 outline-none"/>
                           ) : (
                               <div className="text-sm font-bold text-white font-mono tracking-wide">₹{funds.crypto.toLocaleString()}</div>
                           )}
                       </div>

                       {/* MCX Fund */}
                       <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 relative group hover:border-yellow-500/30 transition-colors">
                           <div className="flex items-center gap-2 text-xs text-slate-400 mb-1 font-bold uppercase">
                               <Globe size={12} className="text-yellow-400"/> MCX
                           </div>
                           {editMode ? (
                               <input type="number" value={tempFunds.mcx} onChange={e => setTempFunds({...tempFunds, mcx: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm font-mono focus:border-yellow-500 outline-none"/>
                           ) : (
                               <div className="text-sm font-bold text-white font-mono tracking-wide">₹{funds.mcx.toLocaleString()}</div>
                           )}
                       </div>

                       {/* Forex Fund */}
                       <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 relative group hover:border-green-500/30 transition-colors">
                           <div className="flex items-center gap-2 text-xs text-slate-400 mb-1 font-bold uppercase">
                               <DollarSign size={12} className="text-green-400"/> Forex
                           </div>
                           {editMode ? (
                               <input type="number" value={tempFunds.forex} onChange={e => setTempFunds({...tempFunds, forex: parseFloat(e.target.value)})} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm font-mono focus:border-green-500 outline-none"/>
                           ) : (
                               <div className="text-sm font-bold text-white font-mono tracking-wide">₹{funds.forex.toLocaleString()}</div>
                           )}
                       </div>
                   </div>
                   <p className="text-[10px] text-slate-500 mt-3 flex items-center gap-1 italic">
                       <Sparkles size={10} className="text-yellow-500"/> Tip: Allocate funds before starting the bot.
                   </p>
               </div>

               {/* Bot Controls */}
               <div className="grid grid-cols-1 gap-4">
                  {Object.entries(activeBots).map(([broker, isActive]) => (
                    <div key={broker} className={`relative p-5 rounded-xl border transition-all duration-300 ${isActive ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-green-500/50 shadow-lg shadow-green-900/20' : 'bg-slate-900/50 border-slate-800'}`}>
                        {isActive && <div className="absolute inset-0 bg-green-500/5 rounded-xl animate-pulse"></div>}
                        
                        <div className="flex justify-between items-center mb-2 relative z-10">
                            <div>
                                <h3 className="font-bold text-white text-lg">{broker} Trading Bot</h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    Strategy: <span className="text-blue-400">High Momentum Top 5</span>
                                </p>
                            </div>
                            <button 
                              onClick={() => onToggleBot(broker)}
                              className={`p-3 rounded-xl transition-all shadow-lg ${isActive ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-500/30' : 'bg-slate-700 hover:bg-slate-600 text-slate-400'}`}
                            >
                              <Power size={22} className={isActive ? 'drop-shadow-md' : ''} />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 mb-4 relative z-10">
                            <div className={`w-2.5 h-2.5 rounded-full shadow-sm ${isActive ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-slate-600'}`}></div>
                            <span className={`text-xs font-mono font-bold tracking-wider ${isActive ? 'text-green-400' : 'text-slate-500'}`}>
                                {isActive ? 'ACTIVE & SCANNING' : 'STOPPED'}
                            </span>
                        </div>
                        
                        {/* Strategy Chips */}
                        <div className="flex flex-wrap gap-2 relative z-10">
                             <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 shadow-sm">Slice Entries (25%)</span>
                             <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 shadow-sm">Best 5 Scoring</span>
                             <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 shadow-sm">Smart Allocation</span>
                        </div>
                    </div>
                  ))}
               </div>
               
               {/* Activity Log */}
               <div>
                   <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-blue-400"/> Execution Log</h3>
                   <ActivityFeed transactions={transactions} />
               </div>
           </div>
       )}
    </div>
  );
};
