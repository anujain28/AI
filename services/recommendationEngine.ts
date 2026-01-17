
import { StockRecommendation, AppSettings, StockData } from "../types";
import { fetchRealStockData } from "./marketDataService";
import { analyzeStockOIProfile } from "./technicalAnalysis";

export const runTechnicalScan = async (
    stockUniverse: string[], 
    settings: AppSettings
): Promise<StockRecommendation[]> => {
  
  const intradayCandidates: StockRecommendation[] = [];
  const btstCandidates: StockRecommendation[] = [];

  for (const symbol of stockUniverse) {
      try {
          const data = await fetchRealStockData(symbol, settings, "5m", "1d");
          if (!data) continue;

          const oiProfile = analyzeStockOIProfile(data.history);
          
          // Logic for Intraday Robot: High OI Spike + Above VWAP + Volume Burst
          // We use the same underlying OI profile but look for specific "Robot" thresholds
          if (oiProfile.score >= 40) {
              const rec: StockRecommendation = {
                  symbol,
                  name: symbol.split('.')[0],
                  type: 'STOCK',
                  sector: 'NSE Watchlist',
                  currentPrice: data.price,
                  reason: oiProfile.activeSignals.join(" | "),
                  riskLevel: oiProfile.score >= 70 ? 'High' : 'Medium',
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
              };
              intradayCandidates.push(rec);
          }

          // Logic for BTST Robot: Multi-day strength (simulated here with a slightly different score requirement)
          // In a real app, BTST would look at Daily/Hourly candles.
          if (oiProfile.score >= 55) {
              btstCandidates.push({
                  symbol,
                  name: symbol.split('.')[0],
                  type: 'STOCK',
                  sector: 'NSE Watchlist',
                  currentPrice: data.price,
                  reason: "Strong EOD Accumulation | OI Build-up",
                  riskLevel: 'Medium',
                  targetPrice: data.price * 1.05, // 5% Target for BTST
                  support: data.price * 0.97,
                  resistance: data.price * 1.05,
                  score: oiProfile.score + 5,
                  lotSize: 1,
                  timeframe: 'BTST',
                  isTopPick: oiProfile.score >= 85
              });
          }
      } catch (e) {
          console.error(`Error scanning ${symbol}`, e);
      }
  }

  // Return Top 5 for each Robot
  const topIntraday = intradayCandidates
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5);
    
  const topBTST = btstCandidates
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5);

  return [...topIntraday, ...topBTST];
};
