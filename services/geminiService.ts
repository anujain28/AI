import {
  StockRecommendation,
  MarketSettings,
  PortfolioItem,
  HoldingAnalysis,
  MarketData
} from "../types";
import { getCompanyName, checkAndRefreshStockList } from "./stockListService";
import { fetchRealStockData } from "./marketDataService"; // no ".ts" in import

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

  const shuffle = <T,>(array: T[]): T[] => {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  try {
    let universe = stockUniverse;

    // If no explicit universe passed, use static NSE list
    if (universe.length === 0 && markets.stocks) {
      universe = await checkAndRefreshStockList();
    }

    const picks: StockRecommendation[] = [];

    if (markets.stocks) {
      // Shuffle to avoid alphabetical bias
      const shuffled = shuffle(universe);
      // Limit to avoid hammering Yahoo / yfinance
      const sample = shuffled.slice(0, 80);

      const results: { symbol: string; data: MarketData }[] = [];

      for (const sym of sample) {
        try {
          const data = await fetchRealStockData(sym, {
            dhanClientId: "",
            dhanAccessToken: "",
            shoonyaUserId: ""
          } as any);

          if (data && data.price) {
            const upper = sym.toUpperCase();
            results.push({
              symbol: upper,
              data: { [upper]: data }
            });
          }
        } catch {
          // ignore failed symbols
        }
      }

      const scored = results
        .map((r) => {
          const sd = r.data[r.symbol];
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

      const toRec = (
        s: { symbol: string; price: number; changePercent: number },
        timeframe: "INTRADAY" | "BTST" | "WEEKLY" | "MONTHLY"
      ): StockRecommendation => {
        const name = getCompanyName(s.symbol);
        const factor =
          timeframe === "INTRADAY"
            ? 0.01
            : timeframe === "BTST"
            ? 0.02
            : timeframe === "WEEKLY"
            ? 0.03
            : 0.05;
        const target = s.price * (1 + factor);

        return {
          symbol: s.symbol,
          name,
          type: "STOCK",
          sector: "NSE Stock",
          currentPrice: s.price,
          reason: "Momentum pick (" + timeframe + ", " + (isPostMarket ? "EOD" : "Live") + ")",
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
