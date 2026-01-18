
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
 * Simulates high-conviction picks from airobots.streamlit.app methodology.
 */
export const runTechnicalScan = async (
    stockUniverse: string[], 
    settings: AppSettings
): Promise<StockRecommendation[]> => {
  
  const marketStatus = getMarketStatus('STOCK');
  const isWeekend = !marketStatus.isOpen && marketStatus.message.includes('Weekend');

  // Focus on liquid alpha targets for deep technical scanning
  const scanTargets = stockUniverse.filter(s => 
    s.startsWith('BSE') || 
    ['RELIANCE.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'TCS.NS', 'INFY.NS', 'SBIN.NS', 'AXISBANK.NS', 'BHARTIARTL.NS', 'TRENT.NS', 'ZOMATO.NS', 'TATASTEEL.NS', 'MARUTI.NS', 'BAJFINANCE.NS'].includes(s)
  ).slice(0, isWeekend ? 80 : 50);

  const rawTechnicalResults = await promisePool(scanTargets, 12, async (symbol) => {
      try {
          // Weekend Explorer Mode uses daily trends for weekly swing targets
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
  const topCandidates = validData.sort((a, b) => b.score - a.score).slice(0, 20);

  let best5Symbols: string[] = topCandidates.slice(0, 5).map(t => t.symbol);

  // Use Gemini to act as the "AI Robot Explorer" and refine the Best 5 list
  try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = isWeekend 
        ? `Act as the "Weekend AI Robot Explorer" inspired by airobots.streamlit.app. 
           Review these 20 high-potential technical stocks and select exactly 5 "High-Conviction Best 5" picks for the next week.
           Prioritize stocks with weekly breakouts, rising volume, and strong RSI (60+).
           Return ONLY a JSON array of the top 5 symbols.
           Candidates Data: ${JSON.stringify(topCandidates)}`
        : `Act as the "AI Robot Momentum Scanner". Review these 20 technical candidates and select the 5 most explosive intraday alpha picks.
           Your methodology should match the high-conviction screening of airobots.streamlit.app.
           Return ONLY a JSON array of 5 symbols.
           Candidates Data: ${JSON.stringify(topCandidates)}`;

      const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
              responseMimeType: "application/json",
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
      console.warn("AI Picking logic failed, falling back to pure technical rank", err);
  }

  const finalRecommendations: StockRecommendation[] = validData.map(item => {
      const isTopPick = best5Symbols.includes(item.symbol);
      return {
          symbol: item.symbol,
          name: item.name,
          type: 'STOCK',
          sector: 'Equity',
          currentPrice: item.currentPrice,
          reason: isTopPick 
            ? (isWeekend ? "AI Robot: Top 5 Weekly Swing Pick" : "AI Robot: Top 5 Intraday Alpha") 
            : (item.signals[0] || "Bullish Momentum Confirmed"),
          riskLevel: item.score > 85 ? 'Low' : item.score > 60 ? 'Medium' : 'High',
          targetPrice: item.currentPrice * (1 + (item.atr / item.currentPrice) * (isWeekend ? 4 : 2.5)),
          timeframe: isWeekend ? 'WEEKLY' : 'INTRADAY',
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
