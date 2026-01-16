
import { Candle, StockData, TechnicalSignals, AppSettings, AssetType } from "../types";
import { analyzeStockTechnical } from "./technicalAnalysis";

const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart/";
export const USD_INR_RATE = 84.50; 

// Map Symbols to Yahoo Finance Tickers
const TICKER_MAP: { [key: string]: string } = {
    // MCX (Proxies to US Futures)
    'GOLD': 'GC=F',       
    'SILVER': 'SI=F',     
    'CRUDEOIL': 'CL=F',   
    'NATURALGAS': 'NG=F', 
    'COPPER': 'HG=F',     
    
    // FOREX
    'USDINR': 'USDINR=X',
    'EURINR': 'EURINR=X',
    'GBPINR': 'GBPINR=X',
    'EURUSD': 'EURUSD=X',
    'GBPUSD': 'GBPUSD=X',
    'JPYINR': 'JPYINR=X',
};

// --- API FETCHERS ---

async function fetchWithProxy(targetUrl: string): Promise<any> {
    const proxies = [
        (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];

    for (const proxy of proxies) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000); 
            const finalUrl = proxy(targetUrl);
            const response = await fetch(finalUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (response.ok) return await response.json();
        } catch (e) { continue; }
    }
    return null;
}

async function fetchYahooData(ticker: string): Promise<any> {
    const cb = Math.floor(Math.random() * 1000000);
    const targetUrl = `${YAHOO_CHART_BASE}${ticker}?interval=5m&range=1d&_cb=${cb}`;
    return await fetchWithProxy(targetUrl);
}

// --- PARSERS ---

async function parseYahooResponse(symbol: string, data: any, needsConversion: boolean = false): Promise<StockData | null> {
    const result = data?.chart?.result?.[0];
    if (!result || !result.timestamp) return null;

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const candles: Candle[] = [];
    const conversion = needsConversion ? USD_INR_RATE : 1;

    for (let i = 0; i < timestamps.length; i++) {
        if (quotes.open[i] != null && quotes.close[i] != null) {
            candles.push({
                time: timestamps[i] * 1000,
                open: quotes.open[i] * conversion,
                high: quotes.high[i] * conversion,
                low: quotes.low[i] * conversion,
                close: quotes.close[i] * conversion,
                volume: quotes.volume[i] || 0
            });
        }
    }

    if (candles.length === 0) return null;

    const lastCandle = candles[candles.length - 1];
    const technicals = analyzeStockTechnical(candles);
    const meta = result.meta;
    const prevClose = (meta.chartPreviousClose || candles[0].open) * conversion;
    
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
    
    let ticker = TICKER_MAP[symbol.toUpperCase()];
    let needsConversion = false;
    
    if (!ticker) {
        const upperSymbol = symbol.toUpperCase();
        if (upperSymbol.endsWith('.NS') || upperSymbol.endsWith('.BO')) {
            ticker = upperSymbol;
        } else {
            if (!upperSymbol.includes('=')) {
                 ticker = `${upperSymbol}.NS`;
            } else {
                 ticker = upperSymbol;
            }
        }
    }

    try {
        const yahooRaw = await fetchYahooData(ticker);
        if (yahooRaw) {
            const parsed = await parseYahooResponse(symbol, yahooRaw, needsConversion);
            if (parsed) return parsed;
        }
    } catch (e) {
        console.warn(`Fetch failed for ${symbol}`);
    }

    return null;
};
