
import { StockRecommendation, AppSettings, TechnicalSignals } from "../types";
import { fetchRealStockData } from "./marketDataService";
import { getFullUniverse } from "./stockListService";

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
 * AI Robot Intelligence Layer
 * Stacks signals to reach scores of 130+
 */
const performRobotAnalysis = (tech: TechnicalSignals, price: number) => {
    let score = 0;
    const logicFlags: string[] = [];

    // Trend Foundation
    if (tech.ema.ema9 > tech.ema.ema21) {
        score += 35;
        logicFlags.push("EMA 9/21 Golden Cross");
    }
    
    // Momentum
    if (tech.macd.histogram > 0) {
        score += 30;
        logicFlags.push("MACD Bullish Crossover");
    }
    
    // Volatility/Trend Strength
    if (tech.adx > 25) {
        score += 25;
        logicFlags.push(`Strong Uptrend (ADX: ${tech.adx.toFixed(1)})`);
    }

    // Chart Patterns
    const bbWidth = (tech.bollinger.upper - tech.bollinger.lower) / tech.bollinger.middle;
    if (bbWidth < 0.02) {
        score += 20;
        logicFlags.push("BB Squeeze Breakout Setup");
    } else if (price > tech.bollinger.upper) {
        score += 15;
        logicFlags.push("Upper Band Breakout");
    }

    // Volume Pulse
    if (tech.rvol > 1.8) {
        score += 20;
        logicFlags.push("High Relative Volume Pulse");
    }

    // Signal Synthesis
    const reason = logicFlags.join(" | ");
    return { score, reason };
};

export const runTechnicalScan = async (
    unusedUniverse: string[], 
    settings: AppSettings,
    onProgress?: (percent: number) => void
): Promise<StockRecommendation[]> => {
  
  const allSymbols = getFullUniverse();
  const scanTargets = allSymbols.slice(0, 50); // Scan top 50 for quality
  const results: StockRecommendation[] = [];

  await promisePool(scanTargets, 15, async (symbol) => {
      try {
          const data = await fetchRealStockData(symbol, settings, "15m", "5d");
          if (!data) return;

          const analysis = performRobotAnalysis(data.technicals, data.price);
          
          // Project ROI
          const atr = data.technicals.atr || (data.price * 0.015);
          const targetPrice = data.price + (atr * 3);
          const profitValue = targetPrice - data.price;
          const profitPercent = (profitValue / data.price) * 100;

          // HARD FILTER: 2% Profit Minimum + Minimum Conviction Score
          if (profitPercent >= 2.0 && analysis.score >= 50) {
              let timeframe: 'INTRADAY' | 'BTST' | 'WEEKLY' | 'MONTHLY' = 'BTST';
              if (data.technicals.rvol > 2.2) timeframe = 'INTRADAY';
              else if (analysis.score > 110) timeframe = 'WEEKLY';

              results.push({
                  symbol: symbol,
                  name: symbol.split('.')[0],
                  type: 'STOCK',
                  sector: 'Equity',
                  currentPrice: data.price,
                  reason: analysis.reason,
                  riskLevel: analysis.score > 110 ? 'Low' : 'Medium',
                  targetPrice,
                  profitValue,
                  profitPercent,
                  timeframe,
                  score: analysis.score,
                  lotSize: 1,
                  isTopPick: analysis.score >= 100,
                  sourceUrl: `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`
              });
          }
      } catch (e) {}
  }, onProgress);

  // Return best 20 sorted by score
  return results.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 20);
};
