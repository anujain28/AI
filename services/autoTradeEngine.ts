
import { AppSettings, MarketData, PortfolioItem, StockRecommendation, Transaction, Funds } from "../types";
import { getMarketStatus } from "./marketStatusService";

export interface TradeResult {
    executed: boolean;
    transaction?: Transaction;
    newFunds?: Funds;
    newPortfolio?: PortfolioItem[];
    reason?: string;
}

// Config Constants
const MAX_POSITIONS = 5;
const SLICE_PERCENTAGE = 0.25; // Buy 25% of target allocation per slice (sliced manner)

export const runAutoTradeEngine = (
    settings: AppSettings, 
    portfolio: PortfolioItem[], 
    marketData: MarketData, 
    funds: Funds,
    recommendations: StockRecommendation[]
): TradeResult[] => {
    
    // Only run if paper bot is enabled
    if (!settings.activeBrokers.includes('PAPER')) return [];

    const results: TradeResult[] = [];
    let currentFunds = { ...funds };
    
    // Filter for current open paper positions
    const paperPortfolio = portfolio.filter(p => p.broker === 'PAPER');
    const openSymbols = paperPortfolio.map(p => p.symbol);

    // 1. MANAGE EXITS & HOLDING (Check Existing Positions)
    paperPortfolio.forEach(item => {
        // CHECK MARKET STATUS
        const marketStatus = getMarketStatus(item.type);
        if (!marketStatus.isOpen && item.type !== 'CRYPTO') return; // Hold if market closed

        const data = marketData[item.symbol];
        if (!data) return;

        const price = data.price;
        const pnlPercent = ((price - item.avgCost) / item.avgCost) * 100;
        const score = data.technicals.score;

        // EXIT RULES
        // Sell if:
        // 1. Stop Loss Hit (-2%)
        // 2. Target Hit (+5%)
        // 3. Technical Score drops below 30 (Weakness)
        let action = null;
        if (pnlPercent <= -2) action = 'STOP_LOSS';
        else if (pnlPercent >= 5) action = 'TARGET_HIT';
        else if (score < 30) action = 'WEAK_SIGNAL';
        
        // Sliced Exit: If in profit but score weakening, sell 50%? 
        // For simplicity in this engine, we fully exit on triggers to free up "Top 5" slots.
        
        if (action) {
            currentFunds.stock += (price * item.quantity);
            const tx: Transaction = {
                id: `auto-sell-${Date.now()}-${Math.random()}`,
                type: 'SELL',
                symbol: item.symbol,
                assetType: item.type,
                quantity: item.quantity,
                price: price,
                timestamp: Date.now(),
                broker: 'PAPER'
            };
            results.push({ executed: true, transaction: tx, reason: `Auto ${action}` });
        }
        // If no action, we implicitly HOLD (Carry forward to next day/cycle)
    });

    // 2. MANAGE ENTRIES (Sliced Entry for Best 5)
    
    // Determine how many slots available
    const slotsAvailable = MAX_POSITIONS - paperPortfolio.length;

    if (slotsAvailable > 0 || paperPortfolio.length < MAX_POSITIONS) {
        
        // Filter recommendations for "Strong Buy" signals
        // Sorted by Score (High to Low)
        const candidates = recommendations
            .filter(rec => {
                const status = getMarketStatus(rec.type);
                if (!status.isOpen && rec.type !== 'CRYPTO') return false;
                
                const data = marketData[rec.symbol];
                return data && data.technicals.signalStrength === 'STRONG BUY';
            })
            .sort((a, b) => {
                const scoreA = marketData[a.symbol]?.technicals.score || 0;
                const scoreB = marketData[b.symbol]?.technicals.score || 0;
                return scoreB - scoreA;
            });

        // We can interact with existing positions to "Slice In" (Add more)
        // Or pick new ones if slots open.
        
        for (const rec of candidates) {
            const data = marketData[rec.symbol];
            if (!data) continue;

            const existingPosition = paperPortfolio.find(p => p.symbol === rec.symbol);
            
            // Calculate Target Trade Size
            const totalCapitalForTrading = currentFunds.stock + 
                paperPortfolio.reduce((acc, p) => acc + (p.avgCost * p.quantity), 0); // Total Paper Account Value approx
            
            const allocationPerStock = settings.autoTradeConfig.mode === 'FIXED' 
                ? settings.autoTradeConfig.value 
                : (totalCapitalForTrading * (settings.autoTradeConfig.value / 100));
            
            // Sliced Entry Amount (e.g., 25% of target allocation)
            const sliceAmount = allocationPerStock * SLICE_PERCENTAGE;

            // Scenario A: Adding to existing position (Slicing In)
            if (existingPosition) {
                const currentInvested = existingPosition.avgCost * existingPosition.quantity;
                if (currentInvested < allocationPerStock) {
                    // We have room to add a slice
                    const qty = Math.floor(sliceAmount / data.price);
                    if (qty > 0 && currentFunds.stock >= (qty * data.price)) {
                        currentFunds.stock -= (qty * data.price);
                        const tx: Transaction = {
                            id: `auto-buy-slice-${Date.now()}-${Math.random()}`,
                            type: 'BUY',
                            symbol: rec.symbol,
                            assetType: rec.type,
                            quantity: qty,
                            price: data.price,
                            timestamp: Date.now(),
                            broker: 'PAPER'
                        };
                        results.push({ executed: true, transaction: tx, reason: "Auto Slice-In (Trend Confirmation)" });
                        // Only do one slice per cycle to mimic time-based slicing
                        break; 
                    }
                }
            } 
            // Scenario B: New Entry (If slots available)
            else if (openSymbols.length < MAX_POSITIONS) {
                const qty = Math.floor(sliceAmount / data.price);
                if (qty > 0 && currentFunds.stock >= (qty * data.price)) {
                    currentFunds.stock -= (qty * data.price);
                    const tx: Transaction = {
                        id: `auto-buy-new-${Date.now()}-${Math.random()}`,
                        type: 'BUY',
                        symbol: rec.symbol,
                        assetType: rec.type,
                        quantity: qty,
                        price: data.price,
                        timestamp: Date.now(),
                        broker: 'PAPER'
                    };
                    results.push({ executed: true, transaction: tx, reason: "Auto Entry (Top 5 Pick)" });
                    // Only open 1 new position per cycle to be safe
                    break; 
                }
            }
        }
    }

    return results;
};

// Simulate "Offline" trades
export const simulateBackgroundTrades = (
    lastRunTime: number, 
    settings: AppSettings, 
    funds: Funds
): { newTransactions: Transaction[], newFunds: Funds } => {
    return { newTransactions: [], newFunds: funds };
};
