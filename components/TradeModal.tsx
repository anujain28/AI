import React, { useState, useEffect } from 'react';
import { X, DollarSign, Briefcase, Calculator } from 'lucide-react';
import {
  StockRecommendation,
  PortfolioItem,
  Funds,
  BrokerID,      // <- ensure this exists in ../types
  AssetType,      // <- if you use it elsewhere
} from '../types';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockRecommendation | null;
  currentPrice: number;
  funds: Funds;
  holdings: PortfolioItem[];
  activeBrokers: BrokerID[];
  initialBroker?: BrokerID;
  onBuy: (
    symbol: string,
    quantity: number,
    price: number,
    broker: BrokerID
  ) => void;
  onSell: (
    symbol: string,
    quantity: number,
    price: number,
    broker: BrokerID
  ) => void;
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
  const [selectedBroker, setSelectedBroker] = useState<BrokerID>('PAPER');

  // Initialise when opened / stock changes
  useEffect(() => {
    if (!isOpen || !stock) return;

    const defaultQty = stock.lotSize || 1;
    setQuantity(defaultQty.toString());

    const baseAmount = currentPrice * defaultQty;
    const decimals = stock.type === 'CRYPTO' ? 6 : 2;
    setAmount(baseAmount.toFixed(decimals));

    setMode(initialBroker ? 'SELL' : 'BUY');

    if (initialBroker) {
      setSelectedBroker(initialBroker);
    } else if (activeBrokers.length > 0) {
      setSelectedBroker(
        activeBrokers.includes('PAPER') ? 'PAPER' : activeBrokers[0]
      );
    }
  }, [stock, isOpen, activeBrokers, initialBroker, currentPrice]);

  if (!isOpen || !stock) return null;

  // Lookup holding for THIS symbol & broker
  const currentHolding = holdings.find(
    (h) => h.broker === selectedBroker && h.symbol === stock.symbol
  );
  const holdingQty = currentHolding ? currentHolding.quantity : 0;

  const qtyNum = parseFloat(quantity) || 0;
  const totalValue = (() => {
    const amt = parseFloat(amount);
    if (!isNaN(amt) && amt > 0) return amt;
    return qtyNum * currentPrice;
  })();

  // Funds per asset type
  let availableCash = 0;
  let fundLabel = 'Equity';
  if (stock.type === 'MCX') {
    availableCash = funds.mcx;
    fundLabel = 'MCX';
  } else if (stock.type === 'FOREX') {
    availableCash = funds.forex;
    fundLabel = 'Forex';
  } else if (stock.type === 'CRYPTO') {
    availableCash = funds.crypto;
    fundLabel = 'Crypto';
  } else {
    availableCash = funds.stock;
    fundLabel = 'Equity';
  }

  const isPriceValid = currentPrice > 0;
  const isPaper = selectedBroker === 'PAPER';
  const enforceFunds = isPaper; // set to true if you want for all brokers

  const canBuy =
    mode === 'BUY' &&
    isPriceValid &&
    totalValue > 0 &&
    (!enforceFunds || totalValue <= availableCash);

  const canSell =
    mode === 'SELL' &&
    isPriceValid &&
    qtyNum > 0 &&
    holdingQty >= qtyNum;

  const handleExecute = () => {
    if (!isPriceValid) return;

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
    if (!isNaN(q)) {
      const calc = q * currentPrice;
      const decimals = stock.type === 'CRYPTO' ? 6 : 2;
      setAmount(calc.toFixed(decimals));
    } else {
      setAmount('');
    }
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const amt = parseFloat(val);
    if (!isNaN(amt) && currentPrice > 0) {
      let calcQty = amt / currentPrice;
      if (stock.type === 'CRYPTO') {
        calcQty = parseFloat(calcQty.toFixed(6));
      } else if (stock.lotSize && stock.lotSize > 1) {
        // Respect lot sizes (e.g. F&O)
        calcQty = Math.round(calcQty / stock.lotSize) * stock.lotSize;
      } else {
        calcQty = Math.floor(calcQty);
      }
      setQuantity(calcQty.toString());
    } else {
      setQuantity('0');
    }
  };

  const getBrokerColor = (b: BrokerID) => {
    switch (b) {
      case 'DHAN':
        return 'bg-purple-600 border-purple-500';
      case 'SHOONYA':
        return 'bg-orange-600 border-orange-500';
      case 'BINANCE':
        return 'bg-yellow-600 border-yellow-500';
      case 'COINDCX':
        return 'bg-blue-600 border-blue-500';
      case 'COINSWITCH':
        return 'bg-teal-600 border-teal-500';
      case 'PAPER':
      default:
        return 'bg-slate-600 border-slate-500';
    }
  };

  const filteredBrokers = activeBrokers; // optionally filter by stock.type here

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-4">
      <div className="bg-surface border-t md:border border-slate-700 w-full md:max-w-md rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden animate-slide-up md:animate-fade-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/50">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              {stock.symbol}
              <span className="text-xs md:text-sm font-normal text-slate-400">
                {stock.name}
              </span>
            </h2>
            <div className="text-blue-400 font-mono text-lg mt-1">
              ₹{currentPrice.toFixed(2)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 md:p-6 space-y-5 overflow-y-auto custom-scrollbar">
          {/* Buy / Sell Toggle */}
          <div className="flex bg-slate-900/50 p-1 rounded-lg">
            <button
              onClick={() => setMode('BUY')}
              className={`flex-1 py-2.5 rounded-md font-medium text-sm transition-all ${
                mode === 'BUY'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setMode('SELL')}
              className={`flex-1 py-2.5 rounded-md font-medium text-sm transition-all ${
                mode === 'SELL'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-400'
              }`}
            >
              Sell
            </button>
          </div>

          {/* Broker selector */}
          {filteredBrokers.length > 1 && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">
                Broker
              </label>
              <div className="grid grid-cols-3 gap-2">
                {filteredBrokers.map((b) => (
                  <button
                    key={b}
                    onClick={() => setSelectedBroker(b)}
                    className={`py-2 text-[10px] md:text-xs font-bold rounded-lg border transition-all truncate px-1 ${
                      selectedBroker === b
                        ? `${getBrokerColor(b)} text-white`
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity / Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                Quantity
              </label>
              <input
                type="number"
                min={stock.type === 'CRYPTO' ? '0.000001' : '1'}
                step={stock.type === 'CRYPTO' ? '0.000001' : (stock.lotSize || 1)}
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white focus:border-blue-500 font-mono text-lg outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center gap-1">
                <Calculator size={10} /> Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white focus:border-blue-500 font-mono text-lg outline-none"
              />
            </div>
          </div>

          {/* Estimated Total */}
          <div className="flex justify-between items-center py-3 px-4 bg-slate-900/30 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-xs">Estimated Total</span>
            <span className="text-lg font-bold text-white font-mono">
              ₹{totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Funds / Position */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div
              className={`bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 ${
                availableCash < totalValue && mode === 'BUY' && enforceFunds
                  ? 'border-red-500/50'
                  : ''
              }`}
            >
              <div className="text-slate-400 flex items-center gap-1 mb-1">
                <DollarSign size={10} /> {fundLabel} Funds
              </div>
              <div
                className={`font-mono font-bold ${
                  availableCash < totalValue && mode === 'BUY' && enforceFunds
                    ? 'text-red-400'
                    : 'text-white'
                }`}
              >
                ₹{availableCash.toLocaleString()}
              </div>
            </div>
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
              <div className="text-slate-400 flex items-center gap-1 mb-1">
                <Briefcase size={10} /> Position ({selectedBroker})
              </div>
              <div className="text-white font-mono font-bold">
                {holdingQty.toFixed(stock.type === 'CRYPTO' ? 4 : 0)}
              </div>
            </div>
          </div>

          {/* Summary line */}
          {qtyNum > 0 && isPriceValid && (
            <p className="text-[11px] text-slate-400 text-center">
              {mode === 'BUY' ? 'Buying' : 'Selling'} {qtyNum}{' '}
              {stock.symbol} @ ₹{currentPrice.toFixed(2)} via {selectedBroker}
            </p>
          )}

          {/* Action button */}
          <button
            onClick={handleExecute}
            disabled={mode === 'BUY' ? !canBuy : !canSell}
            className={`w-full py-4 rounded-xl font-bold text-base shadow-lg transition-all ${
              mode === 'BUY'
                ? 'bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500'
                : 'bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500'
            } text-white`}
          >
            {mode === 'BUY' ? 'Buy' : 'Sell'}
          </button>

          {/* Error messages */}
          <div className="text-center h-4">
            {mode === 'BUY' &&
              !canBuy &&
              totalValue > 0 &&
              enforceFunds &&
              availableCash < totalValue && (
                <p className="text-red-400 text-[10px]">Insufficient funds</p>
              )}
            {mode === 'SELL' && !canSell && qtyNum > 0 && (
              <p className="text-red-400 text-[10px]">Insufficient holdings</p>
            )}
          </div>
        </div>

        {/* Spacer for mobile safe area/nav */}
        <div className="h-6 md:hidden" />
      </div>
    </div>
  );
};
