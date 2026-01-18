
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

/**
 * Lenient Scoring Logic (Based on Streamlit Ref)
 * Lowered thresholds to ensure the dashboard isn't empty in neutral markets.
 */
const calculatePythonScore = (tech: any): number => {
    let score = 0;
    
    // RSI: Dynamic Scoring
    if (tech.rsi < 30) score += 35;
    else if (tech.rsi < 40) score += 25;
    else if (tech.rsi < 60) score += 15; // Partial points for "In-Trend" RSI

    // MACD: Trend Confirmation (30)
    if (tech.macd.histogram > 0) {
        score += 20;
        if (tech.macd.macd > tech.macd.signal) score += 10;
    }

    // Stochastic: Momentum (25)
    if (tech.stoch.k < 20) score += 15;
    if (tech.stoch.k > tech.stoch.d) score += 10;

    // ADX: Trend Strength (30)
    if (tech.adx > 20) score += 15;
    if (tech.adx > 30) score += 15;

    // Bollinger & Volume (25 each)
    if (tech.bollinger.percentB > 0.7 || tech.bollinger.percentB < 0.3) score += 25;
    if (tech.rvol > 1.2) score += 20;
    if (tech.rvol > 2.0) score += 10;

    // EMA Crossover (28)
    if (tech.ema.ema9 > tech.ema.ema21) score += 28;

    return score;
};

export const runTechnicalScan = async (
    unusedUniverse: string[], 
    settings: AppSettings
): Promise<StockRecommendation[]> => {
  
  // TIERED SCAN: Increase universe to top 80 for better hit rate
  const allSymbols = getFullUniverse();
  const scanTargets = allSymbols.slice(0, 80); 
  
  const results: StockRecommendation[] = [];
  const minScoreThreshold = 35; // Lenient threshold

  // CONCURRENCY: Higher parallelism for faster first-paint
  await promisePool(scanTargets, 40, async (symbol) => {
      try {
          // Optimized: Fetch one robust dataset (15m is best for both Intraday and BTST)
          const data = await fetchRealStockData(symbol, settings, "15m", "5d");
          if (!data) return;

          const score = calculatePythonScore(data.technicals);
          
          if (score >= minScoreThreshold) {
              // Categorize based on score and technical characteristics
              let timeframe: 'INTRADAY' | 'BTST' | 'WEEKLY' | 'MONTHLY' = 'BTST';
              
              if (data.technicals.rvol > 2.0 && data.technicals.rsi > 60) {
                  timeframe = 'INTRADAY';
              } else if (score > 80) {
                  timeframe = 'WEEKLY';
              } else if (data.technicals.rsi < 40) {
                  timeframe = 'MONTHLY'; // Value/Oversold plays
              }

              results.push(mapToRec(symbol, data, score, timeframe));
          }
      } catch (e) {
          console.debug(`Scan failed for ${symbol}`, e);
      }
  });

  // Sort by score then by volume
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
        reason: tech.activeSignals[0] || (score > 50 ? "Bullish Consolidation" : "Technical Recovery"),
        riskLevel: score > 100 ? 'Low' : score > 60 ? 'Medium' : 'High',
        targetPrice: data.price * upside,
        timeframe: tf,
        score: score,
        lotSize: 1,
        isTopPick: score >= 80,
        sourceUrl: `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`
    };
}
