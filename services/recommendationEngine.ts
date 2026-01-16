
import { StockRecommendation, MarketSettings, MarketData, AppSettings } from "../types";
import { fetchRealStockData } from "./marketDataService";

// Fix: Use uppercase keys to match StockRecommendation.timeframe type ('INTRADAY' | 'BTST' | 'WEEKLY' | 'MONTHLY')
const TIMEFRAMES = {
  "BTST": { range: "10d", interval: "15m", label: "1-3 days (BTST)" },
  "INTRADAY": { range: "5d", interval: "15m", label: "Same day" },
  "WEEKLY": { range: "90d", interval: "1d", label: "Up to 1 week" },
  "MONTHLY": { range: "1y", interval: "1d", label: "2-4 weeks" }
};

export const runTechnicalScan = async (
    stockUniverse: string[], 
    settings: AppSettings
): Promise<StockRecommendation[]> => {
  
  const allRecs: StockRecommendation[] = [];
  
  // We process in small chunks to avoid browser hanging/proxy rate limits
  const chunkedUniverse = [];
  const chunkSize = 5;
  for (let i = 0; i < stockUniverse.length; i += chunkSize) {
    chunkedUniverse.push(stockUniverse.slice(i, i + chunkSize));
  }

  // Define period types to scan
  // Fix: Use uppercase period names to match TIMEFRAMES keys and timeframe type
  const periods: (keyof typeof TIMEFRAMES)[] = ["BTST", "INTRADAY", "WEEKLY", "MONTHLY"];

  for (const period of periods) {
    const config = TIMEFRAMES[period];
    const periodRecs: (StockRecommendation & { score: number })[] = [];

    // Scan the universe for this specific timeframe
    // Note: To keep it performant for the UI, we only scan the first 25 stocks of the universe 
    // unless the user triggers a full scan (which we can implement later)
    const scanLimit = Math.min(stockUniverse.length, 30);
    
    for (let i = 0; i < scanLimit; i++) {
        const symbol = stockUniverse[i];
        const data = await fetchRealStockData(symbol, settings, config.interval, config.range);
        
        if (data && data.technicals.activeSignals.length >= 3) {
            const tech = data.technicals;
            periodRecs.push({
                symbol: symbol,
                name: symbol.split('.')[0],
                type: 'STOCK',
                sector: 'Technical Pick',
                currentPrice: data.price,
                reason: tech.activeSignals.join(" | "),
                riskLevel: tech.score > 100 ? 'Low' : tech.score > 70 ? 'Medium' : 'High',
                targetPrice: data.price + (tech.atr * 2),
                lotSize: 1,
                timeframe: period,
                chartPattern: tech.signalStrength,
                score: tech.score,
                isTopPick: tech.score >= 90
            });
        }
    }

    // Add top 5 picks for this timeframe
    allRecs.push(...periodRecs.sort((a, b) => b.score - a.score).slice(0, 5));
  }

  return allRecs;
};
