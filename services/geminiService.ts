import { GoogleGenAI, Type } from "@google/genai";
import { StockRecommendation, MarketSettings, PortfolioItem, HoldingAnalysis, MarketData } from "../types";
import { STATIC_MCX_LIST, STATIC_FOREX_LIST, STATIC_CRYPTO_LIST } from "./stockListService";

// Initialize AI Client
// We use a lazy initialization or direct check to ensure it doesn't crash build tools if env is missing during static analysis
const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is missing in process.env");
    // Return a dummy or throw, but here we just proceed to let the library throw if used
  }
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

const ai = getAIClient();

const getISTTimeMinutes = () => {
    const now = new Date();
    const istString = now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
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

  const strategyType = isPostMarket ? 'BTST / Positional' : 'Intraday';
  
  try {
    let universePrompt = "";
    
    if (markets.stocks && stockUniverse.length > 0) {
        universePrompt += `\nSTOCK UNIVERSE (NSE): [${stockUniverse.slice(0, 500).join(', ')}]... (Sample)`;
    }
    if (markets.mcx) {
        universePrompt += `\nCOMMODITIES UNIVERSE (MCX): [${STATIC_MCX_LIST.join(', ')}]`;
    }
    if (markets.forex) {
        universePrompt += `\nFOREX UNIVERSE: [${STATIC_FOREX_LIST.join(', ')}]`;
    }
    if (markets.crypto) {
        universePrompt += `\nCRYPTO UNIVERSE: [${STATIC_CRYPTO_LIST.join(', ')}]`;
    }

    // Build specific request counts based on enabled markets
    const requests: string[] = [];
    if (markets.stocks) requests.push("3 Indian Stocks (NSE)");
    if (markets.mcx) requests.push("2 MCX Commodities");
    if (markets.forex) requests.push("2 Forex Pairs (INR pairs preferred)");
    if (markets.crypto) requests.push("2 Crypto Assets");

    if (requests.length === 0) return [];

    const prompt = `Analyze the market acting as 'AI Robots' algorithmic trading engine. 
    Current Strategy: ${strategyType}.
    
    Task: Identify the best trading opportunities. 
    REQUIREMENT: You must provide exactly: ${requests.join(', ')}.
    
    Focus on Technical Analysis (RSI, Moving Averages, Breakouts).
    
    IMPORTANT CONSTRAINTS:
    1. Output ONLY the ticker symbol (e.g., 'RELIANCE', 'GOLD', 'USDINR', 'BTC').
    2. Assign 'Asset Type' correctly as 'STOCK', 'MCX', 'FOREX', or 'CRYPTO'.
    3. For MCX/Forex, provide a standard lot size. For Stocks, lotSize=1. For Crypto, lotSize is small (e.g. 0.01 for BTC).
    4. Provide realistic targets.
    
    ${universePrompt}
    
    Return the response as a JSON array.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are an expert technical analyst for Indian Markets and Global Crypto. Time Context: ${isPostMarket ? 'After Market Close' : 'Live Market'}.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              name: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["STOCK", "MCX", "FOREX", "CRYPTO"] },
              sector: { type: Type.STRING },
              currentPrice: { type: Type.NUMBER },
              reason: { type: Type.STRING },
              riskLevel: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
              targetPrice: { type: Type.NUMBER },
              lotSize: { type: Type.NUMBER }
            },
            required: ["symbol", "name", "type", "sector", "currentPrice", "reason", "riskLevel", "targetPrice", "lotSize"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as StockRecommendation[];
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch picks:", error);
    
    // Fallback based on enabled markets
    const fallback: StockRecommendation[] = [];
    
    if (markets.stocks) {
        fallback.push({ symbol: "TATAMOTORS", name: "Tata Motors", type: "STOCK", sector: "Auto", currentPrice: 980, reason: "Breakout", riskLevel: "Medium", targetPrice: 1020, lotSize: 1 });
        fallback.push({ symbol: "SBIN", name: "State Bank of India", type: "STOCK", sector: "Bank", currentPrice: 780, reason: "Support Bounce", riskLevel: "Low", targetPrice: 800, lotSize: 1 });
    }
    if (markets.mcx) {
        fallback.push({ symbol: "GOLD", name: "Gold Futures", type: "MCX", sector: "Commodity", currentPrice: 72000, reason: "Safe Haven Buying", riskLevel: "Low", targetPrice: 72500, lotSize: 1 });
    }
    if (markets.forex) {
        fallback.push({ symbol: "USDINR", name: "USD/INR", type: "FOREX", sector: "Currency", currentPrice: 83.50, reason: "Dollar Strength", riskLevel: "Low", targetPrice: 84.00, lotSize: 1000 });
    }
    if (markets.crypto) {
        fallback.push({ symbol: "BTC", name: "Bitcoin", type: "CRYPTO", sector: "Digital Asset", currentPrice: 65000, reason: "ETF Inflow", riskLevel: "High", targetPrice: 66000, lotSize: 0.01 });
    }

    return fallback;
  }
};

export const analyzeHoldings = async (holdings: PortfolioItem[], marketData: MarketData): Promise<HoldingAnalysis[]> => {
    if (holdings.length === 0) return [];
    
    // Deduplicate symbols for query
    const uniqueHoldings = Array.from(new Set(holdings.map(h => h.symbol)))
        .map(symbol => {
             const h = holdings.find(i => i.symbol === symbol);
             const data = marketData[symbol];
             return {
                 symbol: symbol,
                 avgCost: h ? h.avgCost : 0,
                 currentPrice: data ? data.price : (h ? h.avgCost : 0)
             };
        });

    const prompt = `Analyze the following investment portfolio holdings and provide a recommendation (BUY, SELL, HOLD).
    For each stock, provide:
    1. Action: BUY, SELL, or HOLD.
    2. Reason: Short, concise reasoning based on Fundamentals (Estimate Dividend Yield, 3Y CAGR) and Technicals.
    3. Target Price: A realistic short-to-medium term target.
    4. Dividend Yield: Estimated current yield %.
    5. CAGR: Estimated 3-Year Compounded Annual Growth Rate %.

    Holdings Data:
    ${uniqueHoldings.map(h => `- ${h.symbol}: Avg Cost ${h.avgCost.toFixed(2)}, Current Price ${h.currentPrice.toFixed(2)}`).join('\n')}

    Return as a JSON Array.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: "You are a financial advisor. Use realistic market data for Dividend Yield and CAGR where known, or estimate based on sector standards. Keep reasons concise.",
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

        if (response.text) {
            return JSON.parse(response.text) as HoldingAnalysis[];
        }
        return [];

    } catch (e) {
        console.error("Analysis failed", e);
        return [];
    }
};