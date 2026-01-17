
import { StockRecommendation, AppSettings, StockData } from "../types";
import { fetchRealStockData } from "./marketDataService";

const TIMEFRAMES = {
  "INTRADAY": { range: "1d", interval: "5m", label: "Intraday Momentum", targetMult: 1.0 },
  "BTST": { range: "2d", interval: "15m", label: "Buy Today Sell Tomorrow", targetMult: 1.8 },
  "WEEKLY": { range: "60d", interval: "1d", label: "Weekly Swing", targetMult: 5.0 },
  "MONTHLY": { range: "1y", interval: "1d", label: "Monthly Positional", targetMult: 10.0 }
};

export const runTechnicalScan = async (
    stockUniverse: string[], 
    settings: AppSettings
): Promise<StockRecommendation[]> => {
  
  // 1. BROAD SCAN: Find current leaders using Daily data (Fastest)
  const scanLimit = 50; 
  const shuffled = [...stockUniverse].sort(() => 0.5 - Math.random());
  const stageOneSymbols = shuffled.slice(0, scanLimit);
  
  const stageOneResults = await Promise.all(stageOneSymbols.map(async (symbol) => {
      const data = await fetchRealStockData(symbol, settings, "1d", "60d");
      if (data && data.technicals.score > 60) {
          return { symbol, data };
      }
      return null;
  }));

  const candidates = stageOneResults.filter(Boolean) as { symbol: string, data: StockData }[];
  
  // 2. REFINEMENT: Deep scan only the top 15 performers
  const leaders = candidates.sort((a, b) => b.data.technicals.score - a.data.technicals.score).slice(0, 15);
  
  const deepScans = await Promise.all(leaders.map(async (lead) => {
      const [intraday, btst] = await Promise.all([
          fetchRealStockData(lead.symbol, settings, "5m", "1d"),
          fetchRealStockData(lead.symbol, settings, "15m", "2d")
      ]);
      return { symbol: lead.symbol, daily: lead.data, intraday, btst };
  }));

  const results: StockRecommendation[] = [];

  const mapRec = (symbol: string, data: StockData, timeframe: keyof typeof TIMEFRAMES): StockRecommendation => {
      const config = TIMEFRAMES[timeframe];
      const atr = data.technicals.atr || (data.price * 0.02);
      return {
          symbol,
          name: symbol.split('.')[0],
          type: 'STOCK',
          sector: 'NSE Equity',
          currentPrice: data.price,
          reason: data.technicals.activeSignals.slice(0, 2).join(" | "),
          riskLevel: data.technicals.score > 85 ? 'Low' : 'Medium',
          targetPrice: parseFloat((data.price + (atr * config.targetMult)).toFixed(2)),
          timeframe,
          score: data.technicals.score,
          lotSize: 1,
          isTopPick: data.technicals.score >= 90
      };
  };

  deepScans.forEach(ds => {
      const scores = {
          'INTRADAY': ds.intraday?.technicals.score || 0,
          'BTST': ds.btst?.technicals.score || 0,
          'WEEKLY': ds.daily.technicals.score,
          'MONTHLY': ds.daily.technicals.score > 85 ? ds.daily.technicals.score : 0
      };

      const bestTF = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b)[0] as keyof typeof TIMEFRAMES;
      const bestScore = scores[bestTF];

      if (bestScore > 70) {
          const dataSource = bestTF === 'INTRADAY' ? ds.intraday! : bestTF === 'BTST' ? ds.btst! : ds.daily;
          results.push(mapRec(ds.symbol, dataSource, bestTF));
      }
  });

  return results.sort((a, b) => (b.score || 0) - (a.score || 0));
};
