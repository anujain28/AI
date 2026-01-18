
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
 * Targets high-authority Indian financial portals for consensus picks.
 */
export const fetchBrokerIntel = async (settings: AppSettings): Promise<StockRecommendation[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Refined search focusing on aggregators which are public and highly indexed
  const prompt = `Perform a high-precision search for the latest stock recommendations (February 2025) in the Indian Market (NSE).
    Specifically check:
    - Moneycontrol "Top Stock Picks" and "Brokerage Radar"
    - Trendlyne "Brokerage Consensus" and "Latest Recommendations"
    - Economic Times (ET Markets) "Buy/Sell Ideas"
    - Business Standard "Market Live" analyst tips
    - Summaries of top brokerage research (Angel One, HDFC Securities, Kotak, ICICI Direct).

    Identify at least 15 active recommendations.
    Return the data as a JSON array of objects with these keys:
    symbol (NSE Ticker like RELIANCE, TCS, HDFCBANK), name, timeframe (BTST, WEEKLY, or MONTHLY), reason, sourceBrand (e.g., Moneycontrol, Angel One), targetPrice, stopLoss, estimatedPrice.

    Return ONLY the JSON array.`;

  try {
    // Use gemini-3-pro-preview for superior search tool grounding
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
              stopLoss: { type: Type.NUMBER },
              estimatedPrice: { type: Type.NUMBER }
            },
            required: ["symbol", "name", "timeframe", "reason", "sourceBrand"]
          }
        }
      }
    });

    const jsonText = response.text || "[]";
    let rawData: any[] = [];
    
    // Robust extraction: sometimes models wrap in markdown blocks
    try {
        const cleanedJson = jsonText.replace(/```json|```/g, "").trim();
        rawData = JSON.parse(cleanedJson);
    } catch (e) {
        const match = jsonText.match(/\[[\s\S]*\]/);
        if (match) {
            try {
                rawData = JSON.parse(match[0]);
            } catch(e2) {
                console.error("Failed to parse extracted JSON match");
            }
        }
    }

    if (!Array.isArray(rawData) || rawData.length === 0) {
        console.warn("Broker Intel: No recommendations found in AI response.");
        return [];
    }

    // Parallel enrichment with high resiliency (fallback to AI data if price fetch fails)
    const enriched = await promisePool(rawData, 8, async (item: any) => {
      try {
        const baseSymbol = item.symbol.trim().toUpperCase().replace('.NS', '').split(' ')[0];
        const ticker = `${baseSymbol}.NS`;
        
        // Attempt to fetch live data but don't hang if it's slow
        const mktData = await Promise.race([
            fetchRealStockData(ticker, settings, "1d", "1mo"),
            new Promise((_, reject) => setTimeout(() => reject('Timeout'), 2000))
        ]).catch(() => null) as any;
        
        // Fallback pricing from AI if live fetch fails
        const currentPrice = mktData?.price || item.estimatedPrice || 100;
        const targetPrice = item.targetPrice || (currentPrice * 1.1);

        return {
          symbol: ticker,
          name: item.name || baseSymbol,
          type: 'STOCK',
          sector: 'Market Consensus',
          currentPrice,
          reason: `[${item.sourceBrand}] ${item.reason}${item.stopLoss ? ` (SL: ${item.stopLoss})` : ''}`,
          riskLevel: 'Medium',
          targetPrice,
          timeframe: (item.timeframe || 'WEEKLY').toUpperCase(),
          score: mktData?.technicals.score || 70,
          lotSize: 1,
          isTopPick: true,
          sourceUrl: `https://www.google.com/search?q=${encodeURIComponent(item.sourceBrand + " " + baseSymbol + " stock recommendation")}`
        } as StockRecommendation;
      } catch (err) {
        return null;
      }
    });

    return enriched.filter((r): r is StockRecommendation => r !== null);
  } catch (error) {
    console.error("Broker Intel Critical Path Error:", error);
    return [];
  }
};
