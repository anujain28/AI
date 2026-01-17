
import { StockRecommendation, AppSettings } from "../types";
import { fetchRealStockData } from "./marketDataService";

const TIMEFRAMES = {
  "INTRADAY": { range: "2d", interval: "5m", label: "Intraday Momentum", targetMult: 1.0 },
  "BTST": { range: "5d", interval: "15m", label: "Buy Today Sell Tomorrow", targetMult: 1.8 },
  "WEEKLY": { range: "60d", interval: "1d", label: "Weekly Swing", targetMult: 5.0 },
  "MONTHLY": { range: "1y", interval: "1d", label: "Monthly Positional", targetMult: 10.0 }
};

export const runTechnicalScan = async (
    stockUniverse: string[], 
    settings: AppSettings
): Promise<StockRecommendation[]> => {
  
  // 1. STAGE ONE: BROAD SCAN (Fastest)
  // We scan 50 stocks using Daily data. This is 1 request per stock.
  const broadScanLimit = 50; 
  const shuffled = [...stockUniverse].sort(() => 0.5 - Math.random());
  const stageOneSymbols = shuffled.slice(0, broadScanLimit);
  
  const stageOneResults = await Promise.all(stageOneSymbols.map(async (symbol) => {
      const data = await fetchRealStockData(symbol, settings, "1d", "60d");
      if (data && data.technicals.score > 60) {
          return { symbol, data };
      }
      return null;
  }));

  const validCandidates = stageOneResults.filter(Boolean) as { symbol: string, data: any }[];
  
  // Sort by score to get the leaders
  const leaders = validCandidates.sort((a, b) => b.data.technicals.score - a.data.technicals.score);

  // 2. STAGE TWO: TIME-FRAME MAPPING
  const finalResults: StockRecommendation[] = [];
  const seenSymbols = new Set<string>();

  // Process Weekly/Monthly directly from leaders
  leaders.forEach(({ symbol, data }) => {
      const score = data.technicals.score;
      if (score > 70) {
          const timeframe = score > 85 ? 'MONTHLY' : 'WEEKLY';
          if (!seenSymbols.has(symbol) && finalResults.filter(r => r.timeframe === timeframe).length < 5) {
              const config = TIMEFRAMES[timeframe];
              const atr = data.technicals.atr || (data.price * 0.02);
              finalResults.push({
                  symbol,
                  name: symbol.split('.')[0],
                  type: 'STOCK',
                  sector: 'NSE Equity',
                  currentPrice: data.price,
                  reason: data.technicals.activeSignals.slice(0, 2).join(" | "),
                  riskLevel: score > 85 ? 'Low' : 'Medium',
                  targetPrice: parseFloat((data.price + (atr * config.targetMult)).toFixed(2)),
                  timeframe,
                  score,
                  lotSize: 1,
                  isTopPick: score >= 90
              });
              seenSymbols.add(symbol);
          }
      }
  });

  // 3. STAGE THREE: REFINED INTRADAY/BTST SCAN
  // Only check top 15 leaders for Intraday/BTST refined momentum to save bandwidth
  const refinedCandidates = leaders.slice(0, 15);
  
  const refinedIntraday = await Promise.all(refinedCandidates.map(async ({ symbol }) => {
      const data = await fetchRealStockData(symbol, settings, "5m", "1d");
      if (data && data.technicals.score > 70) return { symbol, data, timeframe: 'INTRADAY' as const };
      return null;
  }));

  const refinedBTST = await Promise.all(refinedCandidates.map(async ({ symbol }) => {
      const data = await fetchRealStockData(symbol, settings, "15m", "2d");
      if (data && data.technicals.score > 70) return { symbol, data, timeframe: 'BTST' as const };
      return null;
  }));

  // Merge refined results
  [...refinedIntraday, ...refinedBTST].filter(Boolean).forEach((res: any) => {
      if (!seenSymbols.has(res.symbol) && finalResults.filter(r => r.timeframe === res.timeframe).length < 5) {
          const config = TIMEFRAMES[res.timeframe as keyof typeof TIMEFRAMES];
          const atr = res.data.technicals.atr || (res.data.price * 0.015);
          finalResults.push({
              symbol: res.symbol,
              name: res.symbol.split('.')[0],
              type: 'STOCK',
              sector: 'NSE Equity',
              currentPrice: res.data.price,
              reason: res.data.technicals.activeSignals.slice(0, 2).join(" | "),
              riskLevel: res.data.technicals.score > 85 ? 'Low' : 'Medium',
              targetPrice: parseFloat((res.data.price + (atr * config.targetMult)).toFixed(2)),
              timeframe: res.timeframe,
              score: res.data.technicals.score,
              lotSize: 1,
              isTopPick: res.data.technicals.score >= 90
          });
          seenSymbols.add(res.symbol);
      }
  });

  return finalResults.sort((a, b) => (b.score || 0) - (a.score || 0));
};
