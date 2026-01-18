
import { StockRecommendation, AppSettings } from "../types";
import { fetchRealStockData } from "./marketDataService";
import { getMarketStatus } from "./marketStatusService";
import { getFullUniverse } from "./stockListService";

async function promisePool<T, R>(
    items: T[],
    batchSize: number,
    fn: (item: T) => Promise<R>
): Promise<R[]> {
    const results: R[] = [];
    const pool = new Set<Promise<void>>();

    for (const item of items) {
        const promise = fn(item).then((res) => {
            if (res) results.push(res);
            pool.delete(promise);
        });
        pool.add(promise);
        if (pool.size >= batchSize) {
            await Promise.race(pool);
        }
    }
    await Promise.all(pool);
    return results;
}

/**
 * High-Speed Technical Scan & Categorization
 */
export const runTechnicalScan = async (
    stockUniverse: string[], 
    settings: AppSettings
): Promise<StockRecommendation[]> => {
  
  const marketStatus = getMarketStatus('STOCK');
  const isWeekend = !marketStatus.isOpen && marketStatus.message.includes('Weekend');
  const isAfterHours = !marketStatus.isOpen && marketStatus.message.includes('After Hours');

  // Limit universe for "Instant First Sync" (Top 60 most liquid)
  const scanTargets = getFullUniverse().slice(0, 60);

  // Concurrency bumped to 40 for aggressive data fetching
  const rawTechnicalResults = await promisePool(scanTargets, 40, async (symbol) => {
      try {
          // Get multiple timeframes for better classification
          const interval = (isWeekend || isAfterHours) ? "1d" : "15m";
          const range = (isWeekend || isAfterHours) ? "1mo" : "2d";
          const data = await fetchRealStockData(symbol, settings, interval, range);

          if (data) {
              const tech = data.technicals;
              const rvol = tech.rvol;
              const score = tech.score;
              
              // Determine Timeframe Category
              let timeframe: 'INTRADAY' | 'BTST' | 'WEEKLY' | 'MONTHLY' = 'INTRADAY';
              let reason = "Momentum Breakout";

              if (score > 85 && rvol > 2.5) {
                  timeframe = 'INTRADAY';
                  reason = "High Volume Intraday Spike";
              } else if (score > 70 && tech.rsi > 60 && tech.adx > 25) {
                  timeframe = 'BTST';
                  reason = "Strong EOD momentum carry-forward";
              } else if (tech.ema.ema9 > tech.ema.ema21 && tech.adx > 30) {
                  timeframe = 'WEEKLY';
                  reason = "Weekly Trend Continuation";
              } else if (tech.rsi < 35) {
                  timeframe = 'MONTHLY';
                  reason = "Value Buy: Oversold Monthly Support";
              }

              return {
                  symbol,
                  name: symbol.split('.')[0],
                  price: data.price,
                  score: score,
                  signals: tech.activeSignals,
                  atr: tech.atr,
                  timeframe,
                  reason
              };
          }
      } catch (e) { }
      return null;
  });

  return (rawTechnicalResults as any[]).map(item => {
      const isTopPick = item.score > 80;
      return {
          symbol: item.symbol,
          name: item.name,
          type: 'STOCK',
          sector: 'Equity',
          currentPrice: item.price,
          reason: item.reason,
          riskLevel: item.score > 85 ? 'Low' : item.score > 65 ? 'Medium' : 'High',
          targetPrice: item.price * (1 + (item.atr / item.price) * (item.timeframe === 'WEEKLY' ? 5 : 3)),
          timeframe: item.timeframe,
          score: item.score,
          lotSize: 1,
          isTopPick: isTopPick,
          sourceUrl: `https://query1.finance.yahoo.com/v8/finance/chart/${item.symbol}`
      } as StockRecommendation;
  }).sort((a, b) => (b.score || 0) - (a.score || 0));
};
