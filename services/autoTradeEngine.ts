import { AppSettings, MarketData, PortfolioItem, StockRecommendation, Transaction, Funds } from "../types";
import { getMarketStatus } from "./marketStatusService";

export interface TradeResult {
    executed: boolean;
    transaction?: Transaction;
    newFunds?: Funds;
    newPortfolio?: PortfolioItem[];
    reason?: string;
    isSliced?: boolean;
}

const MAX_GLOBAL_POSITIONS = 5; 
const FLAT_BROKERAGE = 20; 

/**
 * Automates portfolio management.
 * Adheres to market hours (09:15-15:30 IST) and uses slicing for institutional feel.
 */
export const runAutoTradeEngine = (
    settings: AppSettings, 
    portfolio: PortfolioItem[], 
    marketData: MarketData, 
    funds: Funds,
    recommendations: StockRecommendation[]
): TradeResult[] => {
    
    const marketStatus = getMarketStatus('STOCK');
    
    // Only trade during active NSE session
    if (!marketStatus.isOpen) {
        return [];
    }

    if (!settings.activeBrokers.includes('PAPER')) return [];

    const results: TradeResult[] = [];
    let currentFunds = { ...funds };
    const paperPortfolio = portfolio.filter(p => p.broker === 'PAPER');

    // 1. EXIT LOGIC (Trailing SL & TP)
    paperPortfolio.forEach(item => {
        const data = marketData[item.symbol];
        if (!data) return;

        const pnlPercent = ((data.price - item.avgCost) / item.avgCost) * 100;
        const atr = data.technicals.atr || (data.price * 0.02);
        
        let shouldExit = false;
        let exitReason = "";

        // Intelligent Trailing Stop (1.5x ATR)
        if (data.price < item.avgCost - (atr * 1.5)) {
            shouldExit = true;
            exitReason = "SL Hit: ATR Volatility Guard";
        }
        // Strategic Take Profit
        else if (pnlPercent >= 5.5) {
            shouldExit = true;
            exitReason = "TP Target: Multi-day High reached";
        }
        // EOD Square-off (15:20 IST)
        else if (marketStatus.message.includes('15:') && parseInt(marketStatus.message.split(':')[1]) >= 20) {
            shouldExit = true;
            exitReason = "EOD Square-Off Auto-Robot";
        }

        if (shouldExit) {
            const proceeds = (data.price * item.quantity) - FLAT_BROKERAGE;
            currentFunds.stock += proceeds; 
            results.push({
                executed: true,
                transaction: {
                    id: `bot-exit-${Date.now()}-${item.symbol}`,
                    type: 'SELL', symbol: item.symbol, assetType: 'STOCK',
                    quantity: item.quantity, price: data.price, timestamp: Date.now(), 
                    broker: 'PAPER', brokerage: FLAT_BROKERAGE, timeframe: 'INTRADAY'
                },
                newFunds: { ...currentFunds }, 
                reason: exitReason,
                isSliced: item.quantity > 50
            });
        }
    });

    // 2. ENTRY LOGIC (High-Conviction Robot Picks)
    if (paperPortfolio.length >= MAX_GLOBAL_POSITIONS) return results;

    const topCandidate = recommendations.find(r => {
        const data = marketData[r.symbol];
        return r.isTopPick && data && data.technicals.score >= 80 && !paperPortfolio.some(p => p.symbol === r.symbol);
    });

    if (topCandidate) {
        const data = marketData[topCandidate.symbol]!;
        const budget = currentFunds.stock * (settings.autoTradeConfig?.value / 100 || 0.1); 
        const qty = Math.floor(budget / data.price);
        const cost = (qty * data.price) + FLAT_BROKERAGE;

        if (qty > 0 && currentFunds.stock >= cost) {
            currentFunds.stock -= cost;
            results.push({
                executed: true,
                transaction: {
                    id: `bot-entry-${Date.now()}-${topCandidate.symbol}`,
                    type: 'BUY', symbol: topCandidate.symbol, assetType: 'STOCK',
                    quantity: qty, price: data.price, timestamp: Date.now(), 
                    broker: 'PAPER', brokerage: FLAT_BROKERAGE, timeframe: 'INTRADAY'
                },
                newFunds: { ...currentFunds }, 
                reason: `AI Robot Signal: ${data.technicals.activeSignals[0] || 'Alpha Breakout'}`,
                isSliced: qty > 50
            });
        }
    }

    return results;
};
