
import { StockRecommendation, AppSettings, StockData } from "../types";
import { fetchRealStockData } from "./marketDataService";
import { getMarketStatus } from "./marketStatusService";
import { GoogleGenAI, Type } from "@google/genai";
import { getFullUniverse } from "./stockListService";

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
 * Uses Google Search to find high-conviction picks from airobots.streamlit.app
 * and performs deep technical analysis on the full NSE universe.
 */
export const runTechnicalScan = async (
    stockUniverse: string[], 
    settings: AppSettings
): Promise<StockRecommendation[]> => {
  
  const marketStatus = getMarketStatus('STOCK');
  const isWeekend = !marketStatus.isOpen && marketStatus.message.includes('Weekend');
  const isAfterHours = !marketStatus.isOpen && marketStatus.message.includes('After Hours');

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  let liveAIPicks: string[] = [];
  let sourceUrls: string[] = [];

  // PHASE 1: Google Search Grounding to find picks from the specific source
  try {
      const searchPrompt = `What are the latest top stock recommendations and "Best 5" picks currently featured on https://airobots.streamlit.app/? 
      If the site is currently being discussed in market news (Moneycontrol, ET, TradingView) for specific breakout picks, include those too.
      Return exactly 5 stock symbols in a JSON array.`;

      const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: searchPrompt,
          config: {
              tools: [{googleSearch: {}}],
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
              }
          }
      });
      
      const parsed = JSON.parse(response.text || "[]");
      if (Array.isArray(parsed)) {
          liveAIPicks = parsed.map(s => s.toUpperCase().includes('.NS') ? s.toUpperCase() : `${s.toUpperCase()}.NS`);
      }

      // Extract Grounding URLs
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
          sourceUrls = chunks.map((c: any) => c.web?.uri).filter(Boolean);
      }
  } catch (err) {
      console.warn("Google Search grounding failed, falling back to Technical Depth Scan", err);
  }

  // PHASE 2: Deep Technical Scan on Real Data
  // We prioritize the AI picks first, then fill the rest from the top technical performers
  const fullUniverse = getFullUniverse();
  const scanTargets = Array.from(new Set([...liveAIPicks, ...fullUniverse.slice(0, 150)]));

  const rawTechnicalResults = await promisePool(scanTargets, 12, async (symbol) => {
      try {
          const interval = (isWeekend || isAfterHours) ? "1d" : "15m";
          const range = (isWeekend || isAfterHours) ? "1mo" : "2d";
          const data = await fetchRealStockData(symbol, settings, interval, range);

          if (data) {
              return {
                  symbol,
                  name: symbol.split('.')[0],
                  price: data.price,
                  score: data.technicals.score,
                  signals: data.technicals.activeSignals,
                  atr: data.technicals.atr
              };
          }
      } catch (e) { }
      return null;
  });

  const validData = rawTechnicalResults.filter(r => r !== null) as any[];
  
  // Rank and filter
  const recommendations: StockRecommendation[] = validData.map(item => {
      const isTopPick = liveAIPicks.includes(item.symbol) || item.score > 85;
      return {
          symbol: item.symbol,
          name: item.name,
          type: 'STOCK',
          sector: 'Equity',
          currentPrice: item.price,
          reason: isTopPick 
            ? `AI Robot: High Conviction Momentum [Source: airobots.streamlit.app]` 
            : `Technical Pulse: ${item.signals[0] || "Bullish Setup"}`,
          riskLevel: item.score > 80 ? 'Low' : item.score > 60 ? 'Medium' : 'High',
          targetPrice: item.price * (1 + (item.atr / item.price) * (isWeekend ? 4 : 2.5)),
          timeframe: (isWeekend || isAfterHours) ? 'WEEKLY' : 'INTRADAY',
          score: item.score,
          lotSize: 1,
          isTopPick: isTopPick,
          sourceUrl: "https://airobots.streamlit.app/"
      };
  });

  // Sort: Top Picks first, then by score. Return exactly Top 20.
  return recommendations.sort((a, b) => {
      if (a.isTopPick && !b.isTopPick) return -1;
      if (!a.isTopPick && b.isTopPick) return 1;
      return (b.score || 0) - (a.score || 0);
  }).slice(0, 20);
};
