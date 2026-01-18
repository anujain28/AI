
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
 * Specifically targets major Indian brokerages using Google Search grounding.
 */
export const fetchBrokerIntel = async (settings: AppSettings): Promise<StockRecommendation[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // High-intensity search prompt to find REAL, CURRENT recommendations
  const prompt = `Perform an exhaustive search for today's and this week's (Feb 2025) top stock recommendations from these specific Indian brokerages:
    - Angel One (Daily ARQ picks and Research reports)
    - 5paisa (Trading ideas and Weekly strategies)
    - Kotak Securities (Fundamental and Technical picks)
    - HDFC Securities (Retail stock ideas and monthly picks)
    - Sharekhan (Intraday and BTST tips)
    - Zerodha (Varsity outlooks and Weekly analysis)
    - Groww (Market insights and breakout stocks)

    For each recommendation, identify:
    1. The exact Stock Symbol (convert to NSE ticker like RELIANCE.NS)
    2. The Recommendation Type: BTST, WEEKLY, or MONTHLY
    3. The Source (Which broker provided this)
    4. The Target Price and Stop Loss mentioned
    5. A brief 1-sentence technical reason.

    Return the results as a JSON array of objects with keys: 
    symbol, name, timeframe (BTST/WEEKLY/MONTHLY), reason, sourceBrand, targetPrice, estimatedPrice.`;

  try {
    // We use PRO here because the search tool extraction is more reliable for specific symbols
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
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
              estimatedPrice: { type: Type.NUMBER }
            },
            required: ["symbol", "name", "timeframe", "reason", "sourceBrand"]
          }
        }
      }
    });

    const rawData = JSON.parse(response.text || "[]");
    if (!Array.isArray(rawData) || rawData.length === 0) {
        console.warn("Broker Intel: AI returned no results from search.");
        return [];
    }

    // Extract grounding chunks for display
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sourceUrls = sources.map((c: any) => c.web?.uri).filter(Boolean);

    // Speed up by using AI prices immediately if market data fetch is slow
    const enriched = await promisePool(rawData, 3, async (item: any) => {
      try {
        const ticker = item.symbol.toUpperCase().includes('.NS') ? item.symbol : `${item.symbol.toUpperCase()}.NS`;
        
        // Lightweight fetch - 3 second timeout for speed
        const mktData = await Promise.race([
            fetchRealStockData(ticker, settings, "1d", "1mo"),
            new Promise((_, reject) => setTimeout(() => reject('Timeout'), 3000))
        ]).catch(() => null) as any;
        
        const price = mktData?.price || item.estimatedPrice || 0;
        if (price === 0) return null;

        return {
          symbol: ticker,
          name: item.name || ticker.split('.')[0],
          type: 'STOCK',
          sector: 'Broker Pick',
          currentPrice: price,
          reason: `[${item.sourceBrand}] ${item.reason}`,
          riskLevel: 'Medium',
          targetPrice: item.targetPrice || price * 1.1,
          timeframe: item.timeframe || 'WEEKLY',
          score: mktData?.technicals.score || 75,
          lotSize: 1,
          isTopPick: true,
          sourceUrl: sourceUrls[0] || 'https://www.google.com/search?q=' + encodeURIComponent(item.sourceBrand + " stock tips")
        } as StockRecommendation;
      } catch (err) {
        return null;
      }
    });

    return enriched.filter((r): r is StockRecommendation => r !== null);
  } catch (error) {
    console.error("Critical Failure in Broker Intel Service:", error);
    return [];
  }
};
