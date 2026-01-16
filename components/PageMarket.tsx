import React, { useMemo } from 'react';
import { StockRecommendation, MarketData, MarketSettings, AssetType } from '../types';
import { StockCard } from './StockCard';
import { getMarketStatus } from '../services/marketStatusService';
import { RefreshCw, Globe, TrendingUp, DollarSign, Circle, Trophy, Zap, Settings } from 'lucide-react';

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

  const isEntirePageDisabled = useMemo(() => {
      const typesToCheck = allowedTypes || ['STOCK', 'MCX', 'FOREX'];
      return typesToCheck.every(t => {
          if (t === 'STOCK') return !enabledMarkets.stocks;
          if (t === 'MCX') return !enabledMarkets.mcx;
          if (t === 'FOREX') return !enabledMarkets.forex;
          return true;
      });
  }, [allowedTypes, enabledMarkets]);

  const renderMarketStatus = () => {
      const typesToCheck: AssetType[] = allowedTypes || ['STOCK'];
      
      const activeTypes = typesToCheck.filter(t => {
          if (t === 'STOCK') return enabledMarkets.stocks;
          if (t === 'MCX') return enabledMarkets.mcx;
          if (t === 'FOREX') return enabledMarkets.forex;
          return false;
      });

      if (activeTypes.length === 0) return null;

      const statuses = activeTypes.map(t => ({ type: t, status: getMarketStatus(t) }));
      
      return (
          <div className="flex flex-col items-end gap-1">
              {statuses.map((s, idx) => (
                  <div key={idx} className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-800/80 ${s.status.isOpen ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}`}>
                      <Circle size={6} fill="currentColor" className={s.status.isOpen ? 'animate-pulse' : ''} />
                      {s.type === 'STOCK' ? 'NSE' : s.type}: {s.status.message}
                  </div>
              ))}
          </div>
      );
  };

  const topStocks = useMemo(() => {
    if (!isTypeAllowed('STOCK') || !enabledMarkets.stocks) return [];
    
    return recommendations
      .filter(r => r.type === 'STOCK')
      .map(r => {
         const data = marketData[r.symbol];
         return { ...r, score: data?.technicals.score || 0 };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20); 
  }, [recommendations, marketData, enabledMarkets, allowedTypes]);

  const mcxRecs = recommendations.filter(r => r.type === 'MCX');
  const forexRecs = recommendations.filter(r => r.type === 'FOREX');

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
             <h3 className="text-lg font-bold text-white flex items-center gap-2">
                 {title} 
                 <span className="text-[10px] font-normal text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">{items.length} Assets</span>
             </h3>
             <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading ? (
            Array(4).fill(0).map((_, i) => <div key={i} className="h-32 bg-surface rounded-xl border border-slate-800 animate-pulse"></div>)
          ) : (
            items.map(item => (
              <StockCard key={item.symbol} stock={item} marketData={marketData} onTrade={onTrade} />
            ))
          )}
        </div>
      </div>
    );
  };

  if (isEntirePageDisabled) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Settings size={32} className="text-slate-500"/>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Markets Disabled</h2>
              <p className="text-sm text-slate-400 max-w-xs">
                  All market segments for this page are currently disabled in your settings. 
              </p>
              <div className="mt-6 text-xs text-blue-400 font-bold bg-blue-500/10 px-4 py-2 rounded-lg border border-blue-500/20">
                  Go to Config &gt; Markets to enable them.
              </div>
          </div>
      );
  }

  return (
    <div className="p-4 pb-20 animate-fade-in">
      <div className="flex justify-between items-start mb-6">
         <div>
             <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-white">
                 {allowedTypes && !allowedTypes.includes('STOCK') ? 'F&O Market' : 'Market Analysis'}
             </h1>
             <p className="text-xs text-slate-400">AI-Powered Opportunities</p>
         </div>
         <div className="flex flex-col items-end gap-2">
            <button onClick={onRefresh} className={`p-2 bg-blue-600 rounded-full text-white shadow-lg ${isLoading ? 'animate-spin' : ''}`}>
                <RefreshCw size={18} />
            </button>
            {renderMarketStatus()}
         </div>
      </div>

      {isTypeAllowed('STOCK') && enabledMarkets.stocks && (
        <div className="mb-10">
            <div className="flex items-center gap-2 mb-4 px-1">
                <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400"><Trophy size={20}/></div>
                <div>
                    <h3 className="text-lg font-bold text-white">Top 20 High Strength Picks</h3>
                    <p className="text-xs text-slate-500">Ranked by AI Technical Score & Profit Potential</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isLoading ? (
                    Array(4).fill(0).map((_, i) => <div key={i} className="h-32 bg-surface rounded-xl border border-slate-800 animate-pulse"></div>)
                ) : topStocks.length > 0 ? (
                    topStocks.map((item, index) => {
                        return (
                            <div key={item.symbol} className="relative">
                                <div className="absolute -left-2 -top-2 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-[#0f172a] z-10 shadow-lg shadow-blue-500/30">
                                    {index + 1}
                                </div>
                                <StockCard stock={item} marketData={marketData} onTrade={onTrade} />
                            </div>
                        )
                    })
                ) : (
                    <div className="col-span-2 p-8 text-center text-slate-500 border border-slate-800 rounded-xl border-dashed">
                        <Zap size={24} className="mx-auto mb-2 opacity-50"/>
                        No high-conviction signals found at this moment.
                    </div>
                )}
            </div>
        </div>
      )}

      {renderSection("MCX Commodities", mcxRecs, <Globe size={20}/>, "Gold, Silver, Crude Futures", "text-yellow-400", 'MCX')}
      {renderSection("Forex Pairs", forexRecs, <DollarSign size={20}/>, "Currency Trading", "text-teal-400", 'FOREX')}
      
      <div className="h-8"></div>
    </div>
  );
};
