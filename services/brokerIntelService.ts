
import { GoogleGenAI, Type } from "@google/genai";
import { StockRecommendation, AppSettings } from "../types";
import { fetchRealStockData } from "./marketDataService";

/**
 * Concurrency-controlled promise pool.
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

export interface BrokerIntelResponse {
  data: StockRecommendation[];
  error?: 'QUOTA_EXCEEDED' | 'NOT_FOUND' | 'UNKNOWN';
}

/**
 * Broker Intel Service
 * Targets specific high-conviction ideas from Moneycontrol Stock Ideas.
 */
export const fetchBrokerIntel = async (settings: AppSettings): Promise<BrokerIntelResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Search for the LATEST stock recommendations (February 2025) specifically from this page: https://www.moneycontrol.com/markets/stock-ideas/
    Identify the top Buy/Sell ideas mentioned on this page. 
    
    For each stock, extract:
    1. Symbol (Base NSE Ticker, e.g., RELIANCE, TCS)
    2. Name (Company Name)
    3. Timeframe (Classify as BTST, WEEKLY, or MONTHLY based on the expert's suggestion)
    4. Reason (The specific technical or fundamental trigger mentioned by the analyst)
    5. Source/Expert (e.g., 'Sudarshan Sukhani', 'Nooresh Merani', or the brokerage firm)
    6. Target Price
    7. Stop Loss
    8. Recommended Entry/Estimated Price

    Return the results strictly as a JSON array of objects.`;

  try {
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
    
    try {
        const cleanedJson = jsonText.replace(/```json|```/g, "").trim();
        rawData = JSON.parse(cleanedJson);
    } catch (e) {
        const match = jsonText.match(/\[[\s\S]*\]/);
        if (match) rawData = JSON.parse(match[0]);
    }

    if (!Array.isArray(rawData) || rawData.length === 0) {
        return { data: [] };
    }

    const enriched = await promisePool(rawData, 6, async (item: any) => {
      try {
        const baseSymbol = item.symbol.trim().toUpperCase().replace('.NS', '').split(' ')[0];
        const ticker = `${baseSymbol}.NS`;
        
        const mktData = await Promise.race([
            fetchRealStockData(ticker, settings, "1d", "1mo"),
            new Promise((_, reject) => setTimeout(() => reject('Timeout'), 2000))
        ]).catch(() => null) as any;
        
        const currentPrice = mktData?.price || item.estimatedPrice || 100;
        const targetPrice = item.targetPrice || (currentPrice * 1.1);
        const score = mktData?.technicals.score || 75;

        return {
          symbol: ticker,
          name: item.name || baseSymbol,
          type: 'STOCK',
          sector: 'Moneycontrol Idea',
          currentPrice,
          reason: `[Expert: ${item.sourceBrand}] ${item.reason}${item.stopLoss ? ` (SL: ${item.stopLoss})` : ''}`,
          riskLevel: score > 80 ? 'Low' : 'Medium',
          targetPrice,
          timeframe: (item.timeframe || 'WEEKLY').toUpperCase(),
          score: score,
          lotSize: 1,
          isTopPick: true,
          sourceUrl: 'https://www.moneycontrol.com/markets/stock-ideas/'
        } as StockRecommendation;
      } catch (err) {
        return {
            symbol: `${item.symbol}.NS`,
            name: item.name || item.symbol,
            type: 'STOCK',
            sector: 'Stock Idea',
            currentPrice: item.estimatedPrice || 100,
            reason: `[${item.sourceBrand}] ${item.reason}`,
            riskLevel: 'Medium',
            targetPrice: item.targetPrice || 110,
            timeframe: (item.timeframe || 'WEEKLY').toUpperCase(),
            score: 70,
            lotSize: 1,
            isTopPick: true,
            sourceUrl: 'https://www.moneycontrol.com/markets/stock-ideas/'
        } as StockRecommendation;
      }
    });

    return { data: enriched.filter((r): r is StockRecommendation => r !== null) };
  } catch (error: any) {
    console.error("Broker Intel Grounding Failure:", error);
    
    if (error.message?.includes('429') || error.message?.includes('QUOTA_EXCEEDED')) {
      return { data: [], error: 'QUOTA_EXCEEDED' };
    }
    if (error.message?.includes('Requested entity was not found')) {
      return { data: [], error: 'NOT_FOUND' };
    }
    
    return { data: [], error: 'UNKNOWN' };
  }
};
