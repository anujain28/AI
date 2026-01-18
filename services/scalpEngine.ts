
import { AppSettings, MarketData, PortfolioItem, StockRecommendation, Transaction, Funds, BrokerID } from "../types";

export interface ScalpResult {
    executed: boolean;
    transaction?: Transaction;
    newFunds?: Funds;
    reason?: string;
}

const SCALP_TARGET = 0.005; // 0.5% profit
const SCALP_STOP = 0.003; // 0.3% stop loss
const FLAT_BROKERAGE = 20;

/**
 * High-Speed Scalp Logic
 * Monitors micro-momentum for instant entries and technical-based exits.
 */
export const runScalpAutoEngine = (
    settings: AppSettings,
    holdings: PortfolioItem[],
    marketData: MarketData,
    funds: Funds,
    recommendations: StockRecommendation[]
): ScalpResult[] => {
    
    const results: ScalpResult[] = [];
    const scalpHoldings = holdings.filter(h => h.broker === 'PAPER' && h.timeframe === 'INTRADAY');
    let currentFunds = { ...funds };

    // 1. MONITOR EXITS
    scalpHoldings.forEach(item => {
        const data = marketData[item.symbol];
        if (!data) return;

        const currentPrice = data.price;
        const pnlPercent = (currentPrice - item.avgCost) / item.avgCost;

        let shouldExit = false;
        let reason = "";

        if (pnlPercent >= SCALP_TARGET) {
            shouldExit = true;
            reason = `Scalp Target Hit (+${(pnlPercent * 100).toFixed(2)}%)`;
        } else if (pnlPercent <= -SCALP_STOP) {
            shouldExit = true;
            reason = `Scalp Stop Hit (${(pnlPercent * 100).toFixed(2)}%)`;
        }

        if (shouldExit) {
            const proceeds = (currentPrice * item.quantity) - FLAT_BROKERAGE;
            currentFunds.stock += proceeds;
            results.push({
                executed: true,
                transaction: {
                    id: `scalp-exit-${Date.now()}-${item.symbol}`,
                    type: 'SELL', symbol: item.symbol, assetType: 'STOCK',
                    quantity: item.quantity, price: currentPrice, timestamp: Date.now(),
                    broker: 'PAPER', brokerage: FLAT_BROKERAGE, timeframe: 'INTRADAY'
                },
                newFunds: { ...currentFunds },
                reason
            });
        }
    });

    // 2. MONITOR ENTRIES (Only if we have capacity)
    if (scalpHoldings.length >= 2) return results; // Max 2 concurrent micro-scalps

    // Look for ultra-high conviction signals in the hotlist
    const entryCandidate = recommendations.find(r => {
        const data = marketData[r.symbol];
        if (!data) return false;
        // Super-momentum threshold: RSI > 65, RVOL > 2.0, Score > 110
        const isSuperMomentum = data.technicals.rsi > 65 && data.technicals.rvol > 2.0 && (r.score || 0) >= 110;
        return isSuperMomentum && !scalpHoldings.some(h => h.symbol === r.symbol);
    });

    if (entryCandidate) {
        const data = marketData[entryCandidate.symbol]!;
        const scalpBudget = currentFunds.stock * 0.2; // 20% budget per scalp
        const qty = Math.floor(scalpBudget / data.price);
        const cost = (qty * data.price) + FLAT_BROKERAGE;

        if (qty > 0 && currentFunds.stock >= cost) {
            currentFunds.stock -= cost;
            results.push({
                executed: true,
                transaction: {
                    id: `scalp-entry-${Date.now()}-${entryCandidate.symbol}`,
                    type: 'BUY', symbol: entryCandidate.symbol, assetType: 'STOCK',
                    quantity: qty, price: data.price, timestamp: Date.now(),
                    broker: 'PAPER', brokerage: FLAT_BROKERAGE, timeframe: 'INTRADAY'
                },
                newFunds: { ...currentFunds },
                reason: `Auto-Scalp: Super-Momentum Burst detected`
            });
        }
    }

    return results;
};
