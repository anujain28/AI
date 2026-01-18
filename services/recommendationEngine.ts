
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
 * Technical Recommendation Engine (Non-AI Version)
 * Performs a deep technical scan on the full NSE universe using local logic.
 */
export const runTechnicalScan = async (
    stockUniverse: string[], 
    settings: AppSettings
): Promise<StockRecommendation[]> => {
  
  const marketStatus = getMarketStatus('STOCK');
  const isWeekend = !marketStatus.isOpen && marketStatus.message.includes('Weekend');
  const isAfterHours = !marketStatus.isOpen && marketStatus.message.includes('After Hours');

  // PHASE: Deep Technical Scan on Real Data
  const fullUniverse = getFullUniverse();
  // Focus scan on top 100 liquid symbols for better performance
  const scanTargets = Array.from(new Set([...fullUniverse.slice(0, 100)]));

  const rawTechnicalResults = await promisePool(scanTargets, 15, async (symbol) => {
      try {
          const interval = (isWeekend || isAfterHours) ? "1d" : "15m";
          const range = (isWeekend || isAfterHours) ? "1mo" : "2d";
          const data = await fetchRealStockData(symbol, settings, interval, range);

          if (data) {
              return {
                  symbol,
                  name: symbol.split('.')[0],
                  price: data.price,
                  score: data.technicals.score,
                  signals: data.technicals.activeSignals,
                  atr: data.technicals.atr
              };
          }
      } catch (e) { }
      return null;
  });

  const validData = rawTechnicalResults as any[];
  
  const recommendations: StockRecommendation[] = validData.map(item => {
      const isTopPick = item.score > 80;
      return {
          symbol: item.symbol,
          name: item.name,
          type: 'STOCK',
          sector: 'Equity',
          currentPrice: item.price,
          reason: `Technical Alpha: ${item.signals[0] || "Bullish Setup"} verified on ${isWeekend ? 'Daily' : '15m'} timeframe.`,
          riskLevel: item.score > 80 ? 'Low' : item.score > 60 ? 'Medium' : 'High',
          targetPrice: item.price * (1 + (item.atr / item.price) * (isWeekend ? 5 : 3)),
          timeframe: (isWeekend || isAfterHours) ? 'WEEKLY' : 'INTRADAY',
          score: item.score,
          lotSize: 1,
          isTopPick: isTopPick,
          sourceUrl: `https://query1.finance.yahoo.com/v8/finance/chart/${item.symbol}`
      };
  });

  // Sort by score and return Top 20
  return recommendations.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 20);
};
