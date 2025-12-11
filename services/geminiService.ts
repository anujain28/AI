import { GoogleGenAI, Type } from "@google/genai";
import { StockRecommendation, MarketSettings, PortfolioItem, HoldingAnalysis, MarketData } from "../types";
import { STATIC_MCX_LIST, STATIC_FOREX_LIST, STATIC_CRYPTO_LIST } from "./stockListService";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
    if (aiInstance) return aiInstance;
    const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : '';
    if (!apiKey) console.warn("Gemini API Key is missing.");
    aiInstance = new GoogleGenAI({ apiKey: apiKey || 'dummy_key' });
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
    if (!process.env.API_KEY) throw new Error("No API Key");

    const requests: string[] = [];
    if (markets.stocks) requests.push("5 Indian Stocks (NSE)");
    if (markets.mcx) requests.push("2 MCX Commodities");
    if (markets.forex) requests.push("2 Forex Pairs (INR pairs)");
    if (markets.crypto) requests.push("3 Crypto Assets");

    if (requests.length === 0) return [];

    const prompt = `Act as 'AI Robots' trading engine. Strategy: ${strategyType}.
    REQUIREMENT: Provide exactly: ${requests.join(', ')}.
    Focus on Technical Analysis.
    IMPORTANT:
    1. Output ONLY the ticker symbol.
    2. Assign 'Asset Type' correctly ('STOCK', 'MCX', 'FOREX', 'CRYPTO').
    3. For MCX/Forex, provide lot size.
    
    Return the response as a JSON array.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are an expert technical analyst. Time: ${isPostMarket ? 'After Close' : 'Live'}.`,
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

    if (response.text) return JSON.parse(response.text) as StockRecommendation[];
    return [];
  } catch (error) {
    console.error("Failed to fetch picks (Using Fallback):", error);
    
    // Fallback Logic
    const fallback: StockRecommendation[] = [];
    if (markets.stocks) {
        fallback.push({ symbol: "TATAMOTORS", name: "Tata Motors", type: "STOCK", sector: "Auto", currentPrice: 980, reason: "Breakout", riskLevel: "Medium", targetPrice: 1020, lotSize: 1 });
        fallback.push({ symbol: "SBIN", name: "State Bank of India", type: "STOCK", sector: "Bank", currentPrice: 780, reason: "Support Bounce", riskLevel: "Low", targetPrice: 800, lotSize: 1 });
        fallback.push({ symbol: "RELIANCE", name: "Reliance Ind", type: "STOCK", sector: "Energy", currentPrice: 2800, reason: "Consolidation", riskLevel: "Medium", targetPrice: 2900, lotSize: 1 });
        fallback.push({ symbol: "INFY", name: "Infosys", type: "STOCK", sector: "IT", currentPrice: 1500, reason: "Value Buy", riskLevel: "Low", targetPrice: 1600, lotSize: 1 });
        fallback.push({ symbol: "ITC", name: "ITC Ltd", type: "STOCK", sector: "FMCG", currentPrice: 420, reason: "Defensive", riskLevel: "Low", targetPrice: 450, lotSize: 1 });
    }
    if (markets.mcx) fallback.push({ symbol: "GOLD", name: "Gold Futures", type: "MCX", sector: "Commodity", currentPrice: 72000, reason: "Safe Haven", riskLevel: "Low", targetPrice: 72500, lotSize: 1 });
    if (markets.forex) fallback.push({ symbol: "USDINR", name: "USD/INR", type: "FOREX", sector: "Currency", currentPrice: 83.50, reason: "Uptrend", riskLevel: "Low", targetPrice: 84.00, lotSize: 1000 });
    if (markets.crypto) fallback.push({ symbol: "BTC", name: "Bitcoin", type: "CRYPTO", sector: "Digital", currentPrice: 65000, reason: "ETF Inflow", riskLevel: "High", targetPrice: 66000, lotSize: 0.01 });

    return fallback;
  }
};

export const analyzeHoldings = async (holdings: PortfolioItem[], marketData: MarketData): Promise<HoldingAnalysis[]> => {
    if (holdings.length === 0) return [];
    
    const uniqueHoldings = Array.from(new Set(holdings.map(h => h.symbol)))
        .map(symbol => {
             const h = holdings.find(i => i.symbol === symbol);
             const data = marketData[symbol];
             return { symbol, avgCost: h ? h.avgCost : 0, currentPrice: data ? data.price : (h ? h.avgCost : 0) };
        });

    const prompt = `Analyze holdings. Provide BUY/SELL/HOLD, target.
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