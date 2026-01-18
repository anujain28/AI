
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
 * Signals are additive. Target conviction scores: 100+
 */
export const performRobotAnalysis = (tech: TechnicalSignals, price: number) => {
    let score = 0;
    const logicFlags: string[] = [];

    // Trend Foundation (Strongest Weight)
    if (tech.ema.ema9 > tech.ema.ema21) {
        score += 40;
        logicFlags.push("EMA Golden Cross (9/21)");
    }
    if (price > tech.ema.ema9) score += 10;
    
    // Momentum Pulse
    if (tech.macd.histogram > 0) {
        score += 30;
        logicFlags.push("MACD Bullish Trend");
    }
    if (tech.rsi > 55 && tech.rsi < 75) {
        score += 20;
        logicFlags.push(`RSI Momentum (${tech.rsi.toFixed(0)})`);
    }
    
    // Volatility/Trend Strength
    if (tech.adx > 22) {
        score += 25;
        logicFlags.push("Trend Strength (ADX) High");
    }

    // Chart Patterns
    const bbWidth = (tech.bollinger.upper - tech.bollinger.lower) / tech.bollinger.middle;
    if (bbWidth < 0.02) {
        score += 30;
        logicFlags.push("BB Squeeze Setup");
    } else if (tech.bollinger.percentB > 0.9) {
        score += 20;
        logicFlags.push("Bollinger Band Breakout");
    }

    // Volume Confirmation
    if (tech.rvol > 1.5) {
        score += 25;
        logicFlags.push(`Rel Vol Spike: ${tech.rvol.toFixed(1)}x`);
    }

    return { score, reason: logicFlags.join(" | ") };
};

export const runTechnicalScan = async (
    unusedUniverse: string[], 
    settings: AppSettings,
    onProgress?: (percent: number) => void
): Promise<StockRecommendation[]> => {
  
  const allSymbols = getFullUniverse();
  // Deep scan 150 stocks to find high-volatility movers that pass the 1% profit filter
  const scanTargets = allSymbols.slice(0, 150); 
  const results: StockRecommendation[] = [];

  await promisePool(scanTargets, 12, async (symbol) => {
      try {
          const data = await fetchRealStockData(symbol, settings, "15m", "5d");
          if (!data) return;

          const analysis = performRobotAnalysis(data.technicals, data.price);
          
          // Target = CMP + (ATR * 3.5) for high-conviction scalps
          const atr = data.technicals.atr || (data.price * 0.012);
          const targetPrice = data.price + (atr * 3.5);
          const profitValue = targetPrice - data.price;
          const profitPercent = (profitValue / data.price) * 100;

          // HARD FILTER: Profit % >= 1.0% (Reduced from 2% to broaden selection)
          // MIN SCORE: 40+ to ensure we get a decent list of "Ideas"
          if (profitPercent >= 1.0 && analysis.score >= 40) {
              let timeframe: 'INTRADAY' | 'BTST' | 'WEEKLY' | 'MONTHLY' = 'BTST';
              if (data.technicals.rvol > 2.5) timeframe = 'INTRADAY';
              else if (analysis.score > 120) timeframe = 'WEEKLY';

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
                  timeframe,
                  score: analysis.score,
                  lotSize: 1,
                  isTopPick: analysis.score >= 95,
                  sourceUrl: `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`
              });
          }
      } catch (e) {
          // Silent catch for individual stock fetch errors
      }
  }, onProgress);

  // Return top 20 picks that meet the 1% ROI hurdle
  return results.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 20);
};
