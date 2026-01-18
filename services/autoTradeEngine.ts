
import { AppSettings, MarketData, PortfolioItem, StockRecommendation, Transaction, Funds } from "../types";
import { getMarketStatus } from "./marketStatusService";

export interface TradeResult {
    executed: boolean;
    transaction?: Transaction;
    newFunds?: Funds;
    newPortfolio?: PortfolioItem[];
    reason?: string;
}

const MAX_GLOBAL_POSITIONS = 5; 
const FLAT_BROKERAGE = 20; 

export const runAutoTradeEngine = (
    settings: AppSettings, 
    portfolio: PortfolioItem[], 
    marketData: MarketData, 
    funds: Funds,
    recommendations: StockRecommendation[]
): TradeResult[] => {
    
    const marketStatus = getMarketStatus('STOCK');
    
    // AUTO-BOT SAFETY GATE: Only trade during NSE market hours
    if (!marketStatus.isOpen) {
        return [];
    }

    if (!settings.activeBrokers.includes('PAPER')) return [];

    const results: TradeResult[] = [];
    let currentFunds = { ...funds };
    const paperPortfolio = portfolio.filter(p => p.broker === 'PAPER');
    
    // Slicing logic is handled by brokerService, so here we just trigger the intent.

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
            exitReason = "SL Hit (ATR Volatility)";
        }
        // Take Profit (Target Price or 5% gain)
        else if (pnlPercent >= 5.0) {
            shouldExit = true;
            exitReason = "TP Target Achieved";
        }
        // End of Day Square Off (15:20 IST)
        else if (marketStatus.message.includes('15:') && parseInt(marketStatus.message.split(':')[1]) >= 20) {
            shouldExit = true;
            exitReason = "EOD Square-Off System";
        }

        if (shouldExit) {
            const proceeds = (data.price * item.quantity) - FLAT_BROKERAGE;
            currentFunds.stock += proceeds; 
            results.push({
                executed: true,
                transaction: {
                    id: `bot-sell-${Date.now()}`,
                    type: 'SELL', symbol: item.symbol, assetType: 'STOCK',
                    quantity: item.quantity, price: data.price, timestamp: Date.now(), 
                    broker: 'PAPER', brokerage: FLAT_BROKERAGE, timeframe: 'INTRADAY'
                },
                newFunds: { ...currentFunds }, 
                reason: exitReason
            });
        }
    });

    // 2. ENTRY STRATEGY (Momentum Alpha)
    if (paperPortfolio.length >= MAX_GLOBAL_POSITIONS) return results;

    const topCandidate = recommendations.find(r => {
        const data = marketData[r.symbol];
        return data && data.technicals.score >= 85 && !paperPortfolio.some(p => p.symbol === r.symbol);
    });

    if (topCandidate) {
        const data = marketData[topCandidate.symbol]!;
        const budget = currentFunds.stock * 0.1; // 10% exposure per trade
        const qty = Math.floor(budget / data.price);
        const cost = (qty * data.price) + FLAT_BROKERAGE;

        if (qty > 0 && currentFunds.stock >= cost) {
            currentFunds.stock -= cost;
            results.push({
                executed: true,
                transaction: {
                    id: `bot-buy-${Date.now()}`,
                    type: 'BUY', symbol: topCandidate.symbol, assetType: 'STOCK',
                    quantity: qty, price: data.price, timestamp: Date.now(), 
                    broker: 'PAPER', brokerage: FLAT_BROKERAGE, timeframe: 'INTRADAY'
                },
                newFunds: { ...currentFunds }, 
                reason: `Alpha Pulse Entry: ${data.technicals.activeSignals[0]}`
            });
        }
    }

    return results;
};
