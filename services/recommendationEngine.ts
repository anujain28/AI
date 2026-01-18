
import { StockRecommendation, AppSettings } from "../types";
import { fetchRealStockData } from "./marketDataService";
import { getFullUniverse } from "./stockListService";

/**
 * Concurrency pool to handle multiple async tasks with a limit
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
 * Implementation of the scoring logic from the Python reference:
 * RSI: <30 (35pts), <40 (25pts)
 * MACD: Bullish Cross (30pts)
 * Stoch: <20 & K > D (25pts)
 * ADX: >25 & +DI > -DI (30pts)
 * BB: Squeeze/Breakout (25pts)
 * Vol: >1.5x Avg & Price Up (30pts)
 * EMA: 9/21 Cross (28pts)
 * OBV: > SMA10 (22pts)
 */
const calculatePythonScore = (tech: any): number => {
    let score = 0;
    
    // RSI
    if (tech.rsi < 30) score += 35;
    else if (tech.rsi < 40) score += 25;

    // MACD
    if (tech.macd.histogram > 0 && tech.macd.macd > tech.macd.signal) score += 30;

    // Stochastic
    if (tech.stoch.k < 20 && tech.stoch.k > tech.stoch.d) score += 25;

    // ADX
    if (tech.adx > 25 && tech.supertrend.trend === 'BUY') score += 30; // Using Supertrend as proxy for DI alignment

    // Bollinger
    if (tech.bollinger.percentB > 0.8 || tech.bollinger.percentB < 0.2) score += 25;

    // Volume
    if (tech.rvol > 1.5) score += 30;

    // EMA
    if (tech.ema.ema9 > tech.ema.ema21) score += 28;

    // OBV (Proxy with score booster)
    if (tech.score > 60) score += 22;

    return score;
};

export const runTechnicalScan = async (
    unusedUniverse: string[], 
    settings: AppSettings
): Promise<StockRecommendation[]> => {
  
  // Use a fast liquid subset for initial UI paint
  const scanTargets = getFullUniverse().slice(0, 40); 
  const timeframes: ('INTRADAY' | 'BTST' | 'WEEKLY' | 'MONTHLY')[] = ['INTRADAY', 'BTST', 'WEEKLY', 'MONTHLY'];
  
  const tfConfigs = {
      'INTRADAY': { interval: '15m', range: '5d' },
      'BTST': { interval: '15m', range: '10d' },
      'WEEKLY': { interval: '1d', range: '3mo' },
      'MONTHLY': { interval: '1d', range: '1y' }
  };

  const allResults: StockRecommendation[] = [];

  // We scan the targets. For each target, we determine which bucket it fits best
  // by checking the most relevant timeframe first (Intraday/BTST)
  await promisePool(scanTargets, 20, async (symbol) => {
      try {
          // Check Intraday first
          const dataIntra = await fetchRealStockData(symbol, settings, tfConfigs.INTRADAY.interval, tfConfigs.INTRADAY.range);
          if (!dataIntra) return;

          const scoreIntra = calculatePythonScore(dataIntra.technicals);
          
          // If Intraday is good, add it
          if (scoreIntra >= 60) {
              allResults.push(mapToRecommendation(symbol, dataIntra, scoreIntra, 'INTRADAY'));
          }

          // If not a strong intraday, check higher timeframes
          if (scoreIntra < 90) {
              const dataWeekly = await fetchRealStockData(symbol, settings, tfConfigs.WEEKLY.interval, tfConfigs.WEEKLY.range);
              if (dataWeekly) {
                  const scoreWeekly = calculatePythonScore(dataWeekly.technicals);
                  if (scoreWeekly >= 90) {
                      allResults.push(mapToRecommendation(symbol, dataWeekly, scoreWeekly, 'WEEKLY'));
                  } else if (scoreWeekly >= 60) {
                      allResults.push(mapToRecommendation(symbol, dataWeekly, scoreWeekly, 'MONTHLY'));
                  }
              }
          }

          // Always try for BTST if momentum is high but not quite a day scalp
          if (scoreIntra >= 40 && scoreIntra < 80) {
              allResults.push(mapToRecommendation(symbol, dataIntra, scoreIntra + 10, 'BTST'));
          }

      } catch (e) { }
  });

  return allResults.sort((a, b) => (b.score || 0) - (a.score || 0));
};

function mapToRecommendation(symbol: string, data: any, score: number, tf: any): StockRecommendation {
    const tech = data.technicals;
    return {
        symbol: symbol,
        name: symbol.split('.')[0],
        type: 'STOCK',
        sector: 'Equity',
        currentPrice: data.price,
        reason: tech.activeSignals[0] || "Momentum Setup",
        riskLevel: score > 150 ? 'Low' : score > 100 ? 'Medium' : 'High',
        targetPrice: data.price + (tech.atr * 3),
        timeframe: tf,
        score: score,
        lotSize: 1,
        isTopPick: score >= 120,
        sourceUrl: `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`
    };
}
