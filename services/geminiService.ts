import { GoogleGenAI, Type } from "@google/genai";
import { StockRecommendation, MarketSettings, PortfolioItem, HoldingAnalysis, MarketData } from "../types";
import { getCompanyName } from "./stockListService";

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
  
  try {
    const ai = getAI();
    if (!process.env.API_KEY) throw new Error("No API Key");

    const requests: string[] = [];
    
    // We pass the universe for context, but we will ask the AI to be precise with symbols
    const availableStocks = stockUniverse.length > 0 ? stockUniverse.join(', ') : "Top Liquid NSE Stocks";

    if (markets.stocks) {
        requests.push(`Stock Recommendations selected STRICTLY from this provided list: [${availableStocks}]. 
        Categorize them exactly as follows: 
        - 2 stocks for 'INTRADAY' (High momentum, tight stop loss)
        - 2 stocks for 'BTST' (Buy Today Sell Tomorrow) 
        - 2 stocks for 'WEEKLY' (Short Term 5-7 days)
        - 1 stock for 'MONTHLY' (Positional)`);
    }
    if (markets.mcx) requests.push("2 MCX Commodities (Intraday/Positional)");
    if (markets.forex) requests.push("2 Forex Pairs (INR pairs)");
    if (markets.crypto) requests.push("3 Crypto Assets (Top Gainers/Breakouts)");

    if (requests.length === 0) return [];

    const prompt = `Act as 'AI Robots' trading engine powered by Advanced Technical Analysis.
    REQUIREMENT: Provide exactly: ${requests.join(', ')}.
    
    ANALYSIS METHODOLOGY:
    You must simulate analyzing the Live Trading Charts (Candlestick patterns).
    For each pick, identify a specific 'Chart Pattern' (e.g., Bull Flag, Cup & Handle, Double Bottom, Ascending Triangle).
    
    IMPORTANT JSON RULES:
    1. Output ONLY the official ticker symbol in 'symbol' field (e.g. TATAMOTORS, RELIANCE).
    2. Assign 'type' correctly ('STOCK', 'MCX', 'FOREX', 'CRYPTO').
    3. For MCX/Forex, provide lot size.
    4. For Stocks, explicitly set 'timeframe' to 'INTRADAY', 'BTST', 'WEEKLY', or 'MONTHLY'.
    5. Include the identified 'chartPattern'.
    
    Return the response as a JSON array.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are an expert technical analyst using Moving Averages, RSI, MACD, and Price Action. Time: ${isPostMarket ? 'After Close' : 'Live'}.`,
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
              chartPattern: { type: Type.STRING, description: "e.g., Bull Flag, Head & Shoulders" },
              riskLevel: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
              targetPrice: { type: Type.NUMBER },
              lotSize: { type: Type.NUMBER },
              timeframe: { type: Type.STRING, enum: ["INTRADAY", "BTST", "WEEKLY", "MONTHLY"] }
            },
            required: ["symbol", "name", "type", "sector", "currentPrice", "reason", "riskLevel", "targetPrice", "lotSize", "chartPattern"]
          }
        }
      }
    });

    let data: StockRecommendation[] = [];
    if (response.text) {
        data = JSON.parse(response.text) as StockRecommendation[];
        // FORCE SYMBOL AS NAME FOR STOCKS to avoid confusion
        data = data.map(item => {
            const upperSymbol = item.symbol.toUpperCase();
            let finalName = item.name;
            
            if (item.type === 'STOCK') {
                // Try to get official name from CSV lookup
                const csvName = getCompanyName(upperSymbol);
                // If the CSV name differs from symbol (meaning lookup succeeded), use it.
                // Or if the API didn't give a descriptive name, use CSV name.
                if (csvName !== upperSymbol) {
                    finalName = csvName;
                } else if (item.name === item.symbol) {
                     // Fallback if API returned symbol as name and no CSV match (unlikely for big stocks)
                     finalName = upperSymbol;
                }
            }

            return {
                ...item,
                name: finalName,
                symbol: upperSymbol
            };
        });
    }
    return data;

  } catch (error) {
    console.error("Failed to fetch picks (Using Fallback):", error);
    
    // Fallback Logic
    const fallback: StockRecommendation[] = [];
    if (markets.stocks) {
        // Tata Stocks Included per user request
        fallback.push({ symbol: "TATASTEEL", name: getCompanyName("TATASTEEL"), type: "STOCK", sector: "Metals", currentPrice: 150, reason: "Global Infra Push", riskLevel: "Medium", targetPrice: 160, lotSize: 1, timeframe: "WEEKLY", chartPattern: "Ascending Triangle" });
        fallback.push({ symbol: "TATAMOTORS", name: getCompanyName("TATAMOTORS"), type: "STOCK", sector: "Auto", currentPrice: 980, reason: "EV Sales Growth", riskLevel: "High", targetPrice: 1050, lotSize: 1, timeframe: "BTST", chartPattern: "Bull Flag" });
        fallback.push({ symbol: "TATAPOWER", name: getCompanyName("TATAPOWER"), type: "STOCK", sector: "Power", currentPrice: 410, reason: "Green Energy Demand", riskLevel: "Medium", targetPrice: 440, lotSize: 1, timeframe: "MONTHLY", chartPattern: "Cup and Handle" });
        fallback.push({ symbol: "TCS", name: getCompanyName("TCS"), type: "STOCK", sector: "IT", currentPrice: 4000, reason: "Deal Wins", riskLevel: "Low", targetPrice: 4200, lotSize: 1, timeframe: "MONTHLY", chartPattern: "Double Bottom" });
        
        // Other Picks
        fallback.push({ symbol: "RELIANCE", name: getCompanyName("RELIANCE"), type: "STOCK", sector: "Energy", currentPrice: 2900, reason: "Telecom ARPU", riskLevel: "Medium", targetPrice: 3000, lotSize: 1, timeframe: "WEEKLY", chartPattern: "Channel Up" });
        fallback.push({ symbol: "SBIN", name: getCompanyName("SBIN"), type: "STOCK", sector: "Bank", currentPrice: 780, reason: "Support Bounce", riskLevel: "Low", targetPrice: 800, lotSize: 1, timeframe: "BTST", chartPattern: "Double Bottom" });
        fallback.push({ symbol: "ITC", name: getCompanyName("ITC"), type: "STOCK", sector: "FMCG", currentPrice: 420, reason: "Defensive", riskLevel: "Low", targetPrice: 450, lotSize: 1, timeframe: "MONTHLY", chartPattern: "Channel Up" });
    }
    if (markets.mcx) fallback.push({ symbol: "GOLD", name: "Gold Futures (MCX)", type: "MCX", sector: "Commodity", currentPrice: 72000, reason: "Safe Haven", riskLevel: "Low", targetPrice: 72500, lotSize: 1, timeframe: "INTRADAY", chartPattern: "Cup and Handle" });
    if (markets.crypto) fallback.push({ symbol: "BTC", name: "Bitcoin", type: "CRYPTO", sector: "Digital", currentPrice: 65000, reason: "ETF Inflow", riskLevel: "High", targetPrice: 66000, lotSize: 0.01, timeframe: "INTRADAY", chartPattern: "Golden Cross" });

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