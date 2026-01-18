
import { PortfolioItem, HoldingAnalysis, MarketData } from "../types";

/**
 * Recommendation services now handled locally to ensure zero API dependency.
 */

/**
 * Pure Local Portfolio Analysis
 * Uses technical indicator scores to determine BUY/HOLD/SELL actions.
 */
export const analyzeHoldings = async (holdings: PortfolioItem[], marketData: MarketData): Promise<HoldingAnalysis[]> => {
    if (!holdings || holdings.length === 0) return [];
    
    // Simulate thinking delay for UI feedback
    await new Promise(r => setTimeout(r, 1500));

    return holdings.map(h => {
        const data = marketData[h.symbol];
        if (!data) return {
            symbol: h.symbol, 
            action: 'HOLD', 
            reason: 'Syncing market data...', 
            targetPrice: 0, 
            dividendYield: '-', 
            cagr: '-'
        };

        const score = data.technicals.score;
        const atr = data.technicals.atr || (data.price * 0.02);
        
        let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let reason = "Maintaining current position based on neutral technical score.";

        if (score >= 75) { 
            action = 'BUY'; 
            reason = `Strong technical momentum (Score: ${score.toFixed(0)}). Volume expansion confirms bullish continuation.`; 
        }
        else if (score <= 35) { 
            action = 'SELL'; 
            reason = "Technical score breakdown detected. Momentum fading; consider exiting or tightening stop losses."; 
        }

        return {
            symbol: h.symbol,
            action,
            reason,
            targetPrice: parseFloat((data.price + (action === 'BUY' ? (atr * 3) : -(atr))).toFixed(2)),
            dividendYield: "N/A",
            cagr: "Local Logic"
        } as HoldingAnalysis;
    });
};
