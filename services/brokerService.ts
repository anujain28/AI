
import { AppSettings, PortfolioItem, AssetType, BrokerID } from "../types";

const fetchWithProxy = async (url: string, options: any) => {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    try {
        const res = await fetch(proxyUrl, options);
        if (res.ok) return await res.json();
    } catch (e) { console.warn("Proxy 1 failed", e); }
    return null;
};

let MOCK_DHAN_DB: PortfolioItem[] = [];
let MOCK_SHOONYA_DB: PortfolioItem[] = [];

const SLICE_CONFIG: Record<AssetType, number> = {
    STOCK: 50,
    MCX: 1,
    FOREX: 500
};

const fetchDhanHoldings = async (settings: AppSettings): Promise<PortfolioItem[]> => {
    if (!settings.dhanClientId || !settings.dhanAccessToken) return MOCK_DHAN_DB;

    try {
        const response = await fetchWithProxy('https://api.dhan.co/holdings', {
            method: 'GET',
            headers: {
                'access-token': settings.dhanAccessToken,
                'client-id': settings.dhanClientId,
                'Content-Type': 'application/json'
            }
        });

        if (response && Array.isArray(response)) {
            return response.map((h: any) => ({
                symbol: h.tradingSymbol,
                type: 'STOCK',
                quantity: h.totalQty,
                avgCost: h.avgCost,
                totalCost: h.totalQty * h.avgCost,
                broker: 'DHAN'
            }));
        }
    } catch (e) {
        console.error("Dhan Fetch Error", e);
    }
    return MOCK_DHAN_DB; 
};

const fetchShoonyaHoldings = async (settings: AppSettings): Promise<PortfolioItem[]> => {
    if (!settings.shoonyaUserId) return [];
    return MOCK_SHOONYA_DB;
};

export const fetchHoldings = async (broker: BrokerID, settings: AppSettings): Promise<PortfolioItem[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));

    switch(broker) {
        case 'DHAN': return fetchDhanHoldings(settings);
        case 'SHOONYA': return fetchShoonyaHoldings(settings);
        default: return [];
    }
}

export const fetchBrokerBalance = async (broker: string, settings: AppSettings): Promise<number> => {
    await new Promise(r => setTimeout(r, 200));

    switch (broker) {
        case 'DHAN': return settings.dhanClientId ? 250000.50 : 0; 
        case 'SHOONYA': return settings.shoonyaUserId ? 180000.00 : 0; 
        default: return 0;
    }
};

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
    
    if (broker === 'DHAN' && !settings.dhanClientId) return { success: false, message: "Dhan credentials missing" };
    
    const sliceSize = SLICE_CONFIG[assetType] || 100;
    let remaining = quantity;
    let fills = 0;

    while (remaining > 0) {
        const currentQty = Math.min(remaining, sliceSize);
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50)); 
        remaining -= currentQty;
        fills++;
    }
    
    return { 
        success: true, 
        orderId: `${broker.substring(0,3).toUpperCase()}-${Date.now()}`, 
        message: `Executed ${quantity} qty in ${fills} slices` 
    };
};

export const placeOrder = async (broker: BrokerID, symbol: string, quantity: number, side: 'BUY' | 'SELL', price: number, assetType: AssetType, settings: AppSettings) => {
    let db;
    switch(broker) {
        case 'DHAN': db = MOCK_DHAN_DB; break;
        case 'SHOONYA': db = MOCK_SHOONYA_DB; break;
        default: db = []; break;
    }
    return executeSlicedOrder(broker, symbol, quantity, side, price, assetType, settings, db);
};
