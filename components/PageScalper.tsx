
import React, { useState, useEffect, useMemo } from 'react';
import { StockRecommendation, MarketData, Funds, PortfolioItem, BrokerID, Candle } from '../types';
import { Zap, TrendingUp, TrendingDown, Target, Shield, Loader2, List, Activity, Power, BarChart, LineChart as LucideLineChart, BrainCircuit } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface PageScalperProps {
  recommendations: StockRecommendation[];
  marketData: MarketData;
  funds: Funds;
  holdings: PortfolioItem[];
  onBuy: (symbol: string, quantity: number, price: number, broker: BrokerID) => Promise<void>;
  onSell: (symbol: string, quantity: number, price: number, broker: BrokerID) => Promise<void>;
  onRefresh: () => void;
  isAutoMode: boolean;
  onToggleAutoMode: (val: boolean) => void;
}

export const PageScalper: React.FC<PageScalperProps> = ({
  recommendations,
  marketData,
  funds,
  holdings,
  onBuy,
  onSell,
  onRefresh,
  isAutoMode,
  onToggleAutoMode
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [qtyPercent, setQtyPercent] = useState<number>(20);
  const [isExecuting, setIsExecuting] = useState(false);

  const activePicks = useMemo(() => recommendations.slice(0, 10), [recommendations]);
  
  const currentStock = useMemo(() => 
    recommendations.find(r => r.symbol === selectedSymbol), 
    [selectedSymbol, recommendations]
  );

  const stockData = marketData[selectedSymbol];
  const price = stockData?.price || currentStock?.currentPrice || 0;
  const history = stockData?.history || [];
  const holding = holdings.find(h => h.symbol === selectedSymbol && h.broker === 'PAPER');

  useEffect(() => {
    if (!selectedSymbol && activePicks.length > 0) {
        setSelectedSymbol(activePicks[0].symbol);
    }
  }, [activePicks, selectedSymbol]);

  const calculatedQty = useMemo(() => {
    if (!price) return 0;
    const budget = funds.stock * (qtyPercent / 100);
    return Math.floor(budget / price);
  }, [price, funds.stock, qtyPercent]);

  const handleAction = async (type: 'BUY' | 'SELL') => {
    if (!selectedSymbol || isExecuting) return;
    setIsExecuting(true);
    try {
        if (type === 'BUY') {
            await onBuy(selectedSymbol, calculatedQty, price, 'PAPER');
        } else {
            const sellQty = holding ? holding.quantity : calculatedQty;
            await onSell(selectedSymbol, sellQty, price, 'PAPER');
        }
    } finally {
        setIsExecuting(false);
    }
  };

  return (
    <div className="p-4 pb-24 animate-fade-in max-w-lg mx-auto md:max-w-none h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-600/20 rounded-xl text-red-500 border border-red-500/30 shadow-lg shadow-red-500/20">
            <Zap size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">Scalp Terminal</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                <Activity size={12} className="text-green-500" /> High-Freq Execution Hub
            </p>
          </div>
        </div>
        
        <button 
            onClick={() => onToggleAutoMode(!isAutoMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${isAutoMode ? 'bg-green-600 border-green-400 text-white shadow-lg shadow-green-500/30' : 'bg-slate-900 border-slate-700 text-slate-500'}`}
        >
            <Power size={14} />
            {isAutoMode ? 'Auto-Pilot ON' : 'Manual Mode'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 overflow-hidden">
        {/* Alpha Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-2 overflow-y-auto no-scrollbar max-h-[30vh] lg:max-h-full">
            <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1 px-1">Selected Hotlist</div>
            {activePicks.map(stock => {
                const data = marketData[stock.symbol];
                const isSelected = selectedSymbol === stock.symbol;
                return (
                    <button 
                        key={stock.symbol}
                        onClick={() => setSelectedSymbol(stock.symbol)}
                        className={`p-3 rounded-2xl border flex justify-between items-center transition-all ${isSelected ? 'bg-blue-600 border-blue-400 shadow-xl scale-[1.02]' : 'bg-slate-900 border-slate-800'}`}
                    >
                        <div className="text-left">
                            <div className="text-xs font-black text-white uppercase italic">{stock.symbol.split('.')[0]}</div>
                            <div className={`text-[8px] font-bold ${isSelected ? 'text-blue-100' : 'text-slate-500'} uppercase`}>{stock.score}% Conviction</div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-mono font-bold text-white">₹{data?.price.toFixed(1) || '--'}</div>
                            <div className={`text-[9px] font-bold ${data?.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {data ? (data.changePercent >= 0 ? '+' : '') + data.changePercent.toFixed(2) + '%' : '--'}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>

        {/* Live Terminal HUD */}
        <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden bg-gradient-to-br from-slate-900 to-black">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none"><BrainCircuit size={150}/></div>
                
                {selectedSymbol ? (
                    <div className="space-y-4 animate-fade-in">
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">{selectedSymbol.split('.')[0]}</h2>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[9px] font-black uppercase text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">LIVE_DATA_LINK</span>
                                    <span className="text-[9px] font-black uppercase text-slate-500">1M VOLATILITY ENGINE</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-mono font-black text-white tracking-tighter">₹{price.toFixed(2)}</div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Tick Frequency: 25s</div>
                            </div>
                        </div>

                        {/* Live Chart Visual */}
                        <div className="h-48 w-full bg-black/40 rounded-2xl border border-slate-800/50 p-2 overflow-hidden">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={history.slice(-40)}>
                                    <defs>
                                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                    <XAxis dataKey="time" hide />
                                    <YAxis domain={['auto', 'auto']} hide />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', fontSize: '10px' }}
                                        labelStyle={{ display: 'none' }}
                                    />
                                    <Area type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#chartGradient)" isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                             <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">RSI Micro</div>
                                <div className="text-sm font-bold text-white font-mono">{stockData?.technicals.rsi.toFixed(1) || '--'}</div>
                             </div>
                             <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">ADX Intensity</div>
                                <div className="text-sm font-bold text-white font-mono">{stockData?.technicals.adx.toFixed(1) || '--'}</div>
                             </div>
                             <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Rel Vol (1M)</div>
                                <div className="text-sm font-bold text-blue-400 font-mono">{stockData?.technicals.rvol.toFixed(1)}x</div>
                             </div>
                             <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Scalp Profit (Proj)</div>
                                <div className="text-sm font-bold text-green-400 font-mono">₹{(price * 0.005).toFixed(1)}</div>
                             </div>
                        </div>

                        <div className="flex gap-3">
                             <button 
                                onClick={() => handleAction('BUY')} 
                                disabled={isExecuting || isAutoMode}
                                className={`flex-1 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black italic text-white shadow-xl shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-2`}
                             >
                                {isExecuting ? <Loader2 className="animate-spin" size={18}/> : <TrendingUp size={18}/>}
                                {isAutoMode ? 'AUTO-PILOT' : 'INSTANT BUY'}
                             </button>
                             <button 
                                onClick={() => handleAction('SELL')} 
                                disabled={isExecuting || isAutoMode || !holding}
                                className={`flex-1 py-4 bg-red-600 hover:bg-red-500 rounded-2xl font-black italic text-white shadow-xl shadow-red-500/20 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-2`}
                             >
                                {isExecuting ? <Loader2 className="animate-spin" size={18}/> : <TrendingDown size={18}/>}
                                {isAutoMode ? 'AUTO-PILOT' : 'INSTANT SELL'}
                             </button>
                        </div>
                    </div>
                ) : (
                    <div className="h-96 flex flex-col items-center justify-center text-slate-700">
                        <Activity size={60} className="mb-4 opacity-10 animate-pulse" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Initialize Alpha Stream</p>
                    </div>
                )}
            </div>

            {holding && (
                <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-3xl p-5 flex justify-between items-center shadow-lg animate-slide-up">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg"><Target size={20}/></div>
                        <div>
                            <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Active Scalp</div>
                            <div className="text-xl font-black text-white italic uppercase tracking-tighter">{holding.symbol.split('.')[0]} x{holding.quantity}</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Unrealized P&L</div>
                        <div className={`text-2xl font-mono font-black ${price >= holding.avgCost ? 'text-green-400' : 'text-red-400'}`}>
                            {price >= holding.avgCost ? '+' : ''}₹{((price - holding.avgCost) * holding.quantity).toFixed(2)}
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
