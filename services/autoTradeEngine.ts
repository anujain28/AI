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

export const runAutoTradeEngine = (
    settings: AppSettings, 
    portfolio: PortfolioItem[], 
    marketData: MarketData, 
    funds: Funds,
    recommendations: StockRecommendation[]
): TradeResult[] => {
    
    if (!settings.activeBrokers.includes('PAPER')) return [];

    const results: TradeResult[] = [];
    let currentFunds = { ...funds };
    const paperPortfolio = portfolio.filter(p => p.broker === 'PAPER');

    // 1. MANAGE EXITS
    paperPortfolio.forEach(item => {
        const status = getMarketStatus('STOCK');
        if (!status.isOpen) return; 

        const data = marketData[item.symbol];
        if (!data) return;

        const pnl = ((data.price - item.avgCost) / item.avgCost) * 100;
        
        let shouldExit = false;
        let exitReason = "";

        if (pnl <= -3.0) { shouldExit = true; exitReason = "Stop Loss Hit"; }
        else if (pnl >= 8.0) { shouldExit = true; exitReason = "Target Hit"; }
        else if (data.technicals.score < 25) { shouldExit = true; exitReason = "Technical Breakdown"; }
        
        if (shouldExit) {
            currentFunds.stock += (data.price * item.quantity); 
            results.push({
                executed: true,
                transaction: {
                    id: `bot-sell-${Date.now()}`,
                    type: 'SELL', symbol: item.symbol, assetType: 'STOCK',
                    quantity: item.quantity, price: data.price, timestamp: Date.now(), broker: 'PAPER'
                },
                newFunds: { ...currentFunds }, reason: exitReason
            });
        }
    });

    // 2. ENTRY LOGIC
    if (paperPortfolio.length >= MAX_GLOBAL_POSITIONS) return results;

    const candidates = recommendations
        .filter(r => {
            const data = marketData[r.symbol];
            const score = data?.technicals.score || 0;
            const marketStatus = getMarketStatus('STOCK');
            return score >= 60 && marketStatus.isOpen && !paperPortfolio.find(p => p.symbol === r.symbol);
        })
        .sort((a, b) => (marketData[b.symbol]?.technicals.score || 0) - (marketData[a.symbol]?.technicals.score || 0));

    for (const rec of candidates) {
        if (results.some(r => r.transaction?.type === 'BUY')) break;

        const data = marketData[rec.symbol];
        if (!data) continue;

        const available = currentFunds.stock;
        const allocationFactor = 0.20; // 20% of funds
        const tradeValue = available * allocationFactor;
        const qty = Math.floor(tradeValue / data.price);

        if (qty > 0 && available >= (qty * data.price)) {
            currentFunds.stock -= (qty * data.price);
            results.push({
                executed: true,
                transaction: {
                    id: `bot-buy-${Date.now()}`,
                    type: 'BUY', symbol: rec.symbol, assetType: 'STOCK',
                    quantity: qty, price: data.price, timestamp: Date.now(), broker: 'PAPER'
                },
                newFunds: { ...currentFunds }, 
                reason: "AI Technical Crossover"
            });
            break;
        }
    }

    return results;
};
