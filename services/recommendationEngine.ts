
import { StockRecommendation, AppSettings, TechnicalSignals } from "../types";
import { fetchRealStockData } from "./marketDataService";
import { getFullUniverse } from "./stockListService";

/**
 * Concurrency Pool with Progress Reporting
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
 * AI Robot Additive Scoring logic.
 * Signals stack points; allowing high conviction scores over 100.
 */
const runAIBotAnalysis = (tech: TechnicalSignals, price: number) => {
    let score = 0;
    const reasons: string[] = [];

    // Trend Logic
    if (tech.ema.ema9 > tech.ema.ema21) {
        score += 35;
        reasons.push("EMA 9/21 Golden Cross");
    }
    if (price > tech.ema.ema9) score += 10;

    // Momentum Logic
    if (tech.rsi >= 50 && tech.rsi <= 70) {
        score += 25;
        reasons.push(`RSI Momentum (${tech.rsi.toFixed(0)})`);
    } else if (tech.rsi < 35) {
        score += 15;
        reasons.push("Oversold Recovery Potential");
    }

    // Indicator Logic
    if (tech.macd.histogram > 0) {
        score += 20;
        reasons.push("MACD Bullish Crossover");
    }
    if (tech.adx > 25) {
        score += 20;
        reasons.push(`Strong Uptrend (ADX: ${tech.adx.toFixed(1)})`);
    }
    if (tech.supertrend.trend === 'BUY') {
        score += 15;
        reasons.push("Supertrend Buy Confirmed");
    }
    
    // Volume Logic
    if (tech.rvol > 1.4) {
        score += 20;
        reasons.push(`High Relative Volume (${tech.rvol.toFixed(1)}x)`);
    }

    // Volatility
    if (tech.bollinger.percentB > 0.8) {
        score += 10;
        reasons.push("BB Upper Band Breakout");
    }

    return { score, reason: reasons.join(" | ") };
};

export const runTechnicalScan = async (
    unusedUniverse: string[], 
    settings: AppSettings,
    onProgress?: (percent: number) => void
): Promise<StockRecommendation[]> => {
  
  const allSymbols = getFullUniverse();
  const scanTargets = allSymbols.slice(0, 60); 
  const results: StockRecommendation[] = [];

  await promisePool(scanTargets, 25, async (symbol) => {
      try {
          const data = await fetchRealStockData(symbol, settings, "15m", "5d");
          if (!data) return;

          const analysis = runAIBotAnalysis(data.technicals, data.price);
          
          if (analysis.score >= 40) {
              let timeframe: 'INTRADAY' | 'BTST' | 'WEEKLY' | 'MONTHLY' = 'BTST';
              if (data.technicals.rvol > 2.0) timeframe = 'INTRADAY';
              else if (analysis.score > 90) timeframe = 'WEEKLY';
              else if (data.technicals.rsi < 40) timeframe = 'MONTHLY';

              const targetPrice = data.price * (1 + (data.technicals.atr / data.price) * 3);
              const profitValue = targetPrice - data.price;
              const profitPercent = (profitValue / data.price) * 100;

              results.push({
                  symbol: symbol,
                  name: symbol.split('.')[0],
                  type: 'STOCK',
                  sector: 'Equity',
                  currentPrice: data.price,
                  reason: analysis.reason,
                  riskLevel: analysis.score > 100 ? 'Low' : analysis.score > 60 ? 'Medium' : 'High',
                  targetPrice,
                  profitValue,
                  profitPercent,
                  timeframe: timeframe,
                  score: analysis.score,
                  lotSize: 1,
                  isTopPick: analysis.score >= 85,
                  sourceUrl: `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`
              });
          }
      } catch (e) {}
  }, onProgress);

  return results.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 20);
};
