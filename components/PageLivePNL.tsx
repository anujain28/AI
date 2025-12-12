
import React from 'react';
import { PortfolioItem, MarketData, HoldingAnalysis } from '../types';
import { PortfolioTable } from './PortfolioTable';
import { Activity, Building2, Wallet, PieChart, TrendingUp, Sparkles } from 'lucide-react';

interface PageLivePNLProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  holdings: PortfolioItem[];
  marketData: MarketData;
  analysisData: Record<string, HoldingAnalysis>;
  onSell: (symbol: string, broker: any) => void;
  brokerBalances: Record<string, number>;
}

export const PageLivePNL: React.FC<PageLivePNLProps> = ({ 
  title, subtitle, icon: Icon, holdings, marketData, analysisData, onSell, brokerBalances
}) => {
  
  // Filter Live Holdings (Not Paper)
  const liveHoldings = holdings.filter(h => h.broker !== 'PAPER');
  
  const currentVal = liveHoldings.reduce((acc, h) => acc + ((marketData[h.symbol]?.price || h.avgCost) * h.quantity), 0);
  const totalCost = liveHoldings.reduce((acc, h) => acc + h.totalCost, 0);
  const totalPnl = currentVal - totalCost;
  const pnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  
  const totalCash = (Object.values(brokerBalances) as number[]).reduce((a, b) => a + Number(b), 0);

  return (
    <div className="p-4 pb-20 animate-fade-in space-y-6">
       <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-blue-600/20 rounded-xl text-blue-400 border border-blue-600/30"><Icon size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
            <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
          </div>
       </div>

        {/* Live Summary Card */}
       <div className="bg-gradient-to-br from-blue-900/40 via-slate-900 to-black rounded-2xl border border-blue-500/20 p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-8 -top-8 opacity-10 text-blue-400 group-hover:rotate-12 transition-transform duration-700"><PieChart size={180}/></div>
            
            <div className="grid grid-cols-2 gap-8 mb-4 relative z-10">
                <div>
                    <p className="text-blue-300 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingUp size={12}/> Total P&L</p>
                    <div className={`text-3xl font-mono font-bold tracking-tight ${totalPnl >= 0 ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.3)]' : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.3)]'}`}>
                        {totalPnl >= 0 ? '+' : ''}₹{totalPnl.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </div>
                    <div className={`text-sm font-bold mt-1 px-2 py-0.5 rounded w-fit ${totalPnl >= 0 ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                        {pnlPercent.toFixed(2)}% Return
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-blue-300 text-xs font-bold uppercase tracking-wider mb-1">Total Invested</p>
                    <div className="text-2xl font-mono font-bold text-white">
                        ₹{totalCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </div>
                    <p className="text-xs text-slate-400 mt-2 font-medium">Value: <span className="text-white">₹{currentVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span></p>
                </div>
            </div>
            
            <div className="bg-black/30 backdrop-blur-md p-3 rounded-xl border border-white/10 flex justify-between items-center">
                 <div className="flex items-center gap-2 text-blue-200 text-xs font-bold"><Wallet size={14} className="text-blue-400"/> Total Broker Cash</div>
                 <div className="font-mono font-bold text-white text-lg">₹{totalCash.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
       </div>
       
       {/* Broker Breakdown (Mini Cards) */}
       {Object.keys(brokerBalances).length > 0 && (
        <div className="grid grid-cols-2 gap-3">
            {Object.entries(brokerBalances).map(([broker, balance]) => (
                <div key={broker} className="p-3 bg-surface rounded-xl border border-slate-700 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full blur-xl pointer-events-none"></div>
                    <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-300 uppercase tracking-wide">
                        <Building2 size={12} className="text-blue-500"/> {broker}
                    </div>
                    <div className="text-sm font-mono text-white font-bold">₹{Number(balance).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                </div>
            ))}
        </div>
       )}

       {/* Holdings List */}
       <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Sparkles size={16} className="text-yellow-400"/> Live Holdings ({liveHoldings.length})</h3>
            <PortfolioTable 
                portfolio={liveHoldings} 
                marketData={marketData} 
                analysisData={analysisData} 
                onSell={onSell} 
            />
       </div>
    </div>
  );
};
