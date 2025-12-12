
import { AppSettings, MarketData, PortfolioItem, StockRecommendation, Transaction, Funds, AssetType } from "../types";
import { getMarketStatus } from "./marketStatusService";

export interface TradeResult {
    executed: boolean;
    transaction?: Transaction;
    newFunds?: Funds;
    newPortfolio?: PortfolioItem[];
    reason?: string;
}

// STRICT LIMIT: Max 5 concurrent positions
const MAX_GLOBAL_POSITIONS = 5; 
const BASE_ALLOCATION = 0.20; // Base 20%

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
        // Crypto runs 24/7, others check status
        if (!marketStatus.isOpen && item.type !== 'CRYPTO') return; 

        const data = marketData[item.symbol];
        if (!data) return;

        const price = data.price;
        const pnlPercent = ((price - item.avgCost) / item.avgCost) * 100;
        const score = data.technicals.score;

        let action = null;
        if (pnlPercent <= -3.0) action = 'STOP_LOSS'; // Strict SL
        else if (pnlPercent >= 7.0) action = 'TARGET_HIT'; // Take Profit
        else if (score < 20) action = 'WEAK_SIGNAL'; // Technical Breakdown
        
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

    // 2. ENTRY LOGIC (Strictly Best 5)
    
    // Step A: Filter & Rank Candidates
    const rankedCandidates = recommendations
        .map(rec => {
            const data = marketData[rec.symbol];
            return {
                ...rec,
                liveScore: data ? data.technicals.score : 0
            };
        })
        .filter(rec => {
            // Must have data and high score
            if (rec.liveScore < 60) return false;
            
            // Must be enabled market
            const settingsKey = rec.type === 'STOCK' ? 'stocks' : rec.type.toLowerCase() as keyof typeof settings.enabledMarkets;
            if (!settings.enabledMarkets[settingsKey]) return false;

            // Must be Open
            const status = getMarketStatus(rec.type);
            if (!status.isOpen && rec.type !== 'CRYPTO') return false;

            return true;
        })
        .sort((a, b) => b.liveScore - a.liveScore); // Highest score first

    // Step B: Execution Loop
    
    for (const rec of rankedCandidates) {
        // Stop if we have results to process (execute one per cycle)
        if (results.length > 0) break;

        const data = marketData[rec.symbol];
        if (!data) continue;

        const fundKey = getFundKey(rec.type);
        const availableCapital = currentFunds[fundKey];
        if (availableCapital <= 0) continue;

        const existingPosition = paperPortfolio.find(p => p.symbol === rec.symbol);
        
        // STRICT RULE: Only 5 Max Positions. No Scale-Ins.
        if (existingPosition) continue; // Already have it, skip.
        if (paperPortfolio.length >= MAX_GLOBAL_POSITIONS) break; // Full, stop scanning.

        // Calculate Position Size (Allocating ~20% of total intended capital per trade)
        // AI DECISION: Higher score = Higher Allocation (max 20%)
        // If Score > 80, use full 20%. If Score 60-80, use 15%.
        
        const investedInBucket = paperPortfolio
            .filter(p => p.type === rec.type)
            .reduce((acc, p) => acc + (p.avgCost * p.quantity), 0);
        
        const totalBucketCapital = availableCapital + investedInBucket;
        
        let confidenceMultiplier = 0.75;
        if (rec.liveScore >= 80) confidenceMultiplier = 1.0;
        else if (rec.liveScore >= 70) confidenceMultiplier = 0.85;

        const tradeAmount = totalBucketCapital * BASE_ALLOCATION * confidenceMultiplier;

        let qtyToBuy = tradeAmount / data.price;

        if (qtyToBuy > 0) {
            if (rec.type === 'CRYPTO') {
                qtyToBuy = parseFloat(qtyToBuy.toFixed(6));
            } else {
                qtyToBuy = Math.floor(qtyToBuy);
            }
            
            const cost = qtyToBuy * data.price;
            
            if (qtyToBuy > 0 && availableCapital >= cost) {
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
                    reason: `Auto Entry (AI Score: ${rec.liveScore.toFixed(0)})` 
                });
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
