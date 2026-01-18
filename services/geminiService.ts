
import { GoogleGenAI, Type } from "@google/genai";
import { PortfolioItem, HoldingAnalysis, MarketData } from "../types";

/**
 * Recommendations are now handled locally by recommendationEngine.ts technical scanner.
 * This service is kept for type compatibility but logic is minimized.
 */

export const fetchTopStockPicks = async (): Promise<any[]> => {
  console.warn("fetchTopStockPicks via Gemini is deprecated. Use runTechnicalScan.");
  return [];
};

// Fixed: Implementation of analyzeHoldings using the Gemini 3 Pro model to generate structured technical analysis.
export const analyzeHoldings = async (holdings: PortfolioItem[], marketData: MarketData): Promise<HoldingAnalysis[]> => {
    if (!holdings || holdings.length === 0) return [];
    
    // Always initialize the client with process.env.API_KEY inside the function as per guidelines.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Prepare concise data for the model to minimize token usage and improve reasoning.
    const context = holdings.map(h => {
        const data = marketData[h.symbol];
        return {
            symbol: h.symbol,
            quantity: h.quantity,
            avgCost: h.avgCost,
            currentPrice: data?.price,
            technicals: data?.technicals ? {
                score: data.technicals.score,
                rsi: data.technicals.rsi,
                adx: data.technicals.adx,
                signals: data.technicals.activeSignals
            } : 'No live data available'
        };
    });

    const prompt = `Act as a professional financial research analyst. Analyze the following portfolio based on the provided technical indicators and current market price. 
    For each stock, provide a recommendation: BUY, HOLD, or SELL. 
    Include a clear technical reason, a 12-month target price, an estimated dividend yield, and an estimated CAGR.
    
    Portfolio Data: ${JSON.stringify(context)}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            symbol: { type: Type.STRING },
                            action: { type: Type.STRING, description: "Must be BUY, HOLD, or SELL" },
                            reason: { type: Type.STRING },
                            targetPrice: { type: Type.NUMBER },
                            dividendYield: { type: Type.STRING },
                            cagr: { type: Type.STRING },
                        },
                        required: ["symbol", "action", "reason", "targetPrice", "dividendYield", "cagr"],
                    },
                },
            },
        });

        const text = response.text;
        if (!text) throw new Error("AI returned an empty response.");
        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini portfolio analysis failed, falling back to local logic", error);
        
        // Fallback logic for offline or failed API calls
        return holdings.map(h => {
            const data = marketData[h.symbol];
            if (!data) return {
                symbol: h.symbol, action: 'HOLD', reason: 'Syncing market data...', targetPrice: 0, dividendYield: '-', cagr: '-'
            };

            const score = data.technicals.score;
            const atr = data.technicals.atr || (data.price * 0.02);
            
            let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
            let reason = "Maintaining current position based on neutral technical score.";

            if (score >= 75) { action = 'BUY'; reason = "Strong technical momentum and volume expansion."; }
            else if (score <= 35) { action = 'SELL'; reason = "Potential trend reversal or bearish breakdown detected."; }

            return {
                symbol: h.symbol,
                action,
                reason,
                targetPrice: parseFloat((data.price + (action === 'BUY' ? (atr * 2) : -(atr))).toFixed(2)),
                dividendYield: "0.00%",
                cagr: "N/A"
            };
        });
    }
};
