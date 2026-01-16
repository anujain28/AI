import React from 'react';
import { StockRecommendation, MarketData, MarketSettings, AssetType } from '../types';
import { StockCard } from './StockCard';
import { RefreshCw, Globe, TrendingUp, DollarSign } from 'lucide-react';

interface PageRecommendationsProps {
  recommendations: StockRecommendation[];
  marketData: MarketData;
  onTrade: (stock: StockRecommendation) => void;
  onRefresh: () => void;
  isLoading: boolean;
  enabledMarkets: MarketSettings;
}

export const PageRecommendations: React.FC<PageRecommendationsProps> = ({
  recommendations,
  marketData,
  onTrade,
  onRefresh,
  isLoading,
  enabledMarkets
}) => {
  
  const renderSection = (title: string, type: AssetType, icon: React.ReactNode, description: string) => {
    const settingsKey = type === 'STOCK' ? 'stocks' : type.toLowerCase() as keyof MarketSettings;
    if (!enabledMarkets[settingsKey]) return null;

    const items = recommendations.filter(r => r.type === type);
    
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="p-2 bg-slate-800 rounded-lg text-blue-400">{icon}</div>
          <div>
             <h3 className="text-lg font-bold text-white">{title}</h3>
             <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {isLoading ? (
            <div className="h-24 bg-surface rounded-xl border border-slate-800 animate-pulse"></div>
          ) : items.length > 0 ? (
            items.map(item => (
              <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />
            ))
          ) : (
            <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-800 text-center text-slate-500 text-xs">
              No recommendations available for {title}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 pb-20 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
         <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Market Insights</h1>
         <button onClick={onRefresh} className={`p-2 bg-blue-600 rounded-full text-white shadow-lg ${isLoading ? 'animate-spin' : ''}`}>
            <RefreshCw size={18} />
         </button>
      </div>

      {renderSection("Indian Stocks", "STOCK", <TrendingUp size={20}/>, "NSE/BSE Equity Recommendations")}
      {renderSection("Commodities", "MCX", <Globe size={20}/>, "Gold, Silver, Crude Oil")}
      {renderSection("Forex", "FOREX", <DollarSign size={20}/>, "Currency Pairs")}
      
      <div className="h-8"></div>
    </div>
  );
};
