import { StockRecommendation, MarketSettings, PortfolioItem, HoldingAnalysis, MarketData, AppSettings } from "../types";
import { getCompanyName } from "./stockListService";
import { fetchRealStockData } from "./marketDataService";

// Shuffles array in place
function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Algorithmic Selection (Replaces AI)
export const fetchTopStockPicks = async (
    totalCapital: number, 
    stockUniverse: string[] = [], 
    markets: MarketSettings = { stocks: true, mcx: false, forex: false, crypto: false }
): Promise<StockRecommendation[]> => {
  
  const picks: StockRecommendation[] = [];
  const dummySettings: AppSettings = {
      initialFunds: { stock: 0, mcx: 0, forex: 0, crypto: 0 },
      autoTradeConfig: { mode: 'FIXED', value: 0 },
      activeBrokers: [],
      enabledMarkets: markets,
      telegramBotToken: '',
      telegramChatId: ''
  };

  // 1. SELECT STOCKS (ALGORITHMIC)
  if (markets.stocks && stockUniverse.length > 0) {
      // Scan a subset of stocks to avoid rate limits
      const candidates = shuffleArray([...stockUniverse]).slice(0, 40); 
      
      const promises = candidates.map(async (sym) => {
          try {
              const data = await fetchRealStockData(sym, dummySettings);
              if (!data) return null;

              const { technicals, price } = data;
              if (!technicals) return null;

              // Filter out low scores
              if (technicals.score < 40) return null;

              let type: 'INTRADAY' | 'BTST' | 'WEEKLY' | 'MONTHLY' | null = null;
              let reason = "";
              let pattern = "Trend Following";

              // Logic for Categorization
              if (technicals.rsi > 60 && technicals.adx > 25 && technicals.ema.ema9 > technicals.ema.ema21) {
                  type = 'INTRADAY';
                  reason = `Strong Momentum (RSI ${technicals.rsi.toFixed(0)})`;
                  pattern = "Bullish Breakout";
              } else if (technicals.rsi < 35) {
                  type = 'MONTHLY';
                  reason = `Oversold (RSI ${technicals.rsi.toFixed(0)})`;
                  pattern = "Reversal";
              } else if (technicals.macd.histogram > 0 && technicals.macd.macd > technicals.macd.signal) {
                  type = 'BTST';
                  reason = "MACD Bullish Crossover";
                  pattern = "Momentum Swing";
              } else if (technicals.bollinger.percentB < 0.1) {
                  type = 'WEEKLY';
                  reason = "Bollinger Squeeze";
                  pattern = "Mean Reversion";
              } else if (technicals.score > 60) {
                  type = 'WEEKLY';
                  reason = `Technical Score ${technicals.score.toFixed(0)}`;
                  pattern = "Strong Trend";
              }

              if (type) {
                   return {
                      rec: {
                        symbol: sym,
                        name: getCompanyName(sym),
                        type: 'STOCK',
                        sector: 'Equity',
                        currentPrice: price,
                        reason: reason,
                        riskLevel: type === 'INTRADAY' ? 'High' : 'Medium',
                        targetPrice: Math.round(price * 1.05 * 100) / 100, // 5% Target
                        lotSize: 1,
                        timeframe: type,
                        chartPattern: pattern
                      } as StockRecommendation,
                      score: technicals.score
                   };
              }
          } catch (e) { }
          return null;
      });

      const stockResults = await Promise.all(promises);
      
      const sortedResults = stockResults
        .filter((r): r is { rec: StockRecommendation, score: number } => r !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
        
      sortedResults.forEach(r => picks.push(r.rec));
  }

  // 2. CRYPTO
  if (markets.crypto) {
      const cryptos = ['BTC', 'ETH', 'SOL'];
      for (const c of cryptos) {
          const data = await fetchRealStockData(c, dummySettings);
          if (data) {
             picks.push({
                 symbol: c,
                 name: getCompanyName(c),
                 type: 'CRYPTO',
                 sector: 'Digital',
                 currentPrice: data.price,
                 reason: "Crypto Momentum",
                 riskLevel: 'High',
                 targetPrice: data.price * 1.05,
                 lotSize: c === 'BTC' ? 0.01 : 1,
                 timeframe: 'INTRADAY',
                 chartPattern: "Volatile"
             });
          }
      }
  }

  // 3. MCX
  if (markets.mcx) {
      const mcx = ['GOLD', 'SILVER', 'CRUDEOIL'];
      for (const m of mcx) {
          const data = await fetchRealStockData(m, dummySettings);
          if (data) {
              picks.push({
                symbol: m,
                name: getCompanyName(m),
                type: 'MCX',
                sector: 'Commodity',
                currentPrice: data.price,
                reason: "Commodity Trend",
                riskLevel: 'Medium',
                targetPrice: data.price * 1.02,
                lotSize: 1,
                timeframe: 'WEEKLY',
                chartPattern: "Trend"
              });
          }
      }
  }

  return picks;
};

// Local Analysis (No API)
export const analyzeHoldings = async (holdings: PortfolioItem[], marketData: MarketData): Promise<HoldingAnalysis[]> => {
    return holdings.map(h => {
        const data = marketData[h.symbol];
        if (!data) return {
            symbol: h.symbol, action: 'HOLD', reason: 'Insufficient Data', targetPrice: 0, dividendYield: '-', cagr: '-'
        };

        const score = data.technicals.score;
        let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let reason = "Neutral Trend";

        if (score >= 70) { 
            action = 'BUY'; 
            reason = "Strong Technicals (Score > 70)"; 
        } else if (score <= 30) { 
            action = 'SELL'; 
            reason = "Weak Technicals (Score < 30)"; 
        } else if (h.type === 'STOCK' && data.technicals.rsi > 75) { 
            action = 'SELL'; 
            reason = "Overbought (RSI > 75)"; 
        } else if (h.type === 'STOCK' && data.technicals.rsi < 30) {
            action = 'BUY';
            reason = "Oversold (RSI < 30)";
        }

        return {
            symbol: h.symbol,
            action,
            reason,
            targetPrice: parseFloat((data.price * (action === 'BUY' ? 1.1 : 0.95)).toFixed(2)),
            dividendYield: "0.00%",
            cagr: "N/A"
        };
    });
};