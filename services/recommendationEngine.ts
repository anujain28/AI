
import { StockRecommendation, AppSettings } from "../types";
import { fetchRealStockData } from "./marketDataService";
import { getFullUniverse } from "./stockListService";

/**
 * High-performance concurrency pool
 */
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

const calculatePythonScore = (tech: any): number => {
    let score = 0;
    if (tech.rsi < 30) score += 35;
    else if (tech.rsi < 45) score += 20;
    if (tech.macd.histogram > 0) score += 20;
    if (tech.macd.macd > tech.macd.signal) score += 10;
    if (tech.stoch.k < 20) score += 15;
    if (tech.adx > 20) score += 15;
    if (tech.bollinger.percentB > 0.8 || tech.bollinger.percentB < 0.2) score += 20;
    if (tech.rvol > 1.2) score += 20;
    if (tech.ema.ema9 > tech.ema.ema21) score += 25;
    return score;
};

export const runTechnicalScan = async (
    unusedUniverse: string[], 
    settings: AppSettings
): Promise<StockRecommendation[]> => {
  
  // SCAN UNIVERSE: Focus on Top 40 most liquid for guaranteed fast response
  const scanTargets = getFullUniverse().slice(0, 40); 
  const results: StockRecommendation[] = [];

  // Parallel processing
  await promisePool(scanTargets, 20, async (symbol) => {
      try {
          const data = await fetchRealStockData(symbol, settings, "15m", "5d");
          if (!data) return;

          const score = calculatePythonScore(data.technicals);
          
          // Minimum threshold 30 to ensure we have content
          if (score >= 30) {
              let timeframe: 'INTRADAY' | 'BTST' | 'WEEKLY' | 'MONTHLY' = 'BTST';
              if (data.technicals.rvol > 1.8 && data.technicals.rsi > 55) timeframe = 'INTRADAY';
              else if (score > 80) timeframe = 'WEEKLY';
              else if (data.technicals.rsi < 45) timeframe = 'MONTHLY';

              results.push(mapToRec(symbol, data, score, timeframe));
          }
      } catch (e) {}
  });

  return results.sort((a, b) => (b.score || 0) - (a.score || 0));
};

function mapToRec(symbol: string, data: any, score: number, tf: any): StockRecommendation {
    const tech = data.technicals;
    const upside = 1 + (tech.atr / data.price) * (tf === 'MONTHLY' ? 5 : 3);
    return {
        symbol: symbol,
        name: symbol.split('.')[0],
        type: 'STOCK',
        sector: 'Equity',
        currentPrice: data.price,
        reason: tech.activeSignals[0] || (score > 50 ? "Trend Following" : "Recovery Play"),
        riskLevel: score > 100 ? 'Low' : score > 60 ? 'Medium' : 'High',
        targetPrice: data.price * upside,
        timeframe: tf,
        score: score,
        lotSize: 1,
        isTopPick: score >= 75,
        sourceUrl: `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`
    };
}
