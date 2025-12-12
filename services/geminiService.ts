
import { GoogleGenAI, Type } from "@google/genai";
import { StockRecommendation, MarketSettings, PortfolioItem, HoldingAnalysis, MarketData, AppSettings } from "../types";
import { getCompanyName } from "./stockListService";
import { fetchRealStockData } from "./marketDataService";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
    if (aiInstance) return aiInstance;
    const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : '';
    if (!apiKey) console.warn("Gemini API Key is missing.");
    aiInstance = new GoogleGenAI({ apiKey: apiKey || 'dummy_key' });
    return aiInstance;
};

// Shuffles array in place
function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Algorithmic Selection using Yahoo Finance Data (via Proxy)
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
      // Shuffle universe and pick a subset to scan to avoid rate limits/slow load
      // We scan 15 random stocks to find opportunities
      const candidates = shuffleArray([...stockUniverse]).slice(0, 15);
      
      const promises = candidates.map(async (sym) => {
          try {
              const data = await fetchRealStockData(sym, dummySettings);
              if (!data) return null;

              const { technicals, price } = data;
              if (!technicals) return null;

              let type: 'INTRADAY' | 'BTST' | 'WEEKLY' | 'MONTHLY' | null = null;
              let reason = "";
              let pattern = "Trend Following";

              // Logic for Categorization
              if (technicals.rsi > 60 && technicals.adx > 25 && technicals.ema.ema9 > technicals.ema.ema21) {
                  type = 'INTRADAY';
                  reason = `Strong Momentum (RSI ${technicals.rsi.toFixed(0)}) + EMA Crossover`;
                  pattern = "Bullish Breakout";
              } else if (technicals.rsi < 35) {
                  type = 'MONTHLY';
                  reason = `Oversold (RSI ${technicals.rsi.toFixed(0)}) - Value Buy`;
                  pattern = "Reversal / Dip Buy";
              } else if (technicals.macd.histogram > 0 && technicals.macd.macd > technicals.macd.signal) {
                  type = 'BTST';
                  reason = "MACD Bullish Crossover";
                  pattern = "Momentum Swing";
              } else if (technicals.bollinger.percentB < 0.1) {
                  type = 'WEEKLY';
                  reason = "Bollinger Band Squeeze/Support";
                  pattern = "Mean Reversion";
              }

              if (type) {
                   return {
                      symbol: sym,
                      name: getCompanyName(sym),
                      type: 'STOCK',
                      sector: 'Equity',
                      currentPrice: price,
                      reason: reason,
                      riskLevel: type === 'INTRADAY' ? 'High' : 'Medium',
                      targetPrice: Math.round(price * 1.05), // 5% Target
                      lotSize: 1,
                      timeframe: type,
                      chartPattern: pattern
                   } as StockRecommendation;
              }
          } catch (e) { console.error(e); }
          return null;
      });

      const stockResults = await Promise.all(promises);
      stockResults.forEach(r => { if(r) picks.push(r); });
  }

  // 2. ADD CRYPTO (Simulated Technicals)
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
                 reason: "Crypto Market Momentum",
                 riskLevel: 'High',
                 targetPrice: data.price * 1.1,
                 lotSize: c === 'BTC' ? 0.01 : 1,
                 timeframe: 'INTRADAY',
                 chartPattern: "Volatile Swing"
             });
          }
      }
  }

  // 3. ADD MCX (Simulated)
  if (markets.mcx) {
      const data = await fetchRealStockData('GOLD', dummySettings);
      if (data) {
          picks.push({
            symbol: 'GOLD',
            name: 'Gold Futures',
            type: 'MCX',
            sector: 'Commodity',
            currentPrice: data.price,
            reason: "Safe Haven Asset",
            riskLevel: 'Low',
            targetPrice: data.price * 1.02,
            lotSize: 1,
            timeframe: 'WEEKLY',
            chartPattern: "Consolidation"
          });
      }
  }

  return picks;
};

// Keep AI only for Analysis of Holdings (Text Generation)
export const analyzeHoldings = async (holdings: PortfolioItem[], marketData: MarketData): Promise<HoldingAnalysis[]> => {
    if (holdings.length === 0) return [];
    
    const uniqueHoldings = Array.from(new Set(holdings.map(h => h.symbol)))
        .map(symbol => {
             const h = holdings.find(i => i.symbol === symbol);
             const data = marketData[symbol];
             return { symbol, avgCost: h ? h.avgCost : 0, currentPrice: data ? data.price : (h ? h.avgCost : 0) };
        });

    const prompt = `Analyze holdings using technical indicators. Provide BUY/SELL/HOLD, target.
    Holdings: ${uniqueHoldings.map(h => `${h.symbol}: Cost ${h.avgCost}`).join('; ')}`;

    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            symbol: { type: Type.STRING },
                            action: { type: Type.STRING, enum: ["BUY", "HOLD", "SELL"] },
                            reason: { type: Type.STRING },
                            targetPrice: { type: Type.NUMBER },
                            dividendYield: { type: Type.STRING },
                            cagr: { type: Type.STRING }
                        },
                        required: ["symbol", "action", "reason", "targetPrice", "dividendYield", "cagr"]
                    }
                }
            }
        });

        if (response.text) return JSON.parse(response.text) as HoldingAnalysis[];
        return [];
    } catch (e) {
        return [];
    }
};
