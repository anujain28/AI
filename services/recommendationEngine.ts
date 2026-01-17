
import { StockRecommendation, AppSettings, StockData } from "../types";
import { fetchRealStockData } from "./marketDataService";
import { analyzeStockOIProfile } from "./technicalAnalysis";

export const runTechnicalScan = async (
    stockUniverse: string[], 
    settings: AppSettings
): Promise<StockRecommendation[]> => {
  
  const results: StockRecommendation[] = [];

  for (const symbol of stockUniverse) {
      try {
          const data = await fetchRealStockData(symbol, settings, "5m", "1d");
          if (!data) continue;

          // Replace basic analysis with OI profiling
          const oiProfile = analyzeStockOIProfile(data.history);
          
          if (oiProfile.score >= 40) {
              results.push({
                  symbol,
                  name: symbol.split('.')[0],
                  type: 'STOCK',
                  sector: 'NSE Watchlist',
                  currentPrice: data.price,
                  reason: oiProfile.activeSignals.join(" | "),
                  riskLevel: 'Medium',
                  targetPrice: oiProfile.resistance,
                  support: oiProfile.support,
                  resistance: oiProfile.resistance,
                  score: oiProfile.score,
                  lotSize: 1,
                  timeframe: 'INTRADAY',
                  isTopPick: oiProfile.score >= 80,
                  oiData: {
                      current: oiProfile.oiProfile?.current || 0,
                      change: oiProfile.oiProfile?.changePercent || 0
                  }
              });
          }
      } catch (e) {
          console.error(`Error scanning ${symbol}`, e);
      }
  }

  return results.sort((a, b) => (b.score || 0) - (a.score || 0));
};
