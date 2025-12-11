import React from 'react';
import { StockRecommendation, MarketData, MarketSettings } from '../types';
import { StockCard } from './StockCard';
import { RefreshCw, Globe, TrendingUp, DollarSign, Clock, Calendar, BarChart } from 'lucide-react';

interface PageMarketProps {
  recommendations: StockRecommendation[];
  marketData: MarketData;
  onTrade: (stock: StockRecommendation) => void;
  onRefresh: () => void;
  isLoading: boolean;
  enabledMarkets: MarketSettings;
}

export const PageMarket: React.FC<PageMarketProps> = ({
  recommendations,
  marketData,
  onTrade,
  onRefresh,
  isLoading,
  enabledMarkets
}) => {
  
  // Categorize Stocks
  const btstRecs = recommendations.filter(r => r.type === 'STOCK' && r.timeframe === 'BTST');
  const weeklyRecs = recommendations.filter(r => r.type === 'STOCK' && r.timeframe === 'WEEKLY');
  const monthlyRecs = recommendations.filter(r => r.type === 'STOCK' && r.timeframe === 'MONTHLY');
  // Fallback if no specific timeframe set but type is STOCK
  const otherStocks = recommendations.filter(r => r.type === 'STOCK' && !['BTST', 'WEEKLY', 'MONTHLY'].includes(r.timeframe || ''));

  const mcxRecs = recommendations.filter(r => r.type === 'MCX');
  const forexRecs = recommendations.filter(r => r.type === 'FOREX');

  const renderSection = (title: string, items: StockRecommendation[], icon: React.ReactNode, description: string, accentColor: string) => {
    if (items.length === 0 && !isLoading) return null;
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className={`p-2 bg-slate-800 rounded-lg ${accentColor}`}>{icon}</div>
          <div>
             <h3 className="text-lg font-bold text-white">{title}</h3>
             <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        
        <div className="space-y-3">
          {isLoading ? (
            <div className="h-24 bg-surface rounded-xl border border-slate-800 animate-pulse"></div>
          ) : (
            items.map(item => (
              <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 pb-20 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
         <div>
             <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-white">Equity & Derivatives</h1>
             <p className="text-xs text-slate-400">AI-Powered Nifty Recommendations</p>
         </div>
         <button onClick={onRefresh} className={`p-2 bg-blue-600 rounded-full text-white shadow-lg ${isLoading ? 'animate-spin' : ''}`}>
            <RefreshCw size={18} />
         </button>
      </div>

      {enabledMarkets.stocks && (
        <>
            {renderSection("BTST Picks", btstRecs, <Clock size={20}/>, "Buy Today, Sell Tomorrow", "text-blue-400")}
            {renderSection("Weekly Picks", weeklyRecs, <Calendar size={20}/>, "Short Term Holding (5-7 Days)", "text-purple-400")}
            {renderSection("Monthly Picks", monthlyRecs, <BarChart size={20}/>, "Positional Trades (1 Month+)", "text-green-400")}
            {/* Catch-all for stocks not strictly categorized */}
            {renderSection("Other Stocks", otherStocks, <TrendingUp size={20}/>, "Intraday & Momentum", "text-slate-400")}
        </>
      )}

      {enabledMarkets.mcx && renderSection("MCX Commodities", mcxRecs, <Globe size={20}/>, "Futures: Gold, Silver, Crude", "text-yellow-400")}
      {enabledMarkets.forex && renderSection("Forex Pairs", forexRecs, <DollarSign size={20}/>, "Currency derivatives", "text-teal-400")}
      
      {!enabledMarkets.stocks && !enabledMarkets.mcx && !enabledMarkets.forex && (
          <div className="text-center text-slate-500 mt-10">Enable markets in Config to see data.</div>
      )}
      <div className="h-8"></div>
    </div>
  );
};