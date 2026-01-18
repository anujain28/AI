
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

/**
 * Scoring Logic inspired by high-conviction momentum bots.
 * Focuses on EMA Stack, Supertrend, and Volume Pulse.
 */
const calculateAlphaScore = (tech: any): number => {
    let score = 0;
    
    // 1. Trend Foundation (EMA Stack)
    if (tech.ema.ema9 > tech.ema.ema21) score += 25;
    
    // 2. Momentum Strength (RSI)
    if (tech.rsi > 50 && tech.rsi < 70) score += 20; // Sweet spot
    else if (tech.rsi > 40 && tech.rsi <= 50) score += 10;
    
    // 3. Volatility/Trend Confirmation
    if (tech.supertrend.trend === 'BUY') score += 20;
    if (tech.adx > 25) score += 15;
    
    // 4. Volume/Energy
    if (tech.rvol > 1.2) score += 10;
    if (tech.rvol > 2.0) score += 10;
    
    // 5. Indicators
    if (tech.macd.histogram > 0) score += 10;
    
    return score;
};

export const runTechnicalScan = async (
    unusedUniverse: string[], 
    settings: AppSettings,
    onProgress?: (percent: number) => void
): Promise<StockRecommendation[]> => {
  
  // SCAN UNIVERSE: We'll scan the top 40 most liquid for speed
  const allSymbols = getFullUniverse();
  const scanTargets = allSymbols.slice(0, 40); 
  const results: StockRecommendation[] = [];

  // Higher concurrency (25) for faster scans
  await promisePool(scanTargets, 25, async (symbol) => {
      try {
          // Use 15m/5d as it's the most reliable for capturing intraday and swing signals
          const data = await fetchRealStockData(symbol, settings, "15m", "5d");
          if (!data) return;

          const score = calculateAlphaScore(data.technicals);
          
          // Permissive threshold (30) ensures we always have ideas displayed
          if (score >= 30) {
              let timeframe: 'INTRADAY' | 'BTST' | 'WEEKLY' | 'MONTHLY' = 'BTST';
              
              // Categorization Logic
              if (data.technicals.rvol > 1.8 && data.technicals.rsi > 60) {
                  timeframe = 'INTRADAY';
              } else if (score > 75) {
                  timeframe = 'WEEKLY';
              } else if (data.technicals.rsi < 45) {
                  timeframe = 'MONTHLY'; // Value/Oversold plays
              }

              results.push(mapToRec(symbol, data, score, timeframe));
          }
      } catch (e) {
          console.debug(`Scan skip: ${symbol}`, e);
      }
  }, onProgress);

  // Return best results sorted by score
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
        reason: tech.activeSignals[0] || (score > 60 ? "Bullish Momentum" : "Consolidation Breakout"),
        riskLevel: score > 80 ? 'Low' : score > 50 ? 'Medium' : 'High',
        targetPrice: data.price * upside,
        timeframe: tf,
        score: score,
        lotSize: 1,
        isTopPick: score >= 70,
        sourceUrl: `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`
    };
}
