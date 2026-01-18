
import { GoogleGenAI, Type } from "@google/genai";
import { StockRecommendation, AppSettings } from "../types";
import { fetchRealStockData } from "./marketDataService";

/**
 * Concurrency-controlled promise pool to prevent proxy rate-limiting.
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
 * Broker Intel Service
 * Targets Moneycontrol, Trendlyne, and major brokers for consensus picks.
 */
export const fetchBrokerIntel = async (settings: AppSettings): Promise<StockRecommendation[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Specific query focusing on high-hit aggregators
  const prompt = `Perform a high-precision search for LATEST (February 2025) Indian stock recommendations.
    Focus exclusively on these exact sources:
    - Moneycontrol "Top Stock Picks" and "Technical Research" pages.
    - Trendlyne "Brokerage Radar" and "Stock Consensus" sections.
    - Economic Times "Buy/Sell Ideas" by top analysts.
    - Official research reports from Angel One, HDFC Securities, and Kotak Securities.

    Identify at least 15 active recommendations. 
    Strictly categorize them into timeframe: BTST (Buy Today Sell Tomorrow), WEEKLY, or MONTHLY.

    Return the data as a JSON array of objects with these keys:
    symbol (NSE Ticker without .NS), name, timeframe, reason, sourceBrand, targetPrice, estimatedPrice, sourceUrl.
    
    Ensure 'symbol' is just the base ticker like 'RELIANCE' or 'TCS'.
    The 'reason' must mention the specific expert or broker who gave the tip.`;

  try {
    // Using gemini-3-flash-preview for significantly lower latency on search tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              name: { type: Type.STRING },
              timeframe: { type: Type.STRING },
              reason: { type: Type.STRING },
              sourceBrand: { type: Type.STRING },
              targetPrice: { type: Type.NUMBER },
              estimatedPrice: { type: Type.NUMBER },
              sourceUrl: { type: Type.STRING }
            },
            required: ["symbol", "name", "timeframe", "reason", "sourceBrand"]
          }
        }
      }
    });

    const jsonText = response.text || "[]";
    let rawData = [];
    try {
        rawData = JSON.parse(jsonText);
    } catch (e) {
        const match = jsonText.match(/\[[\s\S]*\]/);
        if (match) rawData = JSON.parse(match[0]);
    }

    if (!Array.isArray(rawData) || rawData.length === 0) return [];

    // Parallel enrichment: Attempt to get live prices, but FALLBACK to AI data if proxies fail
    const enriched = await promisePool(rawData, 5, async (item: any) => {
      try {
        const baseSymbol = item.symbol.trim().toUpperCase().replace('.NS', '');
        const ticker = `${baseSymbol}.NS`;
        
        // Fast technical enrichment attempt - short timeout
        const mktData = await Promise.race([
            fetchRealStockData(ticker, settings, "1d", "1mo"),
            new Promise((_, reject) => setTimeout(() => reject('Timeout'), 2000))
        ]).catch(() => null) as any;
        
        const price = mktData?.price || item.estimatedPrice || 0;
        
        // Even if price fetch fails, we return the AI's data so the page isn't empty
        return {
          symbol: ticker,
          name: item.name || baseSymbol,
          type: 'STOCK',
          sector: 'Market Consensus',
          currentPrice: price > 0 ? price : 100, // Safety fallback price
          reason: `[${item.sourceBrand}] ${item.reason}`,
          riskLevel: 'Medium',
          targetPrice: item.targetPrice || (price > 0 ? price * 1.1 : 110),
          timeframe: item.timeframe || 'WEEKLY',
          score: mktData?.technicals.score || 65, // Neutral score if no live data
          lotSize: 1,
          isTopPick: true,
          sourceUrl: item.sourceUrl || `https://www.google.com/search?q=${encodeURIComponent(ticker + " news")}`
        } as StockRecommendation;
      } catch (err) {
        return null;
      }
    });

    return enriched.filter((r): r is StockRecommendation => r !== null);
  } catch (error) {
    console.error("Broker Intel Grounding Critical Failure:", error);
    return [];
  }
};
