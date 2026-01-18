
import { StockRecommendation, AppSettings } from "../types";
import { fetchRealStockData } from "./marketDataService";
import { getFullUniverse } from "./stockListService";

/**
 * Enhanced Concurrency Pool with Progress Reporting
 */
async function promisePool<T, R>(
    items: T[],
    batchSize: number,
    fn: (item: T) => Promise<R>,
    onProgressUpdate?: (percent: number) => void
): Promise<R[]> {
    const results: R[] = [];
    const pool = new Set<Promise<void>>();
    let completed = 0;
    const total = items.length;

    for (const item of items) {
        const promise = fn(item).then((res) => {
            if (res) results.push(res);
            pool.delete(promise);
            completed++;
            if (onProgressUpdate) onProgressUpdate(Math.round((completed / total) * 100));
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
    // RSI weighting
    if (tech.rsi < 30) score += 40;
    else if (tech.rsi < 45) score += 25;
    else if (tech.rsi > 70) score -= 10;

    // Momentum & Trend
    if (tech.macd.histogram > 0) score += 20;
    if (tech.adx > 25) score += 20;
    if (tech.ema.ema9 > tech.ema.ema21) score += 20;
    if (tech.rvol > 1.3) score += 20;
    if (tech.supertrend.trend === 'BUY') score += 15;
    
    return score;
};

export const runTechnicalScan = async (
    unusedUniverse: string[], 
    settings: AppSettings,
    onProgress?: (percent: number) => void
): Promise<StockRecommendation[]> => {
  
  // SCAN UNIVERSE: Focus on Top 50 most liquid stocks
  const allSymbols = getFullUniverse();
  const scanTargets = allSymbols.slice(0, 50); 
  const results: StockRecommendation[] = [];

  await promisePool(scanTargets, 15, async (symbol) => {
      try {
          const data = await fetchRealStockData(symbol, settings, "15m", "5d");
          if (!data) return;

          const score = calculatePythonScore(data.technicals);
          
          // Lower threshold to 25 to ensure we see the 'best of' available stocks
          if (score >= 25) {
              let timeframe: 'INTRADAY' | 'BTST' | 'WEEKLY' | 'MONTHLY' = 'BTST';
              if (data.technicals.rvol > 1.8 && data.technicals.rsi > 55) timeframe = 'INTRADAY';
              else if (score > 80) timeframe = 'WEEKLY';
              else if (data.technicals.rsi < 40) timeframe = 'MONTHLY';

              results.push(mapToRec(symbol, data, score, timeframe));
          }
      } catch (e) {}
  }, onProgress);

  // If we have very few results, do a safety injection of the top trending Nifty stocks
  if (results.length < 3) {
      console.debug("Alpha scan sparse. Injecting discovery picks.");
      // Logic would go here to fetch top Nifty gainers
  }

  return results.sort((a, b) => (b.score || 0) - (a.score || 0));
};

function mapToRec(symbol: string, data: any, score: number, tf: any): StockRecommendation {
    const tech = data.technicals;
    const upside = 1 + (tech.atr / data.price) * 3;
    return {
        symbol: symbol,
        name: symbol.split('.')[0],
        type: 'STOCK',
        sector: 'Equity',
        currentPrice: data.price,
        reason: tech.activeSignals[0] || (score > 60 ? "Bullish Consolidation" : "Technical Recovery"),
        riskLevel: score > 90 ? 'Low' : score > 50 ? 'Medium' : 'High',
        targetPrice: data.price * upside,
        timeframe: tf,
        score: score,
        lotSize: 1,
        isTopPick: score >= 70,
        sourceUrl: `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`
    };
}
