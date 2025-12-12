
import { AppSettings, MarketData, PortfolioItem, StockRecommendation, Transaction, Funds, AssetType } from "../types";
import { getMarketStatus } from "./marketStatusService";

export interface TradeResult {
    executed: boolean;
    transaction?: Transaction;
    newFunds?: Funds;
    newPortfolio?: PortfolioItem[];
    reason?: string;
}

// Config Constants
const MAX_GLOBAL_POSITIONS = 5; // User asked for "Best 5"
const TARGET_ALLOCATION_PER_ASSET = 0.20; // Target using 20% of bucket capital per asset
const SLICE_PERCENTAGE = 1.0; // BUY 100% AT ONCE (No Slicing) to adhere to "5 trades max" rule

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

    // Helper to get fund bucket key
    const getFundKey = (type: AssetType): keyof Funds => {
        if (type === 'MCX') return 'mcx';
        if (type === 'FOREX') return 'forex';
        if (type === 'CRYPTO') return 'crypto';
        return 'stock';
    };

    // 1. MANAGE EXITS (Stop Loss / Take Profit)
    paperPortfolio.forEach(item => {
        const marketStatus = getMarketStatus(item.type);
        // Allow exits even if market is technically closed if we are simulating, but ideally check status
        if (!marketStatus.isOpen && item.type !== 'CRYPTO') return; 

        const data = marketData[item.symbol];
        if (!data) return;

        const price = data.price;
        const pnlPercent = ((price - item.avgCost) / item.avgCost) * 100;
        const score = data.technicals.score;

        let action = null;
        if (pnlPercent <= -3.0) action = 'STOP_LOSS'; // Tightened SL
        else if (pnlPercent >= 6.0) action = 'TARGET_HIT'; // profit target
        else if (score < 25) action = 'WEAK_SIGNAL'; // Technical breakdown
        
        if (action) {
            const fundKey = getFundKey(item.type);
            currentFunds[fundKey] += (price * item.quantity); 
            
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
            results.push({ executed: true, transaction: tx, newFunds: { ...currentFunds }, reason: `Auto ${action}` });
        }
    });

    // 2. ENTRY LOGIC (Best 5 Selection)
    
    // Step A: Rank all recommendations by live Technical Score
    const rankedCandidates = recommendations
        .map(rec => {
            const data = marketData[rec.symbol];
            return {
                ...rec,
                liveScore: data ? data.technicals.score : 0,
                signal: data ? data.technicals.signalStrength : 'HOLD'
            };
        })
        .filter(rec => {
            // Must be enabled in settings
            const settingsKey = rec.type === 'STOCK' ? 'stocks' : rec.type.toLowerCase() as keyof typeof settings.enabledMarkets;
            if (!settings.enabledMarkets[settingsKey]) return false;

            // Must be Market Open
            const status = getMarketStatus(rec.type);
            if (!status.isOpen && rec.type !== 'CRYPTO') return false;

            // Must be Strong Buy or Buy with high score
            return rec.liveScore > 60; 
        })
        .sort((a, b) => b.liveScore - a.liveScore); // Highest score first

    // Step B: Execution Loop
    // Limit: Max 5 positions total. One entry per position.
    
    for (const rec of rankedCandidates) {
        const data = marketData[rec.symbol];
        if (!data) continue;

        const fundKey = getFundKey(rec.type);
        const availableCapital = currentFunds[fundKey];
        
        // If we have no money for this asset class, skip
        if (availableCapital <= 0) continue;

        const existingPosition = paperPortfolio.find(p => p.symbol === rec.symbol);
        
        // --- FUND ALLOCATION ---
        // Calculate Total Capital for this Asset Bucket (Cash + Invested)
        const investedInBucket = paperPortfolio
            .filter(p => p.type === rec.type)
            .reduce((acc, p) => acc + (p.avgCost * p.quantity), 0);
        
        const totalBucketCapital = availableCapital + investedInBucket;
        
        // Max Allocation for this specific Asset
        const targetPositionValue = totalBucketCapital * TARGET_ALLOCATION_PER_ASSET;

        // Slice Size: 100% of target (No scale in, just 1 trade)
        const sliceValue = targetPositionValue * SLICE_PERCENTAGE;

        let qtyToBuy = 0;

        // SCENARIO 1: Scale In
        if (existingPosition) {
            // DISABLE SCALE-IN to strictly limit to "5 trades" interpretation (5 distinct positions, 1 entry each).
            qtyToBuy = 0; 
        } 
        // SCENARIO 2: New Entry
        else if (openSymbols.length < MAX_GLOBAL_POSITIONS) {
            qtyToBuy = sliceValue / data.price;
        }

        // --- FRACTIONAL HANDLING ---
        if (qtyToBuy > 0) {
            if (rec.type === 'CRYPTO') {
                qtyToBuy = parseFloat(qtyToBuy.toFixed(6));
            } else {
                // Stocks/MCX/Forex assume integers
                qtyToBuy = Math.floor(qtyToBuy);
            }
            
            // Final check: Do we have enough cash?
            const cost = qtyToBuy * data.price;
            
            if (qtyToBuy > 0 && availableCapital >= cost) {
                // EXECUTE
                currentFunds[fundKey] -= cost;
                
                const tx: Transaction = {
                    id: `auto-buy-${Date.now()}-${Math.random()}`,
                    type: 'BUY',
                    symbol: rec.symbol,
                    assetType: rec.type,
                    quantity: qtyToBuy,
                    price: data.price,
                    timestamp: Date.now(),
                    broker: 'PAPER'
                };
                
                results.push({ 
                    executed: true, 
                    transaction: tx, 
                    newFunds: { ...currentFunds }, 
                    reason: "Auto Entry (Top 5 Pick)" 
                });
                
                // Only take 1 trade per cycle
                break; 
            }
        }
    }

    return results;
};

export const simulateBackgroundTrades = (
    lastRunTime: number, 
    settings: AppSettings, 
    funds: Funds
): { newTransactions: Transaction[], newFunds: Funds } => {
    return { newTransactions: [], newFunds: funds };
};
