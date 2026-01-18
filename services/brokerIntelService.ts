
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
 * Targets real-time data from Telegram summaries, Brokerage portals, and news aggregators.
 */
export const fetchBrokerIntel = async (settings: AppSettings): Promise<StockRecommendation[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Perform a deep web search for TODAY'S and THIS WEEK'S (February 2025) top stock recommendations in the Indian Market (NSE).
    Search across:
    1. Summaries of official Telegram channels (e.g., Angel One, 5paisa, Kotak Securities, IIFL).
    2. "Brokerage Radar" and "Pro Technicals" sections from Moneycontrol and Trendlyne.
    3. Latest Stock PDFs and research reports from HDFC Securities and ICICI Direct.
    4. Top breakout stock discussions on Economic Times Markets and BloombergQuint.

    Requirements:
    - Find at least 15 specific NSE stocks.
    - Classify as BTST, WEEKLY, or MONTHLY.
    - Extract Target Price and Stop Loss.
    - Mention the source (e.g., 'Angel One Telegram', 'Moneycontrol Pro').

    Return only a JSON array of objects with keys:
    symbol (NSE Ticker like RELIANCE, TCS), name, timeframe (BTST/WEEKLY/MONTHLY), reason, sourceBrand, targetPrice, stopLoss, estimatedPrice, sourceUrl.`;

  try {
    // We use gemini-3-pro-preview for best-in-class search grounding accuracy
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
              estimatedPrice: { type: Type.NUMBER },
              sourceUrl: { type: Type.STRING }
            },
            required: ["symbol", "name", "timeframe", "reason", "sourceBrand"]
          }
        }
      }
    });

    const jsonText = response.text || "[]";
    let rawData: any[] = [];
    try {
        rawData = JSON.parse(jsonText);
    } catch (e) {
        const match = jsonText.match(/\[[\s\S]*\]/);
        if (match) rawData = JSON.parse(match[0]);
    }

    if (!Array.isArray(rawData) || rawData.length === 0) {
        console.warn("Broker Intel: Search returned zero actionable picks.");
        return [];
    }

    // Parallel enrichment with high resiliency
    const enriched = await promisePool(rawData, 6, async (item: any) => {
      try {
        const baseSymbol = item.symbol.trim().toUpperCase().replace('.NS', '').split(' ')[0];
        const ticker = `${baseSymbol}.NS`;
        
        // Try to fetch real technicals with a 2-second strict timeout
        const mktData = await Promise.race([
            fetchRealStockData(ticker, settings, "1d", "1mo"),
            new Promise((_, reject) => setTimeout(() => reject('Timeout'), 2000))
        ]).catch(() => null) as any;
        
        // Fallback Logic: If market data fetch failed (likely proxy issue), 
        // we still create the recommendation using AI-provided data to ensure the UI isn't empty.
        const price = mktData?.price || item.estimatedPrice || 100;
        const target = item.targetPrice || price * 1.1;
        
        // Synthetic score based on sentiment if technicals are missing
        const sentimentScore = item.reason.toLowerCase().includes('breakout') || 
                              item.reason.toLowerCase().includes('strong') ? 82 : 74;

        return {
          symbol: ticker,
          name: item.name || baseSymbol,
          type: 'STOCK',
          sector: 'Broker Consensus',
          currentPrice: price,
          reason: `[${item.sourceBrand}] ${item.reason}${item.stopLoss ? ` (SL: ${item.stopLoss})` : ''}`,
          riskLevel: 'Medium',
          targetPrice: target,
          timeframe: item.timeframe || 'WEEKLY',
          score: mktData?.technicals.score || sentimentScore,
          lotSize: 1,
          isTopPick: true,
          sourceUrl: item.sourceUrl || `https://www.google.com/search?q=${encodeURIComponent(item.sourceBrand + " " + ticker + " stock report")}`
        } as StockRecommendation;
      } catch (err) {
        console.warn(`Failed to enrich ${item.symbol}, skipping.`);
        return null;
      }
    });

    // Final filter: ensure we have at least a name and symbol
    return enriched.filter((r): r is StockRecommendation => r !== null && !!r.symbol);
  } catch (error) {
    console.error("Broker Intel Critical Path Error:", error);
    return [];
  }
};
