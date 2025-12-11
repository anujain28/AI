import { GoogleGenAI, Type } from "@google/genai";
import { StockRecommendation, MarketSettings, PortfolioItem, HoldingAnalysis, MarketData } from "../types";
import { STATIC_MCX_LIST, STATIC_FOREX_LIST, STATIC_CRYPTO_LIST } from "./stockListService";

// Helper to safely get the AI client without crashing at module load time
// This ensures that if process.env.API_KEY is missing during build/render, the app loads (and fails gracefully later)
let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
    if (aiInstance) return aiInstance;
    
    // We access process.env.API_KEY directly as required
    // The optional chaining ensures we don't crash if `process` is undefined in browser (handled by index.html polyfill usually, but safe here)
    const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : '';
    
    if (!apiKey) {
        console.warn("Gemini API Key is missing. AI features will use fallback data.");
    }
    
    aiInstance = new GoogleGenAI({ apiKey: apiKey || 'dummy_key_to_prevent_crash' });
    return aiInstance;
};

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
    const ai = getAI();
    
    // Check if we have a valid key (heuristic check)
    if (!process.env.API_KEY) throw new Error("No API Key");

    let universePrompt = "";
    if (markets.stocks && stockUniverse.length > 0) universePrompt += `\nSTOCK UNIVERSE (NSE): [${stockUniverse.slice(0, 500).join(', ')}]...`;
    if (markets.mcx) universePrompt += `\nCOMMODITIES UNIVERSE (MCX): [${STATIC_MCX_LIST.join(', ')}]`;
    if (markets.forex) universePrompt += `\nFOREX UNIVERSE: [${STATIC_FOREX_LIST.join(', ')}]`;
    if (markets.crypto) universePrompt += `\nCRYPTO UNIVERSE: [${STATIC_CRYPTO_LIST.join(', ')}]`;

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
    1. Output ONLY the ticker symbol.
    2. Assign 'Asset Type' correctly as 'STOCK', 'MCX', 'FOREX', or 'CRYPTO'.
    3. For MCX/Forex, provide a standard lot size.
    
    ${universePrompt}
    
    Return the response as a JSON array.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are an expert technical analyst. Time Context: ${isPostMarket ? 'After Market Close' : 'Live Market'}.`,
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
    console.error("Failed to fetch picks (Using Fallback):", error);
    
    // Fallback Logic
    const fallback: StockRecommendation[] = [];
    if (markets.stocks) {
        fallback.push({ symbol: "TATAMOTORS", name: "Tata Motors", type: "STOCK", sector: "Auto", currentPrice: 980, reason: "Breakout", riskLevel: "Medium", targetPrice: 1020, lotSize: 1 });
        fallback.push({ symbol: "SBIN", name: "State Bank of India", type: "STOCK", sector: "Bank", currentPrice: 780, reason: "Support Bounce", riskLevel: "Low", targetPrice: 800, lotSize: 1 });
    }
    if (markets.mcx) fallback.push({ symbol: "GOLD", name: "Gold Futures", type: "MCX", sector: "Commodity", currentPrice: 72000, reason: "Safe Haven Buying", riskLevel: "Low", targetPrice: 72500, lotSize: 1 });
    if (markets.forex) fallback.push({ symbol: "USDINR", name: "USD/INR", type: "FOREX", sector: "Currency", currentPrice: 83.50, reason: "Dollar Strength", riskLevel: "Low", targetPrice: 84.00, lotSize: 1000 });
    if (markets.crypto) fallback.push({ symbol: "BTC", name: "Bitcoin", type: "CRYPTO", sector: "Digital Asset", currentPrice: 65000, reason: "ETF Inflow", riskLevel: "High", targetPrice: 66000, lotSize: 0.01 });

    return fallback;
  }
};

export const analyzeHoldings = async (holdings: PortfolioItem[], marketData: MarketData): Promise<HoldingAnalysis[]> => {
    if (holdings.length === 0) return [];
    
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

    const prompt = `Analyze portfolio holdings. Provide BUY/SELL/HOLD, target, dividend yield, and CAGR.
    Holdings: ${uniqueHoldings.map(h => `${h.symbol}: Cost ${h.avgCost}, Price ${h.currentPrice}`).join('; ')}`;

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
        console.error("Analysis failed", e);
        return [];
    }
};