import React from 'react';
import { PortfolioItem, MarketData, HoldingAnalysis } from '../types';
import { PortfolioTable } from './PortfolioTable';
import { Activity, Building2, Wallet } from 'lucide-react';

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
  
  // Filter Live Holdings (Not Paper) - This component now expects pre-filtered lists ideally, 
  // but we keep this check just in case mixed data is passed.
  const liveHoldings = holdings.filter(h => h.broker !== 'PAPER');
  
  const currentVal = liveHoldings.reduce((acc, h) => acc + ((marketData[h.symbol]?.price || h.avgCost) * h.quantity), 0);
  const totalCost = liveHoldings.reduce((acc, h) => acc + h.totalCost, 0);
  const totalPnl = currentVal - totalCost;
  const pnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  
  const totalCash = (Object.values(brokerBalances) as number[]).reduce((a, b) => a + Number(b), 0);

  return (
    <div className="p-4 pb-20 animate-fade-in space-y-6">
       <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-blue-600/20 rounded-xl text-blue-400"><Icon size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
       </div>

        {/* Live Summary Card */}
       <div className="bg-surface rounded-2xl border border-slate-700 p-6 shadow-xl">
            <div className="grid grid-cols-2 gap-8 mb-4">
                <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total P&L</p>
                    <div className={`text-3xl font-mono font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {totalPnl >= 0 ? '+' : ''}₹{Math.round(totalPnl || 0).toLocaleString()}
                    </div>
                    <div className={`text-sm font-bold mt-1 ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {pnlPercent.toFixed(2)}% Return
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Invested</p>
                    <div className="text-2xl font-mono font-bold text-white">
                        ₹{Math.round(totalCost || 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Value: ₹{Math.round(currentVal || 0).toLocaleString()}</p>
                </div>
            </div>
            
            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                 <div className="flex items-center gap-2 text-slate-400 text-xs"><Wallet size={14}/> Total Broker Cash</div>
                 <div className="font-mono font-bold text-white">₹{Math.round(totalCash || 0).toLocaleString()}</div>
            </div>
       </div>
       
       {/* Broker Breakdown (Mini Cards) */}
       {Object.keys(brokerBalances).length > 0 && (
        <div className="grid grid-cols-2 gap-3">
            {Object.entries(brokerBalances).map(([broker, balance]) => (
                <div key={broker} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="flex items-center gap-2 mb-1 text-xs font-bold text-slate-300">
                        <Building2 size={12}/> {broker}
                    </div>
                    <div className="text-sm font-mono text-white">₹{Math.round(Number(balance)).toLocaleString()}</div>
                </div>
            ))}
        </div>
       )}

       {/* Holdings List */}
       <div>
            <h3 className="text-lg font-bold text-white mb-4">Holdings ({liveHoldings.length})</h3>
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