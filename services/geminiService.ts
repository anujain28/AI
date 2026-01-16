import { GoogleGenAI, Type } from "@google/genai";
import { StockRecommendation, MarketSettings, PortfolioItem, HoldingAnalysis, MarketData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchTopStockPicks = async (
    totalCapital: number, 
    stockUniverse: string[] = [], 
    markets: MarketSettings = { stocks: true }
): Promise<StockRecommendation[]> => {
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Find the current top 5 high-momentum Indian stock recommendations from 'https://airobots.streamlit.app/'. 
      If reachable, use the 'Trading Robot' picks. Otherwise, find the latest reliable momentum stock picks for the NSE/BSE market.
      For each stock, provide: symbol (NSE format like RELIANCE.NS), name, expected target, and a short 1-sentence reason. 
      Return the data as a clean JSON array.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              symbol: { type: Type.STRING },
              name: { type: Type.STRING },
              targetPrice: { type: Type.NUMBER },
              reason: { type: Type.STRING },
              riskLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
              timeframe: { type: Type.STRING, enum: ['INTRADAY', 'BTST', 'WEEKLY', 'MONTHLY'] }
            },
            required: ['symbol', 'name', 'targetPrice', 'reason']
          }
        }
      }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sourceUrl = groundingChunks?.[0]?.web?.uri || 'https://airobots.streamlit.app/';
    
    let picks: any[] = JSON.parse(response.text || '[]');
    
    return picks.map(p => ({
      ...p,
      symbol: p.symbol.includes('.') ? p.symbol : `${p.symbol}.NS`,
      type: 'STOCK',
      sector: 'AI Momentum Pick',
      currentPrice: 0,
      lotSize: 1,
      chartPattern: 'Momentum Breakout',
      isTopPick: true,
      sourceUrl
    }));
  } catch (e) {
    console.error("Gemini Recommendations Failed", e);
    return [];
  }
};

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

        if (score >= 75) { action = 'BUY'; reason = "Strong Momentum"; }
        else if (score <= 35) { action = 'SELL'; reason = "Trend Reversal"; }

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
