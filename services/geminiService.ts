import {
  StockRecommendation,
  MarketSettings,
  PortfolioItem,
  HoldingAnalysis,
  MarketData
} from "../types";
import { getCompanyName, checkAndRefreshStockList } from "./stockListService";
import { fetchRealStockData } from "./realtimeDataService"; // your second file

const getISTTimeMinutes = () => {
  const now = new Date();
  const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istString);
  return istDate.getHours() * 60 + istDate.getMinutes();
};

export const fetchTopStockPicks = async (
  totalCapital: number,
  stockUniverse: string[] = [],
  markets: MarketSettings = { stocks: true, mcx: false, forex: false, crypto: false }
): Promise<StockRecommendation[]> => {
  const currentMinutes = getISTTimeMinutes();
  const isPostMarket = currentMinutes > 930;

  try {
    let universe = stockUniverse;

    // If no explicit universe passed, use static NSE list
    if (universe.length === 0 && markets.stocks) {
      universe = await checkAndRefreshStockList();
    }

    const picks: StockRecommendation[] = [];

    if (markets.stocks) {
      // Limit to avoid hammering Yahoo
      const sample = universe.slice(0, 80); // you can tune this

      const results: { symbol: string; data: MarketData | null }[] = [];

      for (const sym of sample) {
        try {
          const data = await fetchRealStockData(sym, {
            dhanClientId: "",
            dhanAccessToken: "",
            shoonyaUserId: ""
          } as any);
          if (data && data.price) {
            results.push({
              symbol: sym.toUpperCase(),
              data: { [sym.toUpperCase()]: data }
            });
          }
        } catch {
          // ignore bad symbols
        }
      }

      // Build a simple array with change %
      const scored = results
        .map((r) => {
          const sd = r.data![r.symbol];
          return {
            symbol: r.symbol,
            price: sd.price,
            changePercent: sd.changePercent
          };
        })
        .sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));

      const topIntraday = scored.slice(0, 2);
      const topBtst = scored.slice(2, 4);
      const topWeekly = scored.slice(4, 6);
      const topMonthly = scored.slice(6, 7);

      const toRec = (s: { symbol: string; price: number; changePercent: number }, timeframe: "INTRADAY" | "BTST" | "WEEKLY" | "MONTHLY"): StockRecommendation => {
        const name = getCompanyName(s.symbol);
        const target = s.price * (1 + (timeframe === "INTRADAY" ? 0.01 : timeframe === "BTST" ? 0.02 : timeframe === "WEEKLY" ? 0.03 : 0.05));

        return {
          symbol: s.symbol,
          name,
          type: "STOCK",
          sector: "NSE Stock",
          currentPrice: s.price,
          reason: `Selected by simple momentum filter (${timeframe}, ${isPostMarket ? "EOD" : "Live"})`,
          riskLevel: timeframe === "MONTHLY" ? "Low" : "Medium",
          targetPrice: target,
          lotSize: 1,
          timeframe,
          chartPattern: "Price Action"
        };
      };

      picks.push(...topIntraday.map((s) => toRec(s, "INTRADAY")));
      picks.push(...topBtst.map((s) => toRec(s, "BTST")));
      picks.push(...topWeekly.map((s) => toRec(s, "WEEKLY")));
      picks.push(...topMonthly.map((s) => toRec(s, "MONTHLY")));
    }

    // You can later extend MCX / FOREX / CRYPTO similarly using TICKER_MAP

    return picks;
  } catch (error) {
    console.error("fetchTopStockPicks failed, using static fallback:", error);

    const fallback: StockRecommendation[] = [];
    if (markets.stocks) {
      fallback.push({
        symbol: "TATASTEEL",
        name: getCompanyName("TATASTEEL"),
        type: "STOCK",
        sector: "Metals",
        currentPrice: 150,
        reason: "Static fallback",
        riskLevel: "Medium",
        targetPrice: 160,
        lotSize: 1,
        timeframe: "WEEKLY",
        chartPattern: "Price Action"
      });
      fallback.push({
        symbol: "TATAPOWER",
        name: getCompanyName("TATAPOWER"),
        type: "STOCK",
        sector: "Power",
        currentPrice: 410,
        reason: "Static fallback",
        riskLevel: "Medium",
        targetPrice: 440,
        lotSize: 1,
        timeframe: "MONTHLY",
        chartPattern: "Price Action"
      });
      fallback.push({
        symbol: "TCS",
        name: getCompanyName("TCS"),
        type: "STOCK",
        sector: "IT",
        currentPrice: 4000,
        reason: "Static fallback",
        riskLevel: "Low",
        targetPrice: 4200,
        lotSize: 1,
        timeframe: "MONTHLY",
        chartPattern: "Price Action"
      });
      fallback.push({
        symbol: "RELIANCE",
        name: getCompanyName("RELIANCE"),
        type: "STOCK",
        sector: "Energy",
        currentPrice: 2900,
        reason: "Static fallback",
        riskLevel: "Medium",
        targetPrice: 3000,
        lotSize: 1,
        timeframe: "WEEKLY",
        chartPattern: "Price Action"
      });
      fallback.push({
        symbol: "SBIN",
        name: getCompanyName("SBIN"),
        type: "STOCK",
        sector: "Bank",
        currentPrice: 780,
        reason: "Static fallback",
        riskLevel: "Low",
        targetPrice: 800,
        lotSize: 1,
        timeframe: "BTST",
        chartPattern: "Price Action"
      });
      fallback.push({
        symbol: "ITC",
        name: getCompanyName("ITC"),
        type: "STOCK",
        sector: "FMCG",
        currentPrice: 420,
        reason: "Static fallback",
        riskLevel: "Low",
        targetPrice: 450,
        lotSize: 1,
        timeframe: "MONTHLY",
        chartPattern: "Price Action"
      });
    }
    return fallback;
  }
};

export const analyzeHoldings = async (
  holdings: PortfolioItem[],
  marketData: MarketData
): Promise<HoldingAnalysis[]> => {
  // Simple placeholder without Gemini – you can extend this
  if (holdings.length === 0) return [];

  return holdings.map((h) => ({
    symbol: h.symbol,
    action: "HOLD",
    reason: "Gemini removed; static HOLD signal.",
    targetPrice: h.avgCost,
    dividendYield: "0",
    cagr: "0"
  }));
};
