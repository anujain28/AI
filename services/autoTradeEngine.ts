
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
const BASE_ALLOCATION = 0.20; // Base 20%

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

    // 1. MANAGE EXITS
    paperPortfolio.forEach(item => {
        const marketStatus = getMarketStatus(item.type);
        if (!marketStatus.isOpen) return; 

        const data = marketData[item.symbol];
        if (!data) return;

        const price = data.price;
        const pnlPercent = ((price - item.avgCost) / item.avgCost) * 100;
        const score = data.technicals.score;

        let action = null;
        if (pnlPercent <= -3.0) action = 'STOP_LOSS'; 
        else if (pnlPercent >= 7.0) action = 'TARGET_HIT'; 
        else if (score < 20) action = 'WEAK_SIGNAL'; 
        
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

    // 2. ENTRY LOGIC
    const rankedCandidates = recommendations
        .map(rec => {
            const data = marketData[rec.symbol];
            return {
                ...rec,
                liveScore: data ? data.technicals.score : 0
            };
        })
        .filter(rec => {
            if (rec.liveScore < 60) return false;
            
            const settingsKey = rec.type === 'STOCK' ? 'stocks' : rec.type.toLowerCase() as keyof typeof settings.enabledMarkets;
            if (!settings.enabledMarkets[settingsKey]) return false;

            const status = getMarketStatus(rec.type);
            if (!status.isOpen) return false;

            return true;
        })
        .sort((a, b) => b.liveScore - a.liveScore); 

    for (const rec of rankedCandidates) {
        if (results.length > 0) break;

        const data = marketData[rec.symbol];
        if (!data) continue;

        const fundKey = getFundKey(rec.type);
        const availableCapital = currentFunds[fundKey];
        if (availableCapital <= 0) continue;

        const existingPosition = paperPortfolio.find(p => p.symbol === rec.symbol);
        
        if (existingPosition) continue; 
        if (paperPortfolio.length >= MAX_GLOBAL_POSITIONS) break; 

        const investedInBucket = paperPortfolio
            .filter(p => p.type === rec.type)
            .reduce((acc, p) => acc + (p.avgCost * p.quantity), 0);
        
        const totalBucketCapital = availableCapital + investedInBucket;
        
        let confidenceMultiplier = 0.75;
        if (rec.liveScore >= 80) confidenceMultiplier = 1.0;
        else if (rec.liveScore >= 70) confidenceMultiplier = 0.85;

        const tradeAmount = totalBucketCapital * BASE_ALLOCATION * confidenceMultiplier;

        let qtyToBuy = Math.floor(tradeAmount / data.price);
        
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

    return results;
};

export const simulateBackgroundTrades = (
    lastRunTime: number, 
    settings: AppSettings, 
    funds: Funds
): { newTransactions: Transaction[], newFunds: Funds } => {
    return { newTransactions: [], newFunds: funds };
};
