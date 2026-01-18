
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
 * Targets high-authority Indian financial portals and brokerages.
 */
export const fetchBrokerIntel = async (settings: AppSettings): Promise<StockRecommendation[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Broadened search to include aggregators and specific brokers for better hit rate
  const prompt = `Perform a real-time search for the LATEST stock recommendations (Feb 2025) for the Indian Market. 
    Check these specific high-authority sources:
    1. Moneycontrol (PRO research and Technical picks)
    2. Trendlyne (Brokerage consensus and stock ideas)
    3. Economic Times Markets (Top gainers and expert picks)
    4. Business Standard (Market outlook)
    5. Broker Research from: Angel One, HDFC Securities, Kotak Securities, ICICI Direct.

    Identify at least 15 specific stocks. Categorize them as BTST (Buy Today Sell Tomorrow), WEEKLY, or MONTHLY.
    For each stock, provide:
    - symbol: Exact NSE Ticker (e.g., RELIANCE, TCS, HDFCBANK)
    - name: Full company name
    - timeframe: BTST, WEEKLY, or MONTHLY
    - reason: A short technical or fundamental reason (mention the source site/broker)
    - sourceBrand: Name of the platform/broker (e.g., Moneycontrol, Angel One)
    - estimatedPrice: The current market price mentioned in the report.

    Return ONLY a JSON array of objects.`;

  try {
    // We use gemini-3-pro-preview for reliable search tool usage
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
              estimatedPrice: { type: Type.NUMBER }
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
        // Fallback: try to extract JSON from markdown if the model wrapped it
        const match = jsonText.match(/\[[\s\S]*\]/);
        if (match) rawData = JSON.parse(match[0]);
    }

    if (!Array.isArray(rawData) || rawData.length === 0) {
        console.warn("Broker Intel: No valid stock picks found by AI.");
        return [];
    }

    // Extract grounding URLs for reference
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sourceUrls = chunks.map((c: any) => c.web?.uri).filter(Boolean);

    // Parallel enrichment with a small batch size to stay under proxy radar
    const enriched = await promisePool(rawData, 4, async (item: any) => {
      try {
        const symbol = item.symbol.trim().toUpperCase();
        const ticker = symbol.includes('.NS') ? symbol : `${symbol}.NS`;
        
        // Fast technical enrichment - 2.5s timeout per request
        const mktData = await Promise.race([
            fetchRealStockData(ticker, settings, "1d", "1mo"),
            new Promise((_, reject) => setTimeout(() => reject('Timeout'), 2500))
        ]).catch(() => null) as any;
        
        const currentPrice = mktData?.price || item.estimatedPrice || 0;
        if (currentPrice === 0) return null; // Filter out zero-price failures

        return {
          symbol: ticker,
          name: item.name || symbol,
          type: 'STOCK',
          sector: 'Institutional Pick',
          currentPrice: currentPrice,
          reason: `[${item.sourceBrand}] ${item.reason}`,
          riskLevel: (mktData?.technicals.score || 70) > 80 ? 'Low' : 'Medium',
          targetPrice: currentPrice * (item.timeframe === 'MONTHLY' ? 1.12 : 1.05),
          timeframe: item.timeframe || 'WEEKLY',
          score: mktData?.technicals.score || 72,
          lotSize: 1,
          isTopPick: true,
          sourceUrl: item.sourceUrl || sourceUrls[0] || `https://www.google.com/search?q=${encodeURIComponent(ticker + " stock target price")}`
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
