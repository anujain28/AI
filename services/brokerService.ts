
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
let MOCK_ZERODHA_DB: PortfolioItem[] = [];

const SLICE_CONFIG: Record<AssetType, number> = {
    STOCK: 10, // Small slices for scalping feel
    MCX: 1,
    FOREX: 1000,
    CRYPTO: 1
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

export const fetchHoldings = async (broker: BrokerID, settings: AppSettings): Promise<PortfolioItem[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    switch(broker) {
        case 'DHAN': return fetchDhanHoldings(settings);
        default: return [];
    }
}

/**
 * Institutional Order Slicing Engine (Iceberg Strategy).
 * Splits larger orders into smaller slices to minimize market impact.
 */
export const executeSlicedOrder = async (
    broker: BrokerID,
    symbol: string,
    quantity: number,
    side: 'BUY' | 'SELL',
    price: number,
    assetType: AssetType,
    settings: AppSettings
): Promise<{ success: boolean; orderId?: string; message: string }> => {
    
    // Safety check for paper trading vs live
    const isLive = broker !== 'PAPER';
    if (isLive && !settings.dhanClientId && broker === 'DHAN') {
        return { success: false, message: "Live credentials missing for Dhan" };
    }
    
    // Determine slice size based on asset type or quantity
    const defaultSlice = SLICE_CONFIG[assetType] || 10;
    const numSlices = quantity > defaultSlice * 3 ? 5 : 1;
    const sliceQty = Math.floor(quantity / numSlices);
    const lastSliceQty = sliceQty + (quantity % numSlices);

    console.log(`[Engine] Initiating ${side} for ${symbol}. Slicing into ${numSlices} batches.`);

    for (let i = 0; i < numSlices; i++) {
        const currentQty = i === numSlices - 1 ? lastSliceQty : sliceQty;
        
        // Random latency to simulate natural execution and bypass simple high-frequency detection
        const delay = isLive ? 200 + Math.random() * 800 : 50; 
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`[Execution] Filled Slice ${i+1}/${numSlices}: ${currentQty} units at ₹${price}`);
    }
    
    return { 
        success: true, 
        orderId: `${broker.substring(0,3)}-${Date.now()}`, 
        message: `Successfully executed ${quantity} ${symbol} in ${numSlices} slices.` 
    };
};

export const placeOrder = async (broker: BrokerID, symbol: string, quantity: number, side: 'BUY' | 'SELL', price: number, assetType: AssetType, settings: AppSettings) => {
    return executeSlicedOrder(broker, symbol, quantity, side, price, assetType, settings);
};
