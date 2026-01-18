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
 * In Weekend Explorer mode, the bot focuses on research and EOD reporting.
 * During market hours, it uses institutional slicing for entries/exits.
 */
export const runAutoTradeEngine = (
    settings: AppSettings, 
    portfolio: PortfolioItem[], 
    marketData: MarketData, 
    funds: Funds,
    recommendations: StockRecommendation[]
): TradeResult[] => {
    
    const marketStatus = getMarketStatus('STOCK');
    
    // AUTO-BOT SAFETY GATE: No real trading during weekends or after hours
    if (!marketStatus.isOpen) {
        return [];
    }

    if (!settings.activeBrokers.includes('PAPER')) return [];

    const results: TradeResult[] = [];
    let currentFunds = { ...funds };
    const paperPortfolio = portfolio.filter(p => p.broker === 'PAPER');

    // 1. EXIT STRATEGY (Risk Management)
    paperPortfolio.forEach(item => {
        const data = marketData[item.symbol];
        if (!data) return;

        const pnlPercent = ((data.price - item.avgCost) / item.avgCost) * 100;
        const atr = data.technicals.atr || (data.price * 0.02);
        
        let shouldExit = false;
        let exitReason = "";

        // Trailing Stop Loss (1.5x ATR)
        if (data.price < item.avgCost - (atr * 1.5)) {
            shouldExit = true;
            exitReason = "SL Hit: ATR Dynamic Support Breached";
        }
        // Take Profit (Target Price or 6% spike)
        else if (pnlPercent >= 6.0) {
            shouldExit = true;
            exitReason = "TP Hit: Profit Target Optimized";
        }
        // End of Day Square Off (15:20 IST)
        else if (marketStatus.message.includes('15:') && parseInt(marketStatus.message.split(':')[1]) >= 20) {
            shouldExit = true;
            exitReason = "EOD Logic: Automated Closing";
        }

        if (shouldExit) {
            const proceeds = (data.price * item.quantity) - FLAT_BROKERAGE;
            currentFunds.stock += proceeds; 
            results.push({
                executed: true,
                transaction: {
                    id: `bot-sell-${Date.now()}-${item.symbol}`,
                    type: 'SELL', symbol: item.symbol, assetType: 'STOCK',
                    quantity: item.quantity, price: data.price, timestamp: Date.now(), 
                    broker: 'PAPER', brokerage: FLAT_BROKERAGE, timeframe: 'INTRADAY'
                },
                newFunds: { ...currentFunds }, 
                reason: exitReason,
                isSliced: item.quantity > 50 // Trigger slicing for larger blocks
            });
        }
    });

    // 2. ENTRY STRATEGY (Momentum Robot Picks)
    if (paperPortfolio.length >= MAX_GLOBAL_POSITIONS) return results;

    // Use isTopPick to follow "AI Robot" high-conviction ideas
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
                    id: `bot-buy-${Date.now()}-${topCandidate.symbol}`,
                    type: 'BUY', symbol: topCandidate.symbol, assetType: 'STOCK',
                    quantity: qty, price: data.price, timestamp: Date.now(), 
                    broker: 'PAPER', brokerage: FLAT_BROKERAGE, timeframe: 'INTRADAY'
                },
                newFunds: { ...currentFunds }, 
                reason: `AI Robot Alpha: ${data.technicals.activeSignals[0] || 'High Score Entry'}`,
                isSliced: qty > 50 // Institutional slicing for bigger bets
            });
        }
    }

    return results;
};