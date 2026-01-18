
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
 * by analyzing trends from ai-robots (Streamlit), Trendlyne, and Screener.
 */
export const runTechnicalScan = async (
    stockUniverse: string[], 
    settings: AppSettings
): Promise<StockRecommendation[]> => {
  
  const marketStatus = getMarketStatus('STOCK');
  const isWeekend = !marketStatus.isOpen && marketStatus.message.includes('Weekend');

  // Liquid high-momentum targets for scanning (Increased depth for weekends)
  const scanDepth = isWeekend ? 80 : 60;
  const scanTargets = stockUniverse.filter(s => 
    s.startsWith('BSE') || 
    ['RELIANCE.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'TCS.NS', 'INFY.NS', 'SBIN.NS', 'AXISBANK.NS', 'BHARTIARTL.NS', 'TRENT.NS', 'ZOMATO.NS', 'TATASTEEL.NS', 'MARUTI.NS', 'BAJFINANCE.NS'].includes(s)
  ).slice(0, scanDepth);

  const rawTechnicalResults = await promisePool(scanTargets, 15, async (symbol) => {
      try {
          // Weekend Explorer Mode: Analyzes daily trends for weekly swing targets
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
  const topCandidates = validData.sort((a, b) => b.score - a.score).slice(0, 25);

  let best5Symbols: string[] = topCandidates.slice(0, 5).map(t => t.symbol);

  // Initialize AI Robot persona
  try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = isWeekend 
        ? `You are the "Weekend AI Robot Explorer". Your goal is to replicate the high-conviction momentum picks from 'airobots.streamlit.app' and 'Trendlyne Alpha'. 
           Review these 25 candidates and select exactly 5 "Alpha Weekly Picks" for the Monday open. 
           Prioritize stocks with clear weekly breakouts, increasing volume trends, and RSI staying above 60.
           Return a JSON array of the top 5 symbols ONLY.
           Candidates Data: ${JSON.stringify(topCandidates)}`
        : `You are the "AI Robot Alpha Scanner". Your methodology matches the Streamlit AI Robot scanner. Select exactly 5 "Intraday Alpha Picks" for maximum scalping velocity.
           Return a JSON array of symbols.
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
      console.warn("Robot picking logic bypassed, using technical score fallback", err);
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
            ? (isWeekend ? "Weekend Robot Pick: Replicating ai-robots Strategy" : "Robot Signal: High-Intensity Alpha Velocity") 
            : (item.signals[0] || "Trend Follower"),
          riskLevel: item.score > 85 ? 'Low' : item.score > 60 ? 'Medium' : 'High',
          targetPrice: item.currentPrice * (1 + (item.atr / item.currentPrice) * (isWeekend ? 5.5 : 2.5)),
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
