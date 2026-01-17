import { StockRecommendation, AppSettings } from "../types";
import { fetchRealStockData } from "./marketDataService";

const TIMEFRAMES = {
  "BTST": { range: "5d", interval: "15m", label: "Buy Today Sell Tomorrow", targetMult: 1.5 },
  "INTRADAY": { range: "2d", interval: "5m", label: "Intraday Momentum", targetMult: 1.0 },
  "WEEKLY": { range: "60d", interval: "1d", label: "Weekly Swing", targetMult: 4.5 },
  "MONTHLY": { range: "1y", interval: "1d", label: "Monthly Positional", targetMult: 8.0 }
};

export const runTechnicalScan = async (
    stockUniverse: string[], 
    settings: AppSettings
): Promise<StockRecommendation[]> => {
  
  // We scan a broad subset of the 190+ stocks for efficiency
  const scanLimit = 80; 
  const shuffled = [...stockUniverse].sort(() => 0.5 - Math.random());
  const symbolsToScan = shuffled.slice(0, scanLimit);
  
  const periods: (keyof typeof TIMEFRAMES)[] = ["BTST", "INTRADAY", "WEEKLY", "MONTHLY"];

  const timeframePromises = periods.map(async (period) => {
    const config = TIMEFRAMES[period];
    
    const symbolResults = await Promise.all(symbolsToScan.map(async (symbol) => {
      try {
        const data = await fetchRealStockData(symbol, settings, config.interval, config.range);
        
        if (data && data.technicals) {
            const tech = data.technicals;
            const score = tech.score;
            
            // Heuristic filtering for quality
            let isValid = false;
            if (period === 'BTST' && score > 70 && tech.rsi > 55) isValid = true;
            if (period === 'INTRADAY' && score > 65 && tech.rsi > 50) isValid = true;
            if (period === 'WEEKLY' && score > 60) isValid = true;
            if (period === 'MONTHLY' && score > 55) isValid = true;

            if (isValid) {
                const atr = tech.atr || (data.price * 0.02);
                const targetPrice = data.price + (atr * config.targetMult);

                return {
                    symbol: symbol,
                    name: symbol.split('.')[0],
                    type: 'STOCK' as const,
                    sector: 'NSE Equity',
                    currentPrice: data.price,
                    reason: tech.activeSignals.slice(0, 3).join(" • "),
                    riskLevel: score > 85 ? 'Low' : score > 65 ? 'Medium' : 'High' as any,
                    targetPrice: parseFloat(targetPrice.toFixed(2)),
                    lotSize: 1,
                    timeframe: period,
                    chartPattern: tech.signalStrength,
                    score: score,
                    isTopPick: score >= 88 && (period === 'BTST' || period === 'WEEKLY')
                };
            }
        }
      } catch (e) {
        return null;
      }
      return null;
    }));

    // For each timeframe, we return the absolute best 5
    return (symbolResults.filter(Boolean) as (StockRecommendation & { score: number })[])
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); 
  });

  const resultsByTimeframe = await Promise.all(timeframePromises);
  return resultsByTimeframe.flat();
};