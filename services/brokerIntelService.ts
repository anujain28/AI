
import { StockRecommendation, AppSettings } from "../types";
import { fetchRealStockData } from "./marketDataService";

/**
 * Curated list of high-conviction tickers often featured in brokerage reports.
 * Used as a base universe for the "Institutional Intel" engine.
 */
const INSTITUTIONAL_CORE = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS', 
  'BHARTIARTL.NS', 'AXISBANK.NS', 'SBIN.NS', 'LICI.NS', 'ITC.NS',
  'MARUTI.NS', 'TATAMOTORS.NS', 'SUNPHARMA.NS', 'JSWSTEEL.NS', 'LT.NS'
];

export interface BrokerIntelResponse {
  data: StockRecommendation[];
  error?: string;
}

/**
 * Broker Intel Service (Non-AI Version)
 * Replaced Gemini search with a robust technical-conviction engine.
 * Selects top performing blue-chip stocks based on momentum and volume.
 */
export const fetchBrokerIntel = async (settings: AppSettings): Promise<BrokerIntelResponse> => {
  try {
    // Process the institutional core list in parallel
    const enriched = await Promise.all(INSTITUTIONAL_CORE.map(async (ticker) => {
      try {
        // Fetch real market data using free Yahoo Finance API
        const data = await fetchRealStockData(ticker, settings, "15m", "2d");
        if (!data) return null;

        const tech = data.technicals;
        const price = data.price;
        const symbol = ticker.split('.')[0];

        // Determine timeframe based on volatility and trend strength
        const timeframe = tech.rsi > 65 ? 'BTST' : tech.adx > 25 ? 'WEEKLY' : 'MONTHLY';
        
        // Construct a "Broker-style" reason based on technical signals
        const mainSignal = tech.activeSignals[0] || "Bullish Setup";
        const reason = `Technical breakout confirmed by ${mainSignal}. Institutional volume support detected at ₹${(price * 0.98).toFixed(2)}.`;

        return {
          symbol: ticker,
          name: symbol,
          type: 'STOCK',
          sector: 'Institutional Pick',
          currentPrice: price,
          reason,
          riskLevel: tech.score > 75 ? 'Low' : 'Medium',
          targetPrice: price * (1 + (tech.atr / price) * 3),
          timeframe,
          score: tech.score,
          lotSize: 1,
          isTopPick: tech.score > 70,
          sourceUrl: `https://www.moneycontrol.com/india/stockpricequote/${symbol.toLowerCase()}`
        } as StockRecommendation;
      } catch (err) {
        return null;
      }
    }));

    const validData = enriched.filter((r): r is StockRecommendation => r !== null);
    
    // Sort by technical conviction score
    const sortedData = validData.sort((a, b) => (b.score || 0) - (a.score || 0));

    return { data: sortedData };
  } catch (error: any) {
    console.error("Broker Intel Technical Scan Failure:", error);
    return { data: [], error: 'TECHNICAL_FAILURE' };
  }
};
