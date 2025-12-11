import React from 'react';
import { StockRecommendation, MarketData, MarketSettings } from '../types';
import { StockCard } from './StockCard';
import { RefreshCw, Cpu } from 'lucide-react';

interface PageCryptoProps {
  recommendations: StockRecommendation[];
  marketData: MarketData;
  onTrade: (stock: StockRecommendation) => void;
  onRefresh: () => void;
  isLoading: boolean;
  enabledMarkets: MarketSettings;
}

export const PageCrypto: React.FC<PageCryptoProps> = ({
  recommendations,
  marketData,
  onTrade,
  onRefresh,
  isLoading,
  enabledMarkets
}) => {
  
  const cryptoRecs = recommendations.filter(r => r.type === 'CRYPTO');

  return (
    <div className="p-4 pb-20 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
         <div>
             <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-white">Crypto Market</h1>
             <p className="text-xs text-slate-400">Supported: Zebpay, Binance, CoinDCX, CoinSwitch</p>
         </div>
         <button onClick={onRefresh} className={`p-2 bg-purple-600 rounded-full text-white shadow-lg ${isLoading ? 'animate-spin' : ''}`}>
            <RefreshCw size={18} />
         </button>
      </div>

      {enabledMarkets.crypto ? (
          <div className="space-y-3">
             {isLoading ? (
                <div className="h-24 bg-surface rounded-xl border border-slate-800 animate-pulse"></div>
             ) : cryptoRecs.length > 0 ? (
                cryptoRecs.map(item => (
                   <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />
                ))
             ) : (
                <div className="p-8 text-center text-slate-500 border border-slate-800 rounded-xl">No crypto signals at the moment.</div>
             )}
          </div>
      ) : (
          <div className="text-center text-slate-500 mt-10">Crypto market is disabled in Config.</div>
      )}
      
      <div className="h-8"></div>
    </div>
  );
};