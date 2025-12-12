
import { Candle, StockData, TechnicalSignals, AppSettings, AssetType } from "../types";
import { analyzeStockTechnical } from "./technicalAnalysis";

const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart/";

// Mapping Indian MCX symbols to Global Futures/Proxies for data simulation
const TICKER_MAP: { [key: string]: string } = {
    // MCX
    'GOLD': 'GC=F',       // Gold Futures
    'SILVER': 'SI=F',     // Silver Futures
    'CRUDEOIL': 'CL=F',   // Crude Oil Futures
    'NATURALGAS': 'NG=F', // Natural Gas Futures
    'COPPER': 'HG=F',     // Copper Futures
    'ZINC': 'ZINC.L',     // LME Zinc (Proxy)
    'ALUMINIUM': 'ALI=F', // Aluminum Futures
    'LEAD': 'LEAD.L',     // LME Lead
    
    // FOREX
    'USDINR': 'USDINR=X',
    'EURINR': 'EURINR=X',
    'GBPINR': 'GBPINR=X',
    'JPYINR': 'JPYINR=X',
    'EURUSD': 'EURUSD=X',
    'GBPUSD': 'GBPUSD=X',

    // CRYPTO
    'BTC': 'BTC-USD',
    'ETH': 'ETH-USD',
    'SOL': 'SOL-USD',
    'BNB': 'BNB-USD',
    'XRP': 'XRP-USD',
    'ADA': 'ADA-USD',
    'DOGE': 'DOGE-USD',
    'SHIB': 'SHIB-USD'
};

// --- API FETCHERS ---

async function fetchWithProxy(targetUrl: string): Promise<any> {
    const proxies = [
        (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        (url: string) => `https://cors-anywhere.herokuapp.com/${url}` 
    ];

    for (const proxy of proxies) {
        try {
            const finalUrl = proxy(targetUrl);
            const response = await fetch(finalUrl);
            if (response.ok) return await response.json();
        } catch (e) { continue; }
    }
    return null;
}

async function fetchYahooData(ticker: string, interval: string = '5m', range: string = '5d'): Promise<any> {
    const targetUrl = `${YAHOO_CHART_BASE}${ticker}?interval=${interval}&range=${range}`;
    return await fetchWithProxy(targetUrl);
}

// 2. Dhan API - Fetch LTP if credentials exist
async function fetchDhanData(symbol: string, settings: AppSettings): Promise<StockData | null> {
    if (!settings.dhanClientId || !settings.dhanAccessToken) return null;
    return null; 
}

// 3. Shoonya API - Fetch LTP if credentials exist
async function fetchShoonyaData(symbol: string, settings: AppSettings): Promise<StockData | null> {
    if (!settings.shoonyaUserId) return null;
    return null; // Fallback to Yahoo
}


// --- PARSERS ---

async function parseYahooResponse(symbol: string, data: any): Promise<StockData | null> {
    const result = data?.chart?.result?.[0];
    if (!result || !result.timestamp) return null;

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const candles: Candle[] = [];

    for (let i = 0; i < timestamps.length; i++) {
        if (quotes.open[i] != null && quotes.close[i] != null && quotes.high[i] != null && quotes.low[i] != null) {
            candles.push({
                time: timestamps[i] * 1000,
                open: quotes.open[i],
                high: quotes.high[i],
                low: quotes.low[i],
                close: quotes.close[i],
                volume: quotes.volume[i] || 0
            });
        }
    }

    if (candles.length === 0) return null;

    const lastCandle = candles[candles.length - 1];
    const technicals = analyzeStockTechnical(candles);
    const meta = result.meta;
    const prevClose = meta.chartPreviousClose || candles[0].open;
    
    return {
        price: lastCandle.close,
        change: lastCandle.close - prevClose,
        changePercent: ((lastCandle.close - prevClose) / prevClose) * 100,
        history: candles,
        technicals
    };
}


// --- MAIN FETCH FUNCTION ---

export const fetchRealStockData = async (symbol: string, settings: AppSettings): Promise<StockData | null> => {
    
    // 1. Try Broker APIs first
    let data = await fetchDhanData(symbol, settings);
    if (data) return data;

    data = await fetchShoonyaData(symbol, settings);
    if (data) return data;

    // 2. Try Yahoo Finance (Primary Public Source)
    let ticker = TICKER_MAP[symbol.toUpperCase()];
    
    if (!ticker) {
        // Handle Indian Stock Logic
        const upperSymbol = symbol.toUpperCase();
        
        // Check if already ends with .NS or .BO
        if (upperSymbol.endsWith('.NS') || upperSymbol.endsWith('.BO')) {
            ticker = upperSymbol;
        } else {
            // Default to NSE (.NS) for all other Indian Stocks
            ticker = `${upperSymbol}.NS`;
        }
    }

    const yahooRaw = await fetchYahooData(ticker);
    if (yahooRaw) {
        const parsed = await parseYahooResponse(symbol, yahooRaw);
        if (parsed) return parsed;
    }

    return null;
};
