import React, { useMemo } from 'react';
import { StockRecommendation, MarketData, MarketSettings, AssetType } from '../types';
import { StockCard } from './StockCard';
import { getMarketStatus } from '../services/marketStatusService';
import { RefreshCw, Globe, TrendingUp, DollarSign, Circle, Trophy, Star, Sparkles } from 'lucide-react';

interface PageMarketProps {
  recommendations: StockRecommendation[];
  marketData: MarketData;
  onTrade: (stock: StockRecommendation) => void;
  onRefresh: () => void;
  isLoading: boolean;
  enabledMarkets: MarketSettings;
  allowedTypes?: AssetType[];
}

export const PageMarket: React.FC<PageMarketProps> = ({
  recommendations,
  marketData,
  onTrade,
  onRefresh,
  isLoading,
  enabledMarkets,
  allowedTypes
}) => {
  
  const isTypeAllowed = (type: AssetType) => !allowedTypes || allowedTypes.includes(type);

  const topRobotPicks = useMemo(() => {
    return recommendations.filter(r => r.isTopPick).slice(0, 5);
  }, [recommendations]);

  const otherStocks = useMemo(() => {
    return recommendations
      .filter(r => r.type === 'STOCK' && !r.isTopPick)
      .sort((a, b) => (marketData[b.symbol]?.technicals.score || 0) - (marketData[a.symbol]?.technicals.score || 0));
  }, [recommendations, marketData]);

  const renderSection = (title: string, items: StockRecommendation[], icon: React.ReactNode, description: string, accentColor: string, type: AssetType) => {
    if (!isTypeAllowed(type)) return null;
    const settingsKey = type === 'STOCK' ? 'stocks' : type.toLowerCase() as keyof MarketSettings;
    if (!enabledMarkets[settingsKey]) return null;
    if (items.length === 0 && !isLoading) return null;

    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 px-1">
          <div className={`p-2 bg-slate-800 rounded-lg ${accentColor}`}>{icon}</div>
          <div>
             <h3 className="text-lg font-bold text-white">{title}</h3>
             <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading ? (
            Array(2).fill(0).map((_, i) => <div key={i} className="h-40 bg-surface rounded-xl border border-slate-800 animate-pulse"></div>)
          ) : (
            items.map(item => <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />)
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 pb-20 animate-fade-in">
      <div className="flex justify-between items-start mb-6">
         <div>
             <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-white">
                 {allowedTypes && !allowedTypes.includes('STOCK') ? 'F&O Insights' : 'AI Trading Ideas'}
             </h1>
             <p className="text-xs text-slate-400">Powered by Gemini Real-time Grounding</p>
         </div>
         <button onClick={onRefresh} className={`p-2 bg-blue-600 rounded-full text-white shadow-lg ${isLoading ? 'animate-spin' : ''}`}>
            <RefreshCw size={18} />
         </button>
      </div>

      {isTypeAllowed('STOCK') && enabledMarkets.stocks && topRobotPicks.length > 0 && (
          <div className="mb-10">
              <div className="flex items-center justify-between mb-4 bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-10 group-hover:rotate-12 transition-transform"><Trophy size={80}/></div>
                  <div className="flex items-center gap-3">
                      <div className="p-3 bg-yellow-500 rounded-xl text-black shadow-[0_0_15px_rgba(234,179,8,0.5)]"><Star size={24} fill="currentColor"/></div>
                      <div>
                          <h2 className="text-xl font-black text-white italic tracking-tighter">AIRobots TOP 5 PICKS</h2>
                          <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest">High Probability Targets</p>
                      </div>
                  </div>
                  <div className="hidden md:flex gap-1">
                      {[1,2,3].map(i => <Sparkles key={i} size={10} className="text-yellow-500 animate-pulse"/>)}
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {topRobotPicks.map(item => <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />)}
              </div>
          </div>
      )}

      {renderSection("NSE Momentum Picks", otherStocks, <TrendingUp size={20}/>, "Top 20 Technical Signals", "text-blue-400", 'STOCK')}
      {renderSection("MCX Commodities", recommendations.filter(r => r.type === 'MCX'), <Globe size={20}/>, "Gold & Silver Futures", "text-yellow-400", 'MCX')}
      {renderSection("Forex Pairs", recommendations.filter(r => r.type === 'FOREX'), <DollarSign size={20}/>, "Currency Trading", "text-green-400", 'FOREX')}
    </div>
  );
};