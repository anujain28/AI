import React from 'react';
import { StockRecommendation, MarketData, MarketSettings, AssetType } from '../types';
import { StockCard } from './StockCard';
import { getMarketStatus } from '../services/marketStatusService';
import { RefreshCw, Globe, TrendingUp, DollarSign, Clock, Calendar, BarChart, Zap, Cpu, TrendingDown, ArrowUpRight, ArrowDownRight, Minus, Circle } from 'lucide-react';

interface PageMarketProps {
  recommendations: StockRecommendation[];
  marketData: MarketData;
  onTrade: (stock: StockRecommendation) => void;
  onRefresh: () => void;
  isLoading: boolean;
  enabledMarkets: MarketSettings;
  allowedTypes?: AssetType[]; // New prop for filtering
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
  
  // Helper to check if type is allowed
  const isTypeAllowed = (type: AssetType) => {
    return !allowedTypes || allowedTypes.includes(type);
  };

  // Generate Status Badges
  const renderMarketStatus = () => {
      const typesToCheck: AssetType[] = allowedTypes || ['STOCK'];
      // Unique set of types if generic page
      const statuses = typesToCheck.map(t => ({ type: t, status: getMarketStatus(t) }));
      
      // Filter out duplicate status messages if multiple assets have same status (optional, but keeping simple)
      
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

  // Categorize Stocks
  const intradayRecs = recommendations.filter(r => r.type === 'STOCK' && r.timeframe === 'INTRADAY');
  const btstRecs = recommendations.filter(r => r.type === 'STOCK' && r.timeframe === 'BTST');
  const weeklyRecs = recommendations.filter(r => r.type === 'STOCK' && r.timeframe === 'WEEKLY');
  const monthlyRecs = recommendations.filter(r => r.type === 'STOCK' && r.timeframe === 'MONTHLY');
  const otherStocks = recommendations.filter(r => r.type === 'STOCK' && !['INTRADAY', 'BTST', 'WEEKLY', 'MONTHLY'].includes(r.timeframe || ''));

  const mcxRecs = recommendations.filter(r => r.type === 'MCX');
  const forexRecs = recommendations.filter(r => r.type === 'FOREX');
  const cryptoRecs = recommendations.filter(r => r.type === 'CRYPTO');

  const renderSection = (title: string, items: StockRecommendation[], icon: React.ReactNode, description: string, accentColor: string, type: AssetType) => {
    // Check if this section type allowed by page filter AND enabled in settings
    if (!isTypeAllowed(type)) return null;

    // Settings check: Stock settings cover all stock timeframes
    const settingsKey = type === 'STOCK' ? 'stocks' : type.toLowerCase() as keyof MarketSettings;
    if (!enabledMarkets[settingsKey]) return null;

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

  const renderCryptoTrendBoard = () => {
      if (!isTypeAllowed('CRYPTO') || !enabledMarkets.crypto) return null;

      return (
          <div className="mb-8 bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
               <div className="px-4 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                  <div className="flex items-center gap-2">
                      <Cpu size={16} className="text-purple-400"/>
                      <h3 className="text-sm font-bold text-white">Top 5 Crypto Trends</h3>
                  </div>
                  <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">Live AI</span>
               </div>
               <div className="overflow-x-auto">
                   <table className="w-full text-left text-xs">
                       <thead>
                           <tr className="text-slate-500 border-b border-slate-800/50">
                               <th className="px-4 py-2">Coin</th>
                               <th className="px-4 py-2 text-right">CMP ($)</th>
                               <th className="px-4 py-2 text-right">Trend</th>
                               <th className="px-4 py-2 text-right">Action</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-800/50">
                           {isLoading ? (
                               <tr><td colSpan={4} className="p-4 text-center text-slate-500">Scanning blockchain...</td></tr>
                           ) : cryptoRecs.slice(0, 5).map(c => {
                               const data = marketData[c.symbol];
                               const price = data?.price || c.currentPrice;
                               const change = data?.changePercent || 0;
                               const isUp = change >= 0;
                               const signal = c.reason.includes('Buy') ? 'BUY' : c.reason.includes('Sell') ? 'SELL' : 'HOLD';
                               
                               return (
                                   <tr key={c.symbol} onClick={() => onTrade(c)} className="hover:bg-slate-800/40 cursor-pointer">
                                       <td className="px-4 py-3 font-bold text-white">{c.symbol}</td>
                                       <td className="px-4 py-3 text-right font-mono text-slate-300">${price.toLocaleString()}</td>
                                       <td className="px-4 py-3 text-right">
                                           <div className={`flex items-center justify-end gap-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                                               {isUp ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                                               {Math.abs(change).toFixed(2)}%
                                           </div>
                                       </td>
                                       <td className="px-4 py-3 text-right">
                                           <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                               signal === 'BUY' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                               signal === 'SELL' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                               'bg-slate-700 text-slate-300 border-slate-600'
                                           }`}>
                                               {signal}
                                           </span>
                                       </td>
                                   </tr>
                               )
                           })}
                       </tbody>
                   </table>
               </div>
          </div>
      );
  }

  return (
    <div className="p-4 pb-20 animate-fade-in">
      <div className="flex justify-between items-start mb-6">
         <div>
             <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-white">
                 {allowedTypes && !allowedTypes.includes('STOCK') ? 'F&O / Crypto' : 'Stock Market'}
             </h1>
             <p className="text-xs text-slate-400">AI-Powered Technical Analysis</p>
         </div>
         <div className="flex flex-col items-end gap-2">
            <button onClick={onRefresh} className={`p-2 bg-blue-600 rounded-full text-white shadow-lg ${isLoading ? 'animate-spin' : ''}`}>
                <RefreshCw size={18} />
            </button>
            {/* Market Status Indicators */}
            {renderMarketStatus()}
         </div>
      </div>
      
      {/* Crypto Trend Board - Special Section */}
      {renderCryptoTrendBoard()}

      {isTypeAllowed('STOCK') && (
        <>
            {renderSection("Intraday Fire", intradayRecs, <Zap size={20}/>, "High Momentum Day Trades", "text-orange-400", 'STOCK')}
            {renderSection("BTST Picks", btstRecs, <Clock size={20}/>, "Buy Today, Sell Tomorrow", "text-blue-400", 'STOCK')}
            {renderSection("Weekly Picks", weeklyRecs, <Calendar size={20}/>, "Short Term Holding (5-7 Days)", "text-purple-400", 'STOCK')}
            {renderSection("Monthly Picks", monthlyRecs, <BarChart size={20}/>, "Positional Trades (1 Month+)", "text-green-400", 'STOCK')}
            {renderSection("Other Stocks", otherStocks, <TrendingUp size={20}/>, "Intraday & Momentum", "text-slate-400", 'STOCK')}
        </>
      )}

      {/* Crypto Cards Section (Full view) */}
      {renderSection("All Crypto Assets", cryptoRecs, <Cpu size={20}/>, "Digital Currency Signals", "text-purple-400", 'CRYPTO')}
      {renderSection("MCX Commodities", mcxRecs, <Globe size={20}/>, "Futures: Gold, Silver, Crude", "text-yellow-400", 'MCX')}
      {renderSection("Forex Pairs", forexRecs, <DollarSign size={20}/>, "Currency derivatives", "text-teal-400", 'FOREX')}
      
      <div className="h-8"></div>
    </div>
  );
};