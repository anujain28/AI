import { StockRecommendation, AppSettings, StockData } from "../types";
import { fetchRealStockData } from "./marketDataService";

export const runTechnicalScan = async (
    stockUniverse: string[], 
    settings: AppSettings
): Promise<StockRecommendation[]> => {
  
  const intradayCandidates: StockRecommendation[] = [];
  const btstCandidates: StockRecommendation[] = [];

  // Limit scan to 60 stocks for performance in a single burst, or the whole list if smaller
  const symbolsToScan = stockUniverse.length > 60 
    ? [...stockUniverse].sort(() => 0.5 - Math.random()).slice(0, 60)
    : stockUniverse;

  const results = await Promise.all(symbolsToScan.map(async (symbol) => {
      try {
          // Fetch both 5m (Intraday) and 15m (BTST) data
          const [intradayData, btstData] = await Promise.all([
              fetchRealStockData(symbol, settings, "5m", "1d"),
              fetchRealStockData(symbol, settings, "15m", "2d")
          ]);

          if (intradayData) {
              const score = intradayData.technicals.score;
              if (score >= 45) {
                  intradayCandidates.push({
                      symbol,
                      name: symbol.split('.')[0],
                      type: 'STOCK',
                      sector: 'Equity',
                      currentPrice: intradayData.price,
                      reason: intradayData.technicals.activeSignals.join(" | "),
                      riskLevel: score > 80 ? 'Low' : 'Medium',
                      targetPrice: intradayData.price + (intradayData.technicals.atr * 1.5),
                      timeframe: 'INTRADAY',
                      score: score,
                      lotSize: 1,
                      isTopPick: score >= 85
                  });
              }
          }

          if (btstData) {
              const score = btstData.technicals.score;
              // BTST requires slightly higher daily strength
              if (score >= 55) {
                  btstCandidates.push({
                      symbol,
                      name: symbol.split('.')[0],
                      type: 'STOCK',
                      sector: 'Equity',
                      currentPrice: btstData.price,
                      reason: "EOD Accumulation | High Vol Confirm",
                      riskLevel: score > 85 ? 'Low' : 'Medium',
                      targetPrice: btstData.price + (btstData.technicals.atr * 3.0),
                      timeframe: 'BTST',
                      score: score + 5, // Bonus for multi-day strength
                      lotSize: 1,
                      isTopPick: score >= 80
                  });
              }
          }
      } catch (e) {
          console.error(`Error scanning ${symbol}`, e);
      }
  }));

  // Sort and pick top 5 for each Robot
  const top5Intraday = intradayCandidates
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5);
    
  const top5BTST = btstCandidates
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5);

  return [...top5Intraday, ...top5BTST];
};