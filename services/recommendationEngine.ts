
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
 * EXACT SCORING LOGIC FROM STREAMLIT PYTHON REF:
 * RSI < 30 (35), MACD (30), Stoch < 20 (25), ADX > 25 (30), BB (25), Vol > 1.5x (30), EMA (28)
 */
const calculatePythonScore = (tech: any): number => {
    let score = 0;
    
    // RSI: Oversold (35) or Strong Buy Zone (25)
    if (tech.rsi < 30) score += 35;
    else if (tech.rsi < 40) score += 25;

    // MACD: Bullish Crossover (30)
    if (tech.macd.histogram > 0 && tech.macd.macd > tech.macd.signal) score += 30;

    // Stochastic: Oversold Reversal (25)
    if (tech.stoch.k < 20 && tech.stoch.k > tech.stoch.d) score += 25;

    // ADX: Strong Trend (30)
    if (tech.adx > 25 && tech.supertrend.trend === 'BUY') score += 30;

    // Bollinger: Squeeze/Breakout (25)
    if (tech.bollinger.percentB > 0.8 || tech.bollinger.percentB < 0.2) score += 25;

    // Volume Spike (30)
    if (tech.rvol > 1.5) score += 30;

    // EMA Crossover (28)
    if (tech.ema.ema9 > tech.ema.ema21) score += 28;

    return score;
};

export const runTechnicalScan = async (
    unusedUniverse: string[], 
    settings: AppSettings
): Promise<StockRecommendation[]> => {
  
  // TIERED SCAN: Top 40 for High-Alpha Intraday/BTST, rest for Swing
  const allSymbols = getFullUniverse();
  const highAlphaTargets = allSymbols.slice(0, 45); 
  
  const tfConfigs = {
      'INTRADAY': { interval: '15m', range: '5d', minScore: 60 },
      'BTST': { interval: '15m', range: '10d', minScore: 70 },
      'WEEKLY': { interval: '1d', range: '3mo', minScore: 60 },
      'MONTHLY': { interval: '1d', range: '1y', minScore: 80 }
  };

  const results: StockRecommendation[] = [];

  // CONCURRENCY: 30 parallel requests for maximum speed
  await promisePool(highAlphaTargets, 30, async (symbol) => {
      try {
          // Pass 1: Intraday/BTST (15m data)
          const data15m = await fetchRealStockData(symbol, settings, "15m", "5d");
          if (data15m) {
              const score = calculatePythonScore(data15m.technicals);
              if (score >= 60) {
                  results.push(mapToRec(symbol, data15m, score, score > 85 ? 'INTRADAY' : 'BTST'));
              }
          }

          // Pass 2: Weekly/Monthly (1d data) - Parallel fetch
          const data1d = await fetchRealStockData(symbol, settings, "1d", "1y");
          if (data1d) {
              const score = calculatePythonScore(data1d.technicals);
              if (score >= 60) {
                  results.push(mapToRec(symbol, data1d, score, score > 80 ? 'MONTHLY' : 'WEEKLY'));
              }
          }
      } catch (e) { }
  });

  // Sort by highest conviction
  return results.sort((a, b) => (b.score || 0) - (a.score || 0));
};

function mapToRec(symbol: string, data: any, score: number, tf: any): StockRecommendation {
    const tech = data.technicals;
    return {
        symbol: symbol,
        name: symbol.split('.')[0],
        type: 'STOCK',
        sector: 'Equity',
        currentPrice: data.price,
        reason: tech.activeSignals[0] || "Momentum Confluence",
        riskLevel: score > 120 ? 'Low' : score > 80 ? 'Medium' : 'High',
        targetPrice: data.price * (1 + (tech.atr / data.price) * 3),
        timeframe: tf,
        score: score,
        lotSize: 1,
        isTopPick: score >= 100,
        sourceUrl: `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`
    };
}
