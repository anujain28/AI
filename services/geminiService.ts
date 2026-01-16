
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
    markets: MarketSettings = { stocks: true, mcx: false, forex: false }
): Promise<StockRecommendation[]> => {
  
  const picks: StockRecommendation[] = [];
  const dummySettings: AppSettings = {
      initialFunds: { stock: 0, mcx: 0, forex: 0 },
      autoTradeConfig: { mode: 'FIXED', value: 0 },
      activeBrokers: [],
      enabledMarkets: markets,
      telegramBotToken: '',
      telegramChatId: ''
  };

  // 1. SELECT STOCKS (ALGORITHMIC)
  if (markets.stocks && stockUniverse.length > 0) {
      const candidates = shuffleArray([...stockUniverse]).slice(0, 50); 
      
      const promises = candidates.map(async (sym) => {
          try {
              const data = await fetchRealStockData(sym, dummySettings);
              if (!data) return null;

              const { technicals, price } = data;
              if (!technicals) return null;

              if (technicals.score < 45) return null;

              let type: 'INTRADAY' | 'BTST' | 'WEEKLY' | 'MONTHLY' | null = null;
              let reason = "";
              let pattern = "Trend Following";

              if (technicals.rsi > 60 && technicals.adx > 25 && technicals.ema.ema9 > technicals.ema.ema21) {
                  type = 'INTRADAY';
                  reason = `High Momentum (Score: ${technicals.score.toFixed(0)})`;
                  pattern = "Bullish Breakout";
              } else if (technicals.rsi < 35) {
                  type = 'MONTHLY';
                  reason = `Oversold Reversal (RSI ${technicals.rsi.toFixed(0)})`;
                  pattern = "Dip Buy";
              } else if (technicals.macd.histogram > 0 && technicals.macd.macd > technicals.macd.signal) {
                  type = 'BTST';
                  reason = "MACD Crossover";
                  pattern = "Momentum Swing";
              } else if (technicals.bollinger.percentB < 0.1) {
                  type = 'WEEKLY';
                  reason = "Volatility Squeeze";
                  pattern = "Mean Reversion";
              } else if (technicals.score > 60) {
                  type = 'WEEKLY';
                  reason = `Strong Technical Score ${technicals.score.toFixed(0)}`;
                  pattern = "Strong Trend";
              }

              const atr = technicals.atr || (price * 0.02);
              const target = price + (atr * 2);
              
              const profitPct = ((target - price) / price) * 100;
              if (profitPct < 2.0) return null;

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
                        targetPrice: parseFloat(target.toFixed(2)),
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
        .slice(0, 20); 
        
      sortedResults.forEach(r => picks.push(r.rec));
  }

  // 2. MCX
  if (markets.mcx) {
      const mcx = ['GOLD', 'SILVER', 'CRUDEOIL', 'NATURALGAS', 'COPPER'];
      for (const m of mcx) {
          const data = await fetchRealStockData(m, dummySettings);
          if (data) {
              const atr = data.technicals.atr || (data.price * 0.01);
              const target = data.price + (atr * 2);
              
              const profitPct = ((target - data.price) / data.price) * 100;
              if (profitPct >= 2.0) {
                  picks.push({
                    symbol: m,
                    name: getCompanyName(m),
                    type: 'MCX',
                    sector: 'Commodity',
                    currentPrice: data.price,
                    reason: `Commodity Trend (${data.technicals.signalStrength})`,
                    riskLevel: 'Medium',
                    targetPrice: parseFloat(target.toFixed(2)),
                    lotSize: 1,
                    timeframe: 'WEEKLY',
                    chartPattern: data.technicals.activeSignals[0] || "Trend"
                  });
              }
          }
      }
  }

  // 3. FOREX
  if (markets.forex) {
      const forex = ['USDINR', 'EURINR', 'GBPINR', 'EURUSD', 'GBPUSD'];
      for (const f of forex) {
          const data = await fetchRealStockData(f, dummySettings);
          if (data) {
               const atr = data.technicals.atr || (data.price * 0.005);
               const target = data.price + atr;
               
               picks.push({
                symbol: f,
                name: getCompanyName(f),
                type: 'FOREX',
                sector: 'Currency',
                currentPrice: data.price,
                reason: `Forex Momentum (${data.technicals.score.toFixed(0)})`,
                riskLevel: 'High',
                targetPrice: parseFloat(target.toFixed(4)),
                lotSize: 1000,
                timeframe: 'INTRADAY',
                chartPattern: "Scalping"
              });
          }
      }
  }

  return picks;
};

// Local Analysis
export const analyzeHoldings = async (holdings: PortfolioItem[], marketData: MarketData): Promise<HoldingAnalysis[]> => {
    return holdings.map(h => {
        const data = marketData[h.symbol];
        if (!data) return {
            symbol: h.symbol, action: 'HOLD', reason: 'Insufficient Data', targetPrice: 0, dividendYield: '-', cagr: '-'
        };

        const score = data.technicals.score;
        const atr = data.technicals.atr || (data.price * 0.02);
        
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
            targetPrice: parseFloat((data.price + (action === 'BUY' ? (atr * 2) : -(atr))).toFixed(2)),
            dividendYield: "0.00%",
            cagr: "N/A"
        };
    });
};
