import React, { useState } from 'react';
import { PortfolioItem, MarketData, Funds, HoldingAnalysis, Transaction, AssetType } from '../types';
import { PortfolioTable } from './PortfolioTable';
import { ActivityFeed } from './ActivityFeed';
import { Wallet, PieChart, Sparkles, RefreshCw, Power, Globe, DollarSign, Cpu, BarChart2 } from 'lucide-react';

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
}

export const PagePaperTrading: React.FC<PagePaperTradingProps> = ({ 
  holdings, marketData, analysisData, onSell, onAnalyze, isAnalyzing, funds,
  activeBots, onToggleBot, transactions
}) => {
  
  const [activeTab, setActiveTab] = useState<'PORTFOLIO' | 'AUTO_BOT'>('PORTFOLIO');

  // Filter only Paper Holdings
  const paperHoldings = holdings.filter(h => h.broker === 'PAPER');
  
  // Aggregate Calculations
  const currentVal = paperHoldings.reduce((acc, h) => acc + ((marketData[h.symbol]?.price || h.avgCost) * h.quantity), 0);
  const totalCost = paperHoldings.reduce((acc, h) => acc + h.totalCost, 0);
  const totalPnl = currentVal - totalCost;
  const pnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  
  const availableCash = funds.stock + funds.mcx + funds.forex + funds.crypto;

  // Breakdown Calculation
  const getAssetStats = (type: AssetType) => {
      const items = paperHoldings.filter(h => h.type === type);
      const invested = items.reduce((acc, h) => acc + h.totalCost, 0);
      const current = items.reduce((acc, h) => acc + ((marketData[h.symbol]?.price || h.avgCost) * h.quantity), 0);
      const pnl = current - invested;
      const pct = invested > 0 ? (pnl / invested) * 100 : 0;
      return { invested, current, pnl, pct };
  };

  const assetTypes: {type: AssetType, label: string, icon: React.ReactNode}[] = [
      { type: 'STOCK', label: 'Stocks', icon: <BarChart2 size={16} className="text-blue-400"/> },
      { type: 'CRYPTO', label: 'Crypto', icon: <Cpu size={16} className="text-purple-400"/> },
      { type: 'MCX', label: 'Commodities', icon: <Globe size={16} className="text-yellow-400"/> },
      { type: 'FOREX', label: 'Forex', icon: <DollarSign size={16} className="text-green-400"/> },
  ];

  return (
    <div className="p-4 pb-20 animate-fade-in flex flex-col h-full">
       <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-600/20 rounded-xl text-indigo-400"><Wallet size={24} /></div>
              <div>
                <h1 className="text-2xl font-bold text-white">Live Paper</h1>
                <p className="text-xs text-slate-400">Virtual Portfolio & Bots</p>
              </div>
           </div>
           
           <div className="flex bg-slate-800 rounded-lg p-1">
               <button 
                  onClick={() => setActiveTab('PORTFOLIO')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'PORTFOLIO' ? 'bg-slate-700 text-white shadow' : 'text-slate-500'}`}
               >
                  Portfolio
               </button>
               <button 
                  onClick={() => setActiveTab('AUTO_BOT')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'AUTO_BOT' ? 'bg-blue-600 text-white shadow' : 'text-slate-500'}`}
               >
                  Auto-Bot
               </button>
           </div>
       </div>

        {/* Updated Summary Card matching 'My Stocks' style */}
       <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-6 shadow-xl relative overflow-hidden mb-6">
            <div className="absolute top-0 right-0 p-6 opacity-5"><PieChart size={120}/></div>
            
            <div className="grid grid-cols-2 gap-8 relative z-10 mb-4">
                <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total P&L</p>
                    <div className={`text-3xl font-mono font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {totalPnl >= 0 ? '+' : ''}₹{totalPnl.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </div>
                    <div className={`text-sm font-bold mt-1 ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {pnlPercent.toFixed(2)}% Return
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Invested</p>
                    <div className="text-2xl font-mono font-bold text-white">
                        ₹{totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Current Value: ₹{currentVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
            </div>

            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                 <div className="flex items-center gap-2 text-slate-400 text-xs"><Wallet size={14}/> Available Cash</div>
                 <div className="font-mono font-bold text-white">₹{availableCash.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
       </div>

       {/* Tab Content */}
       {activeTab === 'PORTFOLIO' ? (
           <div className="space-y-6 animate-slide-up">
                
                {/* Detailed Asset Performance Table */}
                <div className="bg-surface rounded-xl border border-slate-800 overflow-hidden shadow-lg">
                    <div className="px-5 py-3 border-b border-slate-700/50 bg-slate-800/30 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Asset Performance</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs text-slate-500 bg-slate-900/50">
                                <tr>
                                    <th className="px-5 py-3 font-medium">Asset Class</th>
                                    <th className="px-5 py-3 font-medium text-right">Total Invested</th>
                                    <th className="px-5 py-3 font-medium text-right">Total Profit</th>
                                    <th className="px-5 py-3 font-medium text-right">% Return</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {assetTypes.map((asset) => {
                                    const stats = getAssetStats(asset.type);
                                    const isProfit = stats.pnl >= 0;
                                    return (
                                        <tr key={asset.type} className="hover:bg-slate-800/20 transition-colors">
                                            <td className="px-5 py-3 font-medium text-white flex items-center gap-2">
                                                <div className="p-1.5 rounded bg-slate-800/80 border border-slate-700">{asset.icon}</div>
                                                {asset.label}
                                            </td>
                                            <td className="px-5 py-3 text-right text-slate-300 font-mono">₹{stats.invested.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                            <td className={`px-5 py-3 text-right font-mono font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                                                {isProfit ? '+' : ''}{stats.pnl.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <span className={`text-[10px] px-2 py-0.5 rounded border ${isProfit ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                    {stats.pct.toFixed(2)}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Holdings Table */}
                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-bold text-white">Open Positions</h3>
                        <button 
                            onClick={onAnalyze} 
                            disabled={isAnalyzing}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 border border-slate-700"
                        >
                            {isAnalyzing ? <RefreshCw className="animate-spin" size={14}/> : <Sparkles size={14}/>} 
                            Analyze
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
               {/* Bot Controls */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(activeBots).map(([broker, isActive]) => (
                    <div key={broker} className={`relative p-4 rounded-xl border transition-all ${isActive ? 'bg-surface border-blue-500/50 shadow-lg shadow-blue-500/10' : 'bg-slate-900/50 border-slate-800'}`}>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-white">{broker} Bot</h3>
                            <button 
                              onClick={() => onToggleBot(broker)}
                              className={`p-2 rounded-full transition-colors ${isActive ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'}`}
                            >
                              <Power size={18} />
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`}></div>
                            <span className={`text-xs font-mono ${isActive ? 'text-green-400' : 'text-slate-500'}`}>
                                {isActive ? 'RUNNING' : 'STOPPED'}
                            </span>
                        </div>
                    </div>
                  ))}
               </div>
               
               {/* Activity Log */}
               <div>
                   <h3 className="text-lg font-bold text-white mb-4">Execution Log</h3>
                   <ActivityFeed transactions={transactions} />
               </div>
           </div>
       )}
    </div>
  );
};