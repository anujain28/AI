
import { StockRecommendation, AppSettings, StockData } from "../types";
import { fetchRealStockData } from "./marketDataService";
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Concurrency limited promise pool
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
            results.push(res);
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

export const runTechnicalScan = async (
    stockUniverse: string[], 
    settings: AppSettings
): Promise<StockRecommendation[]> => {
  
  // Limit universe to scan to keep performance snappy, but prioritize BSE and Banks
  const prioritizedSymbols = stockUniverse.filter(s => s.startsWith('BSE') || s.includes('BANK'));
  const others = stockUniverse.filter(s => !prioritizedSymbols.includes(s));
  
  // Total 50 stocks per scan cycle for optimal balance of coverage and speed
  const symbolsToScan = [
    ...prioritizedSymbols,
    ...others.sort(() => 0.5 - Math.random()).slice(0, Math.max(0, 50 - prioritizedSymbols.length))
  ];

  // Increase concurrency to 12 for modern browsers/networks
  const batchResults = await promisePool(symbolsToScan, 12, async (symbol) => {
      const recommendations: StockRecommendation[] = [];
      
      try {
          // Optimization: Fetch Intraday first, then others in parallel
          // This ensures if the primary momentum scan fails, we don't block.
          const btstDataPromise = fetchRealStockData(symbol, settings, "15m", "2d");
          const weeklyDataPromise = fetchRealStockData(symbol, settings, "1d", "1mo");
          const monthlyDataPromise = fetchRealStockData(symbol, settings, "1wk", "6mo");

          const [btstData, weeklyData, monthlyData] = await Promise.all([
              btstDataPromise,
              weeklyDataPromise,
              monthlyDataPromise
          ]);

          if (btstData && btstData.technicals.score >= 70) {
              recommendations.push({
                  symbol,
                  name: symbol.split('.')[0],
                  type: 'STOCK',
                  sector: 'Equity',
                  currentPrice: btstData.price,
                  reason: "High Momentum Pattern | " + btstData.technicals.activeSignals.slice(0, 2).join(", "),
                  riskLevel: btstData.technicals.score > 85 ? 'Low' : 'Medium',
                  targetPrice: btstData.price + (btstData.technicals.atr * 2.5),
                  timeframe: 'BTST',
                  score: btstData.technicals.score,
                  lotSize: 1,
                  isTopPick: btstData.technicals.score >= 85
              });
          }

          if (weeklyData && weeklyData.technicals.score >= 70) {
              recommendations.push({
                  symbol,
                  name: symbol.split('.')[0],
                  type: 'STOCK',
                  sector: 'Equity',
                  currentPrice: weeklyData.price,
                  reason: "Swing Breakout Potential",
                  riskLevel: weeklyData.technicals.score > 80 ? 'Low' : 'Medium',
                  targetPrice: weeklyData.price + (weeklyData.technicals.atr * 4.0),
                  timeframe: 'WEEKLY',
                  score: weeklyData.technicals.score,
                  lotSize: 1,
                  isTopPick: weeklyData.technicals.score >= 82
              });
          }

          if (monthlyData && monthlyData.technicals.score >= 70) {
              recommendations.push({
                  symbol,
                  name: symbol.split('.')[0],
                  type: 'STOCK',
                  sector: 'Equity',
                  currentPrice: monthlyData.price,
                  reason: "Monthly Trend Accumulation",
                  riskLevel: monthlyData.technicals.score > 75 ? 'Low' : 'Medium',
                  targetPrice: monthlyData.price + (monthlyData.technicals.atr * 10.0),
                  timeframe: 'MONTHLY',
                  score: monthlyData.technicals.score,
                  lotSize: 1,
                  isTopPick: monthlyData.technicals.score >= 78
              });
          }
      } catch (e) {
          // Silent fail for individual symbol errors
      }
      return recommendations;
  });

  const flatResults = batchResults.flat();
  return flatResults.sort((a, b) => (b.score || 0) - (a.score || 0));
};

/**
 * GEMINI AI Selection for TOP 10 INTRADAY PICKS
 * Analyzes market snapshot to find high-probability scalps.
 */
export const runIntradayAiAnalysis = async (
    recommendations: StockRecommendation[],
    marketData: Record<string, StockData>
): Promise<string[]> => {
    // Collect data for the AI to process
    const snapshot = recommendations
        .filter(r => marketData[r.symbol])
        .slice(0, 30) // Best 30 candidates
        .map(r => {
            const d = marketData[r.symbol];
            return {
                symbol: r.symbol,
                price: d.price,
                change: d.changePercent.toFixed(2) + "%",
                score: d.technicals.score,
                signals: d.technicals.activeSignals.join(', '),
                timeframe: r.timeframe
            };
        });

    if (snapshot.length < 5) return [];

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `As a top-tier quantitative day trader, analyze this market snapshot of 30 high-momentum stocks. 
            Select exactly the TOP 10 symbols that show the strongest potential for immediate INTRADAY continuation. 
            Prioritize 'Volume Bursts' and 'Price Velocity' patterns.
            Snapshot: ${JSON.stringify(snapshot)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        top10Symbols: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["top10Symbols"]
                }
            }
        });

        const data = JSON.parse(response.text || '{"top10Symbols": []}');
        return data.top10Symbols || [];
    } catch (e) {
        console.error("AI Intraday Analysis failed", e);
        return recommendations.slice(0, 10).map(r => r.symbol);
    }
};
