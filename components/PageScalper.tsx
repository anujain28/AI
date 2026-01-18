
import React, { useState, useEffect, useMemo } from 'react';
import { StockRecommendation, MarketData, Funds, PortfolioItem, BrokerID } from '../types';
import { Zap, TrendingUp, TrendingDown, Target, Shield, Loader2, List, Trash2, ArrowRight } from 'lucide-react';

interface PageScalperProps {
  recommendations: StockRecommendation[];
  marketData: MarketData;
  funds: Funds;
  holdings: PortfolioItem[];
  onBuy: (symbol: string, quantity: number, price: number, broker: BrokerID) => Promise<void>;
  onSell: (symbol: string, quantity: number, price: number, broker: BrokerID) => Promise<void>;
  onRefresh: () => void;
}

export const PageScalper: React.FC<PageScalperProps> = ({
  recommendations,
  marketData,
  funds,
  holdings,
  onBuy,
  onSell,
  onRefresh
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [qtyPercent, setQtyPercent] = useState<number>(10);
  const [isExecuting, setIsExecuting] = useState(false);
  const [sliceProgress, setSliceProgress] = useState<{current: number, total: number} | null>(null);

  const activePicks = useMemo(() => recommendations.filter(r => r.isTopPick).slice(0, 10), [recommendations]);
  
  const currentStock = useMemo(() => 
    recommendations.find(r => r.symbol === selectedSymbol), 
    [selectedSymbol, recommendations]
  );

  const price = marketData[selectedSymbol]?.price || currentStock?.currentPrice || 0;
  const holding = holdings.find(h => h.symbol === selectedSymbol && h.broker === 'PAPER');

  const calculatedQty = useMemo(() => {
    if (!price) return 0;
    const budget = funds.stock * (qtyPercent / 100);
    return Math.floor(budget / price);
  }, [price, funds.stock, qtyPercent]);

  const handleAction = async (type: 'BUY' | 'SELL') => {
    if (!selectedSymbol || isExecuting) return;
    setIsExecuting(true);
    
    // Simulate Slicing UI Feedback
    const slices = calculatedQty > 100 ? 5 : 1;
    for(let i = 1; i <= slices; i++) {
        setSliceProgress({ current: i, total: slices });
        await new Promise(r => setTimeout(r, 400));
    }

    try {
        if (type === 'BUY') {
            await onBuy(selectedSymbol, calculatedQty, price, 'PAPER');
        } else {
            const sellQty = holding ? holding.quantity : calculatedQty;
            await onSell(selectedSymbol, sellQty, price, 'PAPER');
        }
    } finally {
        setIsExecuting(false);
        setSliceProgress(null);
    }
  };

  return (
    <div className="p-4 pb-24 animate-fade-in max-w-lg mx-auto md:max-w-none h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-600/20 rounded-xl text-red-500 border border-red-500/30">
            <Zap size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">Live Scalper</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">High-Frequency Execution Terminal</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Sidebar: Watchlist */}
        <div className="lg:col-span-1 flex flex-col gap-3 overflow-y-auto no-scrollbar max-h-[40vh] lg:max-h-full">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                <List size={14}/> Alpha Hotlist
            </div>
            {activePicks.map(stock => {
                const data = marketData[stock.symbol];
                const isSelected = selectedSymbol === stock.symbol;
                return (
                    <button 
                        key={stock.symbol}
                        onClick={() => setSelectedSymbol(stock.symbol)}
                        className={`p-3 rounded-xl border flex justify-between items-center transition-all ${isSelected ? 'bg-blue-600 border-blue-400 shadow-lg' : 'bg-slate-900 border-slate-800'}`}
                    >
                        <div className="text-left">
                            <div className="text-xs font-black text-white uppercase">{stock.symbol.split('.')[0]}</div>
                            <div className="text-[9px] text-slate-400 font-bold">{stock.reason}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-mono font-bold text-white">₹{data?.price.toFixed(2) || stock.currentPrice}</div>
                            <div className={`text-[9px] font-bold ${data?.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {data?.changePercent.toFixed(2)}%
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>

        {/* Center: Trading Terminal */}
        <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5"><Zap size={100}/></div>
                
                {selectedSymbol ? (
                    <div className="relative z-10 animate-slide-up">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-3xl font-black text-white italic tracking-tighter">{selectedSymbol.split('.')[0]}</h2>
                                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">NSE Live Feed</p>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-mono font-black text-white tracking-tighter">₹{price.toFixed(2)}</div>
                                <div className={`text-xs font-bold mt-1 ${marketData[selectedSymbol]?.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {marketData[selectedSymbol]?.changePercent.toFixed(2)}%
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 mb-6">
                            {[10, 25, 50, 100].map(p => (
                                <button 
                                    key={p}
                                    onClick={() => setQtyPercent(p)}
                                    className={`py-3 rounded-xl text-[10px] font-black border transition-all ${qtyPercent === p ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                                >
                                    {p}% CAP
                                </button>
                            ))}
                        </div>

                        <div className="bg-black/40 border border-slate-800 p-4 rounded-2xl flex justify-between items-center mb-6">
                            <div>
                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Calculated Qty</div>
                                <div className="text-xl font-mono font-bold text-white">{calculatedQty}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Exposure</div>
                                <div className="text-xl font-mono font-bold text-white">₹{(calculatedQty * price).toLocaleString()}</div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => handleAction('BUY')}
                                disabled={isExecuting}
                                className="flex-1 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black italic tracking-tighter shadow-xl shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isExecuting ? 'SLICING BUY...' : 'FAST BUY'}
                            </button>
                            <button 
                                onClick={() => handleAction('SELL')}
                                disabled={isExecuting || !holding}
                                className="flex-1 py-5 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black italic tracking-tighter shadow-xl shadow-red-500/20 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isExecuting ? 'SLICING SELL...' : 'FAST SELL'}
                            </button>
                        </div>

                        {sliceProgress && (
                            <div className="mt-4 animate-fade-in">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Iceberg Slicing in Progress...</span>
                                    <span className="text-[9px] font-mono text-white">{sliceProgress.current}/{sliceProgress.total}</span>
                                </div>
                                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-500 transition-all duration-300" 
                                        style={{ width: `${(sliceProgress.current / sliceProgress.total) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-600">
                        <ArrowRight size={48} className="mb-4 opacity-20 animate-pulse"/>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Select an Alpha Pick to Start Scalping</p>
                    </div>
                )}
            </div>

            {/* Position Summary */}
            {holding && (
                <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-3xl p-6 flex justify-between items-center animate-slide-up">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg">
                            <Shield size={20}/>
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Active Position</div>
                            <div className="text-xl font-black text-white uppercase italic">{holding.symbol.split('.')[0]}</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Current P&L</div>
                        <div className={`text-2xl font-mono font-bold ${price >= holding.avgCost ? 'text-green-400' : 'text-red-400'}`}>
                            {price >= holding.avgCost ? '+' : ''}₹{((price - holding.avgCost) * holding.quantity).toFixed(0)}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
