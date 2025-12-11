import { AppSettings, PortfolioItem, AssetType, BrokerID } from "../types";

// --- MOCK SERVER STATE ---
let MOCK_DHAN_DB: PortfolioItem[] = [
    { symbol: 'TATASTEEL', type: 'STOCK', quantity: 150, avgCost: 142.50, totalCost: 21375, broker: 'DHAN' },
    { symbol: 'GOLD', type: 'MCX', quantity: 1, avgCost: 71500.00, totalCost: 71500, broker: 'DHAN' }
];

let MOCK_GROWW_DB: PortfolioItem[] = [
    { symbol: 'ZOMATO', type: 'STOCK', quantity: 500, avgCost: 160.00, totalCost: 80000, broker: 'GROWW' }
];

let MOCK_SHOONYA_DB: PortfolioItem[] = [
    { symbol: 'SBIN', type: 'STOCK', quantity: 200, avgCost: 580.00, totalCost: 116000, broker: 'SHOONYA' },
    { symbol: 'USDINR', type: 'FOREX', quantity: 1000, avgCost: 83.40, totalCost: 83400, broker: 'SHOONYA' }
];

let MOCK_BINANCE_DB: PortfolioItem[] = [
    { symbol: 'BTC', type: 'CRYPTO', quantity: 0.05, avgCost: 62000.00, totalCost: 3100, broker: 'BINANCE' }
];
let MOCK_COINDCX_DB: PortfolioItem[] = [
    { symbol: 'ETH', type: 'CRYPTO', quantity: 1.5, avgCost: 3200.00, totalCost: 4800, broker: 'COINDCX' }
];
let MOCK_COINSWITCH_DB: PortfolioItem[] = [
    { symbol: 'SOL', type: 'CRYPTO', quantity: 10, avgCost: 135.00, totalCost: 1350, broker: 'COINSWITCH' }
];
let MOCK_ZEBPAY_DB: PortfolioItem[] = [
    { symbol: 'XRP', type: 'CRYPTO', quantity: 500, avgCost: 0.60, totalCost: 300, broker: 'ZEBPAY' }
];


// Configuration for Slicing Orders
const SLICE_CONFIG: Record<AssetType, number> = {
    STOCK: 50,
    MCX: 1,
    FOREX: 500,
    CRYPTO: 0.1 
};

// --- FETCH HOLDINGS ---

export const fetchHoldings = async (broker: BrokerID, settings: AppSettings): Promise<PortfolioItem[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    switch(broker) {
        case 'DHAN': return settings.dhanClientId ? [...MOCK_DHAN_DB] : [];
        case 'SHOONYA': return settings.shoonyaUserId ? [...MOCK_SHOONYA_DB] : [];
        case 'GROWW': return [...MOCK_GROWW_DB]; // Mock always available
        case 'BINANCE': return settings.binanceApiKey ? [...MOCK_BINANCE_DB] : [];
        case 'COINDCX': return settings.coindcxApiKey ? [...MOCK_COINDCX_DB] : [];
        case 'COINSWITCH': return settings.coinswitchApiKey ? [...MOCK_COINSWITCH_DB] : [];
        case 'ZEBPAY': return [...MOCK_ZEBPAY_DB]; // Mock always available
        default: return [];
    }
}

// --- FETCH BALANCES (Simulated) ---

export const fetchBrokerBalance = async (broker: string, settings: AppSettings): Promise<number> => {
    await new Promise(r => setTimeout(r, 200));

    switch (broker) {
        case 'DHAN': return settings.dhanClientId ? 250000.50 : 0; 
        case 'SHOONYA': return settings.shoonyaUserId ? 180000.00 : 0; 
        case 'GROWW': return 120000.00;
        case 'BINANCE': return settings.binanceApiKey ? 450000.00 : 0; 
        case 'COINDCX': return settings.coindcxApiKey ? 75000.00 : 0; 
        case 'COINSWITCH': return settings.coinswitchApiKey ? 25000.00 : 0;
        case 'ZEBPAY': return 50000.00;
        default: return 0;
    }
};

// --- HELPER: EXECUTE SLICED ORDERS ---

const executeSlicedOrder = async (
    broker: BrokerID,
    symbol: string,
    quantity: number,
    side: 'BUY' | 'SELL',
    price: number,
    assetType: AssetType,
    settings: AppSettings,
    db: PortfolioItem[]
): Promise<{ success: boolean; orderId?: string; message: string }> => {
    
    // Validate Creds (Simplified)
    if (broker === 'DHAN' && !settings.dhanClientId) return { success: false, message: "Dhan credentials missing" };
    
    // Validate Sell
    if (side === 'SELL') {
        const existingIdx = db.findIndex(p => p.symbol === symbol);
        if (existingIdx === -1) return { success: false, message: "Position not found" };
        if (db[existingIdx].quantity < quantity) return { success: false, message: "Insufficient quantity" };
    }

    // Execution Loop
    const sliceSize = SLICE_CONFIG[assetType] || 100;
    let remaining = quantity;
    let fills = 0;
    const startTime = Date.now();

    while (remaining > 0) {
        const currentQty = Math.min(remaining, sliceSize);
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50)); // Faster sim

        if (side === 'BUY') {
            const existing = db.find(p => p.symbol === symbol);
            if (existing) {
                const newTotal = existing.totalCost + (price * currentQty);
                const newQty = existing.quantity + currentQty;
                existing.quantity = newQty;
                existing.totalCost = newTotal;
                existing.avgCost = newTotal / newQty;
            } else {
                db.push({ symbol, type: assetType, quantity: currentQty, avgCost: price, totalCost: price * currentQty, broker });
            }
        } else {
             const existingIdx = db.findIndex(p => p.symbol === symbol);
             if (existingIdx !== -1) {
                 const existing = db[existingIdx];
                 if (existing.quantity <= currentQty + 0.0001) {
                      db.splice(existingIdx, 1);
                 } else {
                      existing.quantity -= currentQty;
                      existing.totalCost = existing.avgCost * existing.quantity; 
                 }
             }
        }
        remaining -= currentQty;
        fills++;
    }
    
    return { 
        success: true, 
        orderId: `${broker.substring(0,3).toUpperCase()}-${Date.now()}`, 
        message: `Executed ${quantity} qty in ${fills} slices` 
    };
};

// --- EXPORTED HANDLER ---
export const placeOrder = async (broker: BrokerID, symbol: string, quantity: number, side: 'BUY' | 'SELL', price: number, assetType: AssetType, settings: AppSettings) => {
    let db;
    switch(broker) {
        case 'DHAN': db = MOCK_DHAN_DB; break;
        case 'SHOONYA': db = MOCK_SHOONYA_DB; break;
        case 'GROWW': db = MOCK_GROWW_DB; break;
        case 'BINANCE': db = MOCK_BINANCE_DB; break;
        case 'COINDCX': db = MOCK_COINDCX_DB; break;
        case 'COINSWITCH': db = MOCK_COINSWITCH_DB; break;
        case 'ZEBPAY': db = MOCK_ZEBPAY_DB; break;
        default: return { success: false, message: "Invalid Broker" };
    }
    return executeSlicedOrder(broker, symbol, quantity, side, price, assetType, settings, db);
};