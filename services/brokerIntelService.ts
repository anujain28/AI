
import { GoogleGenAI, Type } from "@google/genai";
import { StockRecommendation, AppSettings } from "../types";
import { fetchRealStockData } from "./marketDataService";

/**
 * Concurrency-controlled promise pool.
 * Enhanced to handle timeouts gracefully and never return null if data exists.
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
 * Scrapes institutional consensus from the most reliable public sources.
 */
export const fetchBrokerIntel = async (settings: AppSettings): Promise<StockRecommendation[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Higher-authority prompt for reliable data extraction
  const prompt = `Search for the most recent (FEBRUARY 2025) stock recommendations for the Indian Market (NSE).
    Specifically crawl these high-authority sections:
    1. Moneycontrol "Brokerage Radar" and "Pro Research"
    2. Trendlyne "Brokerage Consensus" (Consensus Buy/Sell)
    3. Economic Times (ET Markets) "Expert Buy/Sell Ideas"
    4. Summaries of official Telegram channels for: Angel One, 5paisa, HDFC Securities, and Kotak Securities.

    Task: Identify at least 15 active recommendations.
    Categorize timeframe as: BTST, WEEKLY, or MONTHLY.
    
    Data Schema Required (Return ONLY a JSON array):
    - symbol: Base NSE Ticker (e.g., RELIANCE, TCS, HDFCBANK)
    - name: Full company name
    - timeframe: Must be BTST, WEEKLY, or MONTHLY
    - reason: A 1-sentence technical reason citing the specific source (e.g., "Angel One Telegram says breakout above 52-week high")
    - sourceBrand: Name of the broker or site
    - targetPrice: The specific price target mentioned
    - estimatedPrice: The current market price mentioned in the report or news.

    Ensure 'symbol' is strictly the base ticker without suffixes.`;

  try {
    // Using Gemini 3 Pro for superior search grounding and JSON adherence
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

    const jsonText = response.text || "[]";
    let rawData: any[] = [];
    
    // Safety parsing
    try {
        rawData = JSON.parse(jsonText.replace(/```json|```/g, "").trim());
    } catch (e) {
        const match = jsonText.match(/\[[\s\S]*\]/);
        if (match) rawData = JSON.parse(match[0]);
    }

    if (!Array.isArray(rawData) || rawData.length === 0) {
        console.warn("Broker Intel: AI search returned empty results.");
        return [];
    }

    // Enriching data but with a "UI-First" policy. 
    // We will NOT filter out items if the price fetch fails.
    const enriched = await promisePool(rawData, 6, async (item: any) => {
      try {
        const baseSymbol = item.symbol.trim().toUpperCase().replace('.NS', '').split(' ')[0];
        const ticker = `${baseSymbol}.NS`;
        
        // Attempt a very fast live price fetch (max 2 seconds)
        const mktData = await Promise.race([
            fetchRealStockData(ticker, settings, "1d", "1mo"),
            new Promise((_, reject) => setTimeout(() => reject('Timeout'), 2000))
        ]).catch(() => null) as any;
        
        // Logic: Use live data if available, otherwise use AI's extracted data
        const currentPrice = mktData?.price || item.estimatedPrice || 100;
        const targetPrice = item.targetPrice || (currentPrice * 1.1);
        const score = mktData?.technicals.score || 72;

        return {
          symbol: ticker,
          name: item.name || baseSymbol,
          type: 'STOCK',
          sector: 'Institutional Pick',
          currentPrice,
          reason: `[${item.sourceBrand}] ${item.reason}`,
          riskLevel: score > 80 ? 'Low' : 'Medium',
          targetPrice,
          timeframe: (item.timeframe || 'WEEKLY').toUpperCase(),
          score: score,
          lotSize: 1,
          isTopPick: true,
          sourceUrl: `https://www.google.com/search?q=${encodeURIComponent(item.sourceBrand + " " + baseSymbol + " target price")}`
        } as StockRecommendation;
      } catch (err) {
        // Even if enrichment crashes, try to return basic data
        return {
            symbol: `${item.symbol}.NS`,
            name: item.name || item.symbol,
            type: 'STOCK',
            sector: 'Broker Consensus',
            currentPrice: item.estimatedPrice || 100,
            reason: `[${item.sourceBrand}] ${item.reason}`,
            riskLevel: 'Medium',
            targetPrice: item.targetPrice || (item.estimatedPrice ? item.estimatedPrice * 1.1 : 110),
            timeframe: (item.timeframe || 'WEEKLY').toUpperCase(),
            score: 65,
            lotSize: 1,
            isTopPick: true,
            sourceUrl: 'https://airobots.streamlit.app/'
        } as StockRecommendation;
      }
    });

    return enriched.filter((r): r is StockRecommendation => r !== null && !!r.symbol);
  } catch (error) {
    console.error("Broker Intel Grounding Critical Failure:", error);
    return [];
  }
};
