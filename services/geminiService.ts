import { PortfolioItem, HoldingAnalysis, MarketData } from "../types";

/**
 * Recommendations are now handled locally by recommendationEngine.ts technical scanner.
 * This service is kept for type compatibility but logic is minimized.
 */

export const fetchTopStockPicks = async (): Promise<any[]> => {
  console.warn("fetchTopStockPicks via Gemini is deprecated. Use runTechnicalScan.");
  return [];
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