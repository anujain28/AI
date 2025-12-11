import { AppSettings, MarketData, PortfolioItem, StockRecommendation, Transaction, Funds } from "../types";

export interface TradeResult {
    executed: boolean;
    transaction?: Transaction;
    newFunds?: Funds;
    newPortfolio?: PortfolioItem[];
    reason?: string;
}

export const runAutoTradeEngine = (
    settings: AppSettings, 
    portfolio: PortfolioItem[], 
    marketData: MarketData, 
    funds: Funds,
    recommendations: StockRecommendation[]
): TradeResult[] => {
    
    // Only run if bots are enabled
    if (!settings.activeBrokers.includes('PAPER')) return [];

    const results: TradeResult[] = [];
    let currentFunds = { ...funds };
    let currentPortfolio = [...portfolio];

    // 1. Check for Exits (Stop Loss / Targets)
    currentPortfolio.forEach(item => {
        if (item.broker !== 'PAPER') return; // Only automate paper for now
        
        const data = marketData[item.symbol];
        if (!data) return;

        const price = data.price;
        const pnlPercent = ((price - item.avgCost) / item.avgCost) * 100;

        // Simple Rule: Stop Loss at -2%, Target at +4% (Simulated)
        // Or use dynamic technicals if available
        let action = null;
        if (pnlPercent <= -2) action = 'STOP_LOSS';
        if (pnlPercent >= 4) action = 'TARGET_HIT';

        if (action) {
            currentFunds.stock += (price * item.quantity);
            const tx: Transaction = {
                id: Date.now().toString() + Math.random(),
                type: 'SELL',
                symbol: item.symbol,
                assetType: item.type,
                quantity: item.quantity,
                price: price,
                timestamp: Date.now(),
                broker: 'PAPER'
            };
            results.push({ executed: true, transaction: tx, reason: `Auto ${action}` });
            // Mark for removal (handled by caller typically, but we return structure)
        }
    });

    // 2. Check for Entries
    recommendations.forEach(rec => {
        // Skip if already in portfolio
        if (currentPortfolio.find(p => p.symbol === rec.symbol)) return;

        // Check technicals
        const data = marketData[rec.symbol];
        if (!data) return;

        // If Strong Buy and we have funds
        if (data.technicals.signalStrength === 'STRONG BUY') {
            const tradeAmt = settings.autoTradeConfig.mode === 'FIXED' 
                ? settings.autoTradeConfig.value 
                : (currentFunds.stock * (settings.autoTradeConfig.value / 100));
            
            if (currentFunds.stock > tradeAmt && tradeAmt > 0) {
                const qty = Math.floor(tradeAmt / data.price);
                if (qty > 0) {
                    currentFunds.stock -= (qty * data.price);
                    const tx: Transaction = {
                        id: Date.now().toString() + Math.random(),
                        type: 'BUY',
                        symbol: rec.symbol,
                        assetType: rec.type,
                        quantity: qty,
                        price: data.price,
                        timestamp: Date.now(),
                        broker: 'PAPER'
                    };
                    results.push({ executed: true, transaction: tx, reason: "Auto Entry Signal" });
                }
            }
        }
    });

    return results;
};

// Simulate "Offline" trades
export const simulateBackgroundTrades = (
    lastRunTime: number, 
    settings: AppSettings, 
    funds: Funds
): { newTransactions: Transaction[], newFunds: Funds } => {
    const now = Date.now();
    const hoursOffline = (now - lastRunTime) / (1000 * 60 * 60);
    
    // Only simulate if offline for more than 1 hour and less than 48 hours
    if (hoursOffline < 1 || hoursOffline > 48) return { newTransactions: [], newFunds: funds };

    // Simulate 1-3 random trades to show "activity"
    const tradeCount = Math.floor(Math.random() * 3) + 1;
    const newTransactions: Transaction[] = [];
    let simulatedFunds = { ...funds };

    const demoStocks = ["RELIANCE", "TATASTEEL", "INFY", "HDFCBANK"];

    for (let i = 0; i < tradeCount; i++) {
        const isBuy = Math.random() > 0.5;
        const symbol = demoStocks[Math.floor(Math.random() * demoStocks.length)];
        const price = 1000 + Math.random() * 500;
        const qty = 5;
        
        if (isBuy && simulatedFunds.stock > price * qty) {
            simulatedFunds.stock -= price * qty;
            newTransactions.push({
                id: `sim-${Date.now()}-${i}`,
                type: 'BUY',
                symbol,
                assetType: 'STOCK',
                quantity: qty,
                price: parseFloat(price.toFixed(2)),
                timestamp: now - (Math.random() * 1000000), // Random time in past
                broker: 'PAPER'
            });
        }
    }

    return { newTransactions, newFunds: simulatedFunds };
};