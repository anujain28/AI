import { AppSettings, MarketData, PortfolioItem, StockRecommendation, Transaction, Funds, AssetType } from "../types";
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

    const getFundKey = (type: AssetType): keyof Funds => {
        if (type === 'MCX') return 'mcx';
        if (type === 'FOREX') return 'forex';
        return 'stock';
    };

    // 1. MANAGE EXITS (Aggressive targets for AIRobots picks)
    paperPortfolio.forEach(item => {
        const status = getMarketStatus(item.type);
        if (!status.isOpen) return; 

        const data = marketData[item.symbol];
        if (!data) return;

        const pnl = ((data.price - item.avgCost) / item.avgCost) * 100;
        const rec = recommendations.find(r => r.symbol === item.symbol);
        
        let shouldExit = false;
        let exitReason = "";

        if (pnl <= -3.0) { shouldExit = true; exitReason = "Stop Loss Hit"; }
        else if (pnl >= 8.0) { shouldExit = true; exitReason = "Target Hit"; }
        else if (data.technicals.score < 25) { shouldExit = true; exitReason = "Technical Breakdown"; }
        
        if (shouldExit) {
            const key = getFundKey(item.type);
            currentFunds[key] += (data.price * item.quantity); 
            results.push({
                executed: true,
                transaction: {
                    id: `bot-sell-${Date.now()}`,
                    type: 'SELL', symbol: item.symbol, assetType: item.type,
                    quantity: item.quantity, price: data.price, timestamp: Date.now(), broker: 'PAPER'
                },
                newFunds: { ...currentFunds }, reason: exitReason
            });
        }
    });

    // 2. ENTRY LOGIC (Prioritize AIRobots Top Picks)
    if (paperPortfolio.length >= MAX_GLOBAL_POSITIONS) return results;

    const candidates = recommendations
        .filter(r => {
            const data = marketData[r.symbol];
            const score = data?.technicals.score || 0;
            const marketStatus = getMarketStatus(r.type);
            return score >= 60 && marketStatus.isOpen && !paperPortfolio.find(p => p.symbol === r.symbol);
        })
        .sort((a, b) => {
            // Prioritize AIRobots Top Picks first
            if (a.isTopPick && !b.isTopPick) return -1;
            if (!a.isTopPick && b.isTopPick) return 1;
            return (marketData[b.symbol]?.technicals.score || 0) - (marketData[a.symbol]?.technicals.score || 0);
        });

    for (const rec of candidates) {
        if (results.some(r => r.transaction?.type === 'BUY')) break; // One buy per loop

        const data = marketData[rec.symbol];
        if (!data) continue;

        const fundKey = getFundKey(rec.type);
        const available = currentFunds[fundKey];
        
        // Dynamic Allocation: Use 25% of fund for Top Picks, 15% for regular
        const allocationFactor = rec.isTopPick ? 0.25 : 0.15;
        const tradeValue = (available + paperPortfolio.reduce((a,b)=>a+b.totalCost,0)) * allocationFactor;
        const qty = Math.floor(tradeValue / data.price);

        if (qty > 0 && available >= (qty * data.price)) {
            currentFunds[fundKey] -= (qty * data.price);
            results.push({
                executed: true,
                transaction: {
                    id: `bot-buy-${Date.now()}`,
                    type: 'BUY', symbol: rec.symbol, assetType: rec.type,
                    quantity: qty, price: data.price, timestamp: Date.now(), broker: 'PAPER'
                },
                newFunds: { ...currentFunds }, 
                reason: rec.isTopPick ? "AIRobots Signal" : "AI Technical Crossover"
            });
            break;
        }
    }

    return results;
};