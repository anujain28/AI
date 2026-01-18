
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
 * Broker Intel Service
 * Fetches institutional recommendations from major Indian brokers using Gemini Search Grounding.
 * Uses a faster model and parallelized enrichment to solve latency issues.
 */
export const fetchBrokerIntel = async (settings: AppSettings): Promise<StockRecommendation[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Search for the LATEST (Today or this Week) stock recommendations (BTST, Weekly, and Monthly) from these specific Indian financial platforms:
    - Angel One (Daily ARQ tips)
    - 5paisa (Daily alerts)
    - Sharekhan (Intraday tips)
    - Kotak Securities (Daily picks)
    - HDFC Securities (Stock ideas)
    - Zerodha (Weekly analysis)
    - Groww (Market blogs)

    Find at least 12-15 specific stocks. 
    IMPORTANT: Provide the current estimated price if visible in the search results.
    Return a JSON array of objects with keys: symbol, name, timeframe (BTST/WEEKLY/MONTHLY), reason, sourceUrl, estimatedPrice.`;

  try {
    // Using gemini-3-flash-preview for much faster response times in search grounding
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
              sourceUrl: { type: Type.STRING },
              estimatedPrice: { type: Type.NUMBER }
            },
            required: ["symbol", "name", "timeframe", "reason"]
          }
        }
      }
    });

    const rawData = JSON.parse(response.text || "[]");
    if (!Array.isArray(rawData) || rawData.length === 0) return [];
    
    // Enrich data in parallel batches of 5 to avoid proxy blocking
    const enriched = await promisePool(rawData, 5, async (item: any) => {
      try {
        const ticker = item.symbol.toUpperCase().includes('.NS') ? item.symbol : `${item.symbol.toUpperCase()}.NS`;
        
        // Short-circuit fetch if it takes too long
        const mktData = await Promise.race([
            fetchRealStockData(ticker, settings, "1d", "1mo"),
            new Promise((_, reject) => setTimeout(() => reject('Timeout'), 5000))
        ]) as any;
        
        const price = mktData?.price || item.estimatedPrice || 100;

        return {
          ...item,
          symbol: ticker,
          type: 'STOCK',
          currentPrice: price,
          score: mktData?.technicals.score || 70,
          targetPrice: price * (item.timeframe === 'MONTHLY' ? 1.15 : 1.05),
          riskLevel: 'Medium',
          lotSize: 1,
          isTopPick: mktData?.technicals.score ? mktData.technicals.score > 80 : false
        } as StockRecommendation;
      } catch (err) {
        // Fallback for failed enrichment
        const price = item.estimatedPrice || 0;
        if (price === 0) return null; // Skip if no price data at all
        
        return {
          ...item,
          symbol: item.symbol,
          type: 'STOCK',
          currentPrice: price,
          score: 65,
          targetPrice: price * 1.05,
          riskLevel: 'Medium',
          lotSize: 1,
          isTopPick: false
        } as StockRecommendation;
      }
    });

    return enriched.filter((r): r is StockRecommendation => r !== null && r.currentPrice > 0);
  } catch (error) {
    console.error("Broker Intel Fetch Failed:", error);
    return [];
  }
};
