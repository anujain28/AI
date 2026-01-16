import React, { useState, useEffect } from 'react';
import { StockRecommendation, PortfolioItem, Funds } from '../types';
import { X, DollarSign, Briefcase, Calculator } from 'lucide-react';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockRecommendation | null;
  currentPrice: number;
  funds: Funds;
  holdings: PortfolioItem[];
  activeBrokers: any[];
  initialBroker?: any;
  onBuy: (symbol: string, quantity: number, price: number, broker: any) => void;
  onSell: (symbol: string, quantity: number, price: number, broker: any) => void;
}

export const TradeModal: React.FC<TradeModalProps> = ({
  isOpen,
  onClose,
  stock,
  currentPrice,
  funds,
  holdings,
  activeBrokers,
  initialBroker,
  onBuy,
  onSell,
}) => {
  const [quantity, setQuantity] = useState<string>('1');
  const [amount, setAmount] = useState<string>('');
  const [mode, setMode] = useState<'BUY' | 'SELL'>('BUY');
  const [selectedBroker, setSelectedBroker] = useState<any>('PAPER');
  
  // Filter brokers based on Asset Type
  const compatibleBrokers = React.useMemo(() => {
    if (!stock) return ['PAPER'];
    const type = stock.type;
    
    return activeBrokers.filter(b => {
        if (b === 'PAPER') return true;
        if (type === 'STOCK') return ['DHAN', 'SHOONYA'].includes(b);
        if (type === 'MCX') return ['DHAN', 'SHOONYA'].includes(b);
        if (type === 'FOREX') return ['DHAN', 'SHOONYA'].includes(b);
        return false;
    });
  }, [activeBrokers, stock]);

  useEffect(() => {
    setQuantity(stock?.lotSize ? stock.lotSize.toString() : '1');
    setAmount((currentPrice * (stock?.lotSize || 1)).toFixed(2));
    setMode(initialBroker ? 'SELL' : 'BUY'); 
    
    if (initialBroker && compatibleBrokers.includes(initialBroker)) {
        setSelectedBroker(initialBroker);
    } else if (compatibleBrokers.length > 0) {
        if (compatibleBrokers.includes('PAPER')) setSelectedBroker('PAPER');
        else setSelectedBroker(compatibleBrokers[0]);
    }
  }, [stock, isOpen, compatibleBrokers, initialBroker, currentPrice]);

  if (!isOpen || !stock) return null;

  const currentHolding = holdings.find(h => h.broker === selectedBroker);
  const holdingQty = currentHolding ? currentHolding.quantity : 0;
  const qtyNum = parseFloat(quantity) || 0;
  const totalValue = parseFloat(amount) || (qtyNum * currentPrice);
  
  let availableCash = 0;
  if (stock.type === 'MCX') { availableCash = funds.mcx; }
  else if (stock.type === 'FOREX') { availableCash = funds.forex; }
  else { availableCash = funds.stock; }

  const canBuy = mode === 'BUY' && (selectedBroker !== 'PAPER' || (totalValue <= availableCash)) && totalValue > 0;
  const canSell = mode === 'SELL' && holdingQty >= qtyNum && qtyNum > 0;

  const handleExecute = () => {
    if (mode === 'BUY' && canBuy) {
      onBuy(stock.symbol, qtyNum, currentPrice, selectedBroker);
      onClose();
    } else if (mode === 'SELL' && canSell) {
      onSell(stock.symbol, qtyNum, currentPrice, selectedBroker);
      onClose();
    }
  };

  const handleQuantityChange = (val: string) => {
      setQuantity(val);
      const q = parseFloat(val);
      if (!isNaN(q)) setAmount((q * currentPrice).toFixed(2));
      else setAmount('');
  };

  const handleAmountChange = (val: string) => {
      setAmount(val);
      const amt = parseFloat(val);
      if (!isNaN(amt)) {
          let calcQty = amt / currentPrice;
          calcQty = stock.lotSize === 1 ? Math.floor(calcQty) : parseFloat(calcQty.toFixed(2));
          setQuantity(calcQty.toString());
      } else {
          setQuantity('0');
      }
  };

  const getBrokerColor = (b: string) => {
      switch(b) {
          case 'DHAN': return 'bg-purple-600 border-purple-500';
          case 'SHOONYA': return 'bg-orange-600 border-orange-500';
          default: return 'bg-slate-600 border-slate-500';
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-surface border-t md:border border-slate-700 w-full md:max-w-md rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden animate-slide-up md:animate-fade-in max-h-[90vh] flex flex-col">
        <div className="p-5 md:p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              {stock.symbol} <span className="text-xs md:text-sm font-normal text-slate-400">{stock.name}</span>
            </h2>
            <div className="text-blue-400 font-mono text-lg mt-1">₹{currentPrice.toFixed(2)}</div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 md:p-6 space-y-5 overflow-y-auto custom-scrollbar">
          <div className="flex bg-slate-900/50 p-1 rounded-lg">
            <button onClick={() => setMode('BUY')} className={`flex-1 py-2.5 rounded-md font-medium text-sm transition-all ${mode === 'BUY' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}>Buy</button>
            <button onClick={() => setMode('SELL')} className={`flex-1 py-2.5 rounded-md font-medium text-sm transition-all ${mode === 'SELL' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400'}`}>Sell</button>
          </div>
          
          {compatibleBrokers.length > 1 && (
            <div>
               <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">Select Broker</label>
               <div className="grid grid-cols-3 gap-2">
                  {compatibleBrokers.map(b => (
                     <button key={b} onClick={() => setSelectedBroker(b)} className={`py-2 text-[10px] md:text-xs font-bold rounded-lg border transition-all truncate px-1 ${selectedBroker === b ? `${getBrokerColor(b)} text-white` : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                        {b}
                     </button>
                  ))}
               </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Quantity</label>
              <input type="number" min="1" step={stock.lotSize || 1} value={quantity} onChange={(e) => handleQuantityChange(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white focus:border-blue-500 font-mono text-lg outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-1"><Calculator size={10} /> Amount (₹)</label>
              <input type="number" min="0" value={amount} onChange={(e) => handleAmountChange(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white focus:border-blue-500 font-mono text-lg outline-none" />
            </div>
          </div>

          <div className="flex justify-between items-center py-3 px-4 bg-slate-900/30 rounded-lg border border-slate-800">
             <span className="text-slate-400 text-xs">Estimated Total</span>
             <span className="text-lg font-bold text-white font-mono">₹{totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className={`bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 ${availableCash < totalValue && mode === 'BUY' ? 'border-red-500/50' : ''}`}>
              <div className="text-slate-400 flex items-center gap-1 mb-1"><DollarSign size={10}/> Funds</div>
              <div className={`font-mono font-bold ${availableCash < totalValue && mode === 'BUY' ? 'text-red-400' : 'text-white'}`}>₹{availableCash.toLocaleString()}</div>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
              <div className="text-slate-400 flex items-center gap-1 mb-1"><Briefcase size={10}/> Position</div>
              <div className="text-white font-mono font-bold">{holdingQty.toFixed(0)}</div>
            </div>
          </div>

          <button onClick={handleExecute} disabled={mode === 'BUY' ? !canBuy : !canSell} className={`w-full py-4 rounded-xl font-bold text-base shadow-lg transition-all ${mode === 'BUY' ? 'bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500' : 'bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500'} text-white`}>
            {mode === 'BUY' ? `Buy` : `Sell`}
          </button>
          
          <div className="text-center h-4">
             {mode === 'BUY' && !canBuy && totalValue > 0 && selectedBroker === 'PAPER' && <p className="text-red-400 text-[10px]">Insufficient funds</p>}
             {mode === 'SELL' && !canSell && qtyNum > 0 && <p className="text-red-400 text-[10px]">Insufficient holdings</p>}
          </div>
        </div>
        <div className="h-6 md:hidden"></div>
      </div>
    </div>
  );
};
