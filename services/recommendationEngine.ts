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
 * Features a "Weekend Explorer" mode that simulates high-conviction picks
 * from ai-robots (Streamlit) and major global trend sources.
 */
export const runTechnicalScan = async (
    stockUniverse: string[], 
    settings: AppSettings
): Promise<StockRecommendation[]> => {
  
  const marketStatus = getMarketStatus('STOCK');
  const isWeekend = !marketStatus.isOpen && marketStatus.message.includes('Weekend');

  // Liquid high-momentum targets for scanning
  const scanTargets = stockUniverse.filter(s => 
    s.startsWith('BSE') || 
    ['RELIANCE.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'TCS.NS', 'INFY.NS', 'SBIN.NS', 'AXISBANK.NS', 'BHARTIARTL.NS', 'TRENT.NS', 'ZOMATO.NS', 'TATASTEEL.NS', 'MARUTI.NS', 'BAJFINANCE.NS'].includes(s)
  ).slice(0, 60);

  const rawTechnicalResults = await promisePool(scanTargets, 12, async (symbol) => {
      try {
          // Weekend Explorer: Uses Daily data for Weekly Swing analysis
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
  const topCandidates = validData.sort((a, b) => b.score - a.score).slice(0, 20);

  let best5Symbols: string[] = topCandidates.slice(0, 5).map(t => t.symbol);

  // Use Gemini to act as the "AI Robot Explorer"
  try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = isWeekend 
        ? `Act as the "Weekend AI Robot Explorer". Based on the airobots portfolio strategy and global market trends from sites like Trendlyne and Screener.in, identify the top 5 SWING picks for the next week from these 20 candidates. 
           Prioritize stocks with clear weekly breakouts and strong RSI support.
           Respond with ONLY a JSON array of the 5 symbols.
           Candidates: ${JSON.stringify(topCandidates)}`
        : `Act as the "AI Robot Alpha Scanner" from airobots. Review these 20 technical candidates and select exactly 5 "Alpha Robot Picks" for immediate intraday momentum. 
           Respond with ONLY a JSON array of the 5 symbols.
           Candidates: ${JSON.stringify(topCandidates)}`;

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
          reason: isTopPick 
            ? (isWeekend ? "Weekend Robot Pick: Weekly Swing Alpha" : "AI Robot Alpha: Scalping Setup") 
            : (item.signals[0] || "Trend Strength"),
          riskLevel: item.score > 85 ? 'Low' : item.score > 60 ? 'Medium' : 'High',
          targetPrice: item.currentPrice * (1 + (item.atr / item.currentPrice) * (isWeekend ? 5 : 2.5)),
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