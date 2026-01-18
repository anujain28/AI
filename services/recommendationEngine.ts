import { StockRecommendation, AppSettings, StockData } from "../types";
import { fetchRealStockData } from "./marketDataService";
import { getMarketStatus } from "./marketStatusService";
import { GoogleGenAI, Type } from "@google/genai";

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

/**
 * AI Robot Recommendation Engine.
 * Scans the market and uses Gemini 3 Flash to select the 'Best 5' high-conviction picks.
 */
export const runTechnicalScan = async (
    stockUniverse: string[], 
    settings: AppSettings
): Promise<StockRecommendation[]> => {
  
  const marketStatus = getMarketStatus('STOCK');
  const isWeekend = !marketStatus.isOpen && marketStatus.message.includes('Weekend');

  // Filter for liquid high-momentum targets
  const scanTargets = stockUniverse.filter(s => 
    s.startsWith('BSE') || 
    ['RELIANCE.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'TCS.NS', 'INFY.NS', 'SBIN.NS', 'AXISBANK.NS', 'BHARTIARTL.NS', 'TRENT.NS', 'ZOMATO.NS', 'TATASTEEL.NS', 'MARUTI.NS', 'BAJFINANCE.NS'].includes(s)
  ).slice(0, 50);

  const rawTechnicalResults = await promisePool(scanTargets, 10, async (symbol) => {
      try {
          const interval = isWeekend ? "1d" : "15m";
          const range = isWeekend ? "1mo" : "2d";
          const marketData = await fetchRealStockData(symbol, settings, interval, range);

          if (marketData) {
              const tech = marketData.technicals;
              return {
                  symbol,
                  name: symbol.split('.')[0],
                  currentPrice: marketData.price,
                  score: tech.score,
                  rsi: tech.rsi,
                  adx: tech.adx,
                  atr: tech.atr,
                  signals: tech.activeSignals
              };
          }
      } catch (e) { }
      return null;
  });

  const validData = rawTechnicalResults.filter(r => r !== null) as any[];
  
  // Sort by technical score to find candidates for the AI review
  const topCandidates = validData.sort((a, b) => b.score - a.score).slice(0, 15);

  let best5Symbols: string[] = topCandidates.slice(0, 5).map(t => t.symbol);

  // Use Gemini to act as the "AI Robot" selecting the 5 highest probability winners
  try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Act as the "AI Robot" from the airobots portfolio engine. Review these 15 high-momentum technical stock candidates and select exactly 5 "Alpha Picks" that have the most explosive breakout potential for today/tomorrow. 
          Respond with ONLY a JSON array of the 5 symbols.
          Data: ${JSON.stringify(topCandidates)}`,
          config: {
              responseMimeType: 'application/json',
              responseSchema: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
              }
          }
      });
      const parsed = JSON.parse(response.text || "[]");
      if (Array.isArray(parsed) && parsed.length >= 3) {
          best5Symbols = parsed.slice(0, 5);
      }
  } catch (err) {
      console.warn("AI Picking failed, falling back to technical score", err);
  }

  const finalRecommendations: StockRecommendation[] = validData.map(item => {
      const isTopPick = best5Symbols.includes(item.symbol);
      return {
          symbol: item.symbol,
          name: item.name,
          type: 'STOCK',
          sector: 'Equity',
          currentPrice: item.currentPrice,
          reason: isTopPick ? "AI Robot Alpha Signal: High-Conviction Momentum" : (item.signals[0] || "Trend Following"),
          riskLevel: item.score > 80 ? 'Low' : item.score > 55 ? 'Medium' : 'High',
          targetPrice: item.currentPrice * (1 + (item.atr / item.currentPrice) * 3),
          timeframe: isWeekend ? 'WEEKLY' : 'BTST',
          score: item.score,
          lotSize: 1,
          isTopPick: isTopPick,
          sourceUrl: "https://airobots.streamlit.app/"
      };
  });

  return finalRecommendations.sort((a, b) => {
      if (a.isTopPick && !b.isTopPick) return -1;
      if (!a.isTopPick && b.isTopPick) return 1;
      return (b.score || 0) - (a.score || 0);
  });
};
