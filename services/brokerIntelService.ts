
import { GoogleGenAI, Type } from "@google/genai";
import { StockRecommendation, AppSettings } from "../types";
import { fetchRealStockData } from "./marketDataService";

/**
 * Broker Intel Service
 * Fetches institutional recommendations from major Indian brokers using Gemini Search Grounding.
 */
export const fetchBrokerIntel = async (settings: AppSettings): Promise<StockRecommendation[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Perform a comprehensive search for the latest stock recommendations (BTST, Weekly, and Monthly) from these specific Indian financial platforms:
    - Angel One (Daily ARQ tips, weekly ideas)
    - 5paisa (Daily alerts, weekly strategies)
    - Sharekhan (Intraday tips, market blogs)
    - Kotak Securities (Intraday guides, daily picks)
    - HDFC Securities (Stock ideas, trading recommendations)
    - Zerodha Varsity/Outlooks (Weekly analysis)
    - Groww (Intraday strategies, market blogs)

    Synthesize the data and identify at least 15 high-conviction stocks. 
    Categorize them as BTST, WEEKLY, or MONTHLY.
    Include the source name (e.g., 'Angel One', 'HDFC Securities') in the 'reason'.
    Return a JSON array of objects with keys: symbol, name, type (always 'STOCK'), timeframe (BTST/WEEKLY/MONTHLY), reason, and sourceUrl.`;

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
              type: { type: Type.STRING },
              timeframe: { type: Type.STRING },
              reason: { type: Type.STRING },
              sourceUrl: { type: Type.STRING }
            },
            required: ["symbol", "name", "timeframe", "reason"]
          }
        }
      }
    });

    const rawData = JSON.parse(response.text || "[]");
    
    // Enrich with real technical data
    const enriched = await Promise.all(rawData.map(async (item: any) => {
      const ticker = item.symbol.toUpperCase().includes('.NS') ? item.symbol : `${item.symbol.toUpperCase()}.NS`;
      const mktData = await fetchRealStockData(ticker, settings, "1d", "1mo");
      
      return {
        ...item,
        symbol: ticker,
        type: 'STOCK',
        currentPrice: mktData?.price || 0,
        score: mktData?.technicals.score || 70,
        targetPrice: (mktData?.price || 100) * (item.timeframe === 'MONTHLY' ? 1.15 : 1.05),
        riskLevel: 'Medium',
        lotSize: 1,
        isTopPick: mktData?.technicals.score ? mktData.technicals.score > 80 : false
      } as StockRecommendation;
    }));

    return enriched.filter(r => r.currentPrice > 0);
  } catch (error) {
    console.error("Broker Intel Fetch Failed:", error);
    return [];
  }
};
