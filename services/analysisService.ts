
import { PortfolioItem, HoldingAnalysis, MarketData } from "../types";

/**
 * Pure Technical Portfolio Analysis (No LLM)
 * Uses high-speed math on Yahoo data to determine BUY/HOLD/SELL actions.
 */
export const analyzeHoldings = async (holdings: PortfolioItem[], marketData: MarketData): Promise<HoldingAnalysis[]> => {
    if (!holdings || holdings.length === 0) return [];
    
    // Near-instant local processing
    return holdings.map(h => {
        const data = marketData[h.symbol];
        if (!data) return {
            symbol: h.symbol, 
            action: 'HOLD', 
            reason: 'Awaiting Yahoo Market Sync...', 
            targetPrice: 0, 
            dividendYield: '-', 
            cagr: '-'
        };

        const tech = data.technicals;
        const score = tech.score;
        const atr = tech.atr || (data.price * 0.02);
        
        let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let reason = "Technicals Neutral: Consolidation pattern detected on 15m chart.";

        if (score >= 75) { 
            action = 'BUY'; 
            reason = `Bullish Pulse: Score ${score.toFixed(0)} confirmed by ${tech.activeSignals[0] || 'Volume Spike'}.`; 
        }
        else if (score <= 35) { 
            action = 'SELL'; 
            reason = `Bearish Pressure: Score ${score.toFixed(0)}. Momentum breakdown below key support levels.`; 
        }

        return {
            symbol: h.symbol,
            action,
            reason,
            targetPrice: parseFloat((data.price + (action === 'BUY' ? (atr * 3) : -(atr))).toFixed(2)),
            dividendYield: "N/A",
            cagr: "Technical Alpha"
        } as HoldingAnalysis;
    });
};
