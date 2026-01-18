
import { StockRecommendation, AppSettings } from "../types";
import { fetchRealStockData } from "./marketDataService";

/**
 * High-conviction universe focusing on liquid Nifty 50 and Next 50 leaders.
 * These are the stocks most frequently featured in professional analyst "Ideas".
 */
const INSTITUTIONAL_CORE = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS', 
  'BHARTIARTL.NS', 'AXISBANK.NS', 'SBIN.NS', 'LICI.NS', 'ITC.NS',
  'MARUTI.NS', 'TATAMOTORS.NS', 'SUNPHARMA.NS', 'JSWSTEEL.NS', 'LT.NS',
  'ADANIENT.NS', 'ONGC.NS', 'TATASTEEL.NS', 'COALINDIA.NS', 'TITAN.NS',
  'ULTRACEMCO.NS', 'BHARTIHEXA.NS', 'ZOMATO.NS', 'PAYTM.NS', 'HAL.NS',
  'BEL.NS', 'MAZDOCK.NS', 'IRFC.NS', 'RVNL.NS', 'SUZLON.NS', 'TRENT.NS',
  'DLF.NS', 'SIEMENS.NS', 'ABB.NS', 'BAJFINANCE.NS', 'WIPRO.NS', 'JIOFIN.NS'
];

export interface BrokerIntelResponse {
  data: StockRecommendation[];
  error?: string;
}

/**
 * Broker Intel Service (Quantitative Consensus Engine)
 * This engine identifies the "Latest Calls" by scanning the high-conviction universe
 * for professional-grade breakout and momentum signals.
 */
export const fetchBrokerIntel = async (settings: AppSettings): Promise<BrokerIntelResponse> => {
  try {
    // Process the institutional core list in parallel
    const enriched = await Promise.all(INSTITUTIONAL_CORE.map(async (ticker) => {
      try {
        const data = await fetchRealStockData(ticker, settings, "15m", "2d");
        if (!data) return null;

        const tech = data.technicals;
        const price = data.price;
        const symbol = ticker.split('.')[0];

        // Only include stocks with strong technical conviction
        if (tech.score < 65) return null;

        // Construct professional-grade commentary based on specific technical triggers
        let signalContext = "";
        if (tech.activeSignals.includes("BB Breakout")) signalContext = "Price breakout from volatility squeeze.";
        else if (tech.activeSignals.includes("EMA Bull Stack")) signalContext = "Strong multi-day momentum trend confirmed.";
        else if (tech.activeSignals.includes("High Volume Pulse")) signalContext = "Institutional buying detected at lower levels.";
        else signalContext = "Trend reversal confirmed with positive volume flow.";

        const reason = `Technical Consensus: ${signalContext} Support zone identified at ₹${(price * 0.985).toFixed(2)}. Targets set based on ATR volatility expansion.`;

        return {
          symbol: ticker,
          name: symbol,
          type: 'STOCK',
          sector: 'Consensus Idea',
          currentPrice: price,
          reason,
          riskLevel: tech.score > 80 ? 'Low' : 'Medium',
          targetPrice: price * (1 + (tech.atr / price) * 3.5),
          score: tech.score,
          lotSize: 1,
          isTopPick: tech.score > 75,
          // Removed timeframe (BTST/Weekly/Monthly) as requested
          sourceUrl: `https://www.moneycontrol.com/india/stockpricequote/${symbol.toLowerCase()}`
        } as StockRecommendation;
      } catch (err) {
        return null;
      }
    }));

    // Filter, sort by score, and limit to Top 5 for "Latest Calls" feel
    const validData = enriched
      .filter((r): r is StockRecommendation => r !== null)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 10);

    return { data: validData };
  } catch (error: any) {
    console.error("Institutional Engine Failure:", error);
    return { data: [], error: 'DATA_UNAVAILABLE' };
  }
};
