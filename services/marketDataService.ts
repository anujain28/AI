
import { Candle, StockData, AppSettings } from "../types";
import { analyzeStockTechnical } from "./technicalAnalysis";

const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart/";

// Persistent cache for the current session to avoid redundant network calls
const marketCache: Record<string, { data: StockData, timestamp: number }> = {};
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes cache for speed

/**
 * Superfast Proxy Fetcher: Races multiple CORS proxies and takes the fastest successful response.
 */
async function fetchWithProxy(targetUrl: string): Promise<any> {
    const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://thingproxy.freeboard.io/fetch/${targetUrl}`
    ];

    try {
        const controller = new AbortController();
        // Slightly more aggressive timeout for high-speed feel
        const timeoutId = setTimeout(() => controller.abort(), 4000); 

        // Promise.any returns the first fulfilled promise. 
        // This ensures we get data from the fastest available proxy.
        // Fixed: Cast Promise to any to bypass the 'any' property missing error on the PromiseConstructor
        // in environments where the TypeScript target library is older than ES2021.
        const fastestResponse = await (Promise as any).any(proxies.map(url => 
            fetch(url, { signal: controller.signal })
                .then(async (res) => {
                    if (!res.ok) throw new Error(`Proxy failed: ${res.status}`);
                    const data = await res.json();
                    if (!data || (data.chart && data.chart.error)) throw new Error('Invalid Yahoo data');
                    return data;
                })
        ));

        clearTimeout(timeoutId);
        return fastestResponse;
    } catch (e) {
        // Fallback for extreme cases (sequential retry without race)
        return null;
    }
}

async function parseYahooResponse(data: any): Promise<StockData | null> {
    const result = data?.chart?.result?.[0];
    if (!result || !result.timestamp) return null;

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const candles: Candle[] = [];

    // Fast mapping of candle data
    for (let i = 0; i < timestamps.length; i++) {
        const close = quotes.close[i];
        const open = quotes.open[i];
        if (close != null && open != null) {
            candles.push({
                time: timestamps[i] * 1000,
                open: open,
                high: quotes.high[i] ?? close,
                low: quotes.low[i] ?? close,
                close: close,
                volume: quotes.volume[i] || 0
            });
        }
    }

    if (candles.length < 2) return null;

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

export const fetchRealStockData = async (
    symbol: string, 
    settings: AppSettings, 
    interval: string = "5m", 
    range: string = "1d"
): Promise<StockData | null> => {
    const cacheKey = `${symbol}_${interval}_${range}`;
    const cached = marketCache[cacheKey];
    
    // Return from cache immediately if fresh
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }

    const ticker = symbol.toUpperCase().includes('.') ? symbol.toUpperCase() : `${symbol.toUpperCase()}.NS`;
    
    try {
        const cb = Math.floor(Date.now() / 10000); // 10s windowed cache buster
        const targetUrl = `${YAHOO_CHART_BASE}${ticker}?interval=${interval}&range=${range}&_cb=${cb}`;
        
        const yahooRaw = await fetchWithProxy(targetUrl);
        if (yahooRaw) {
            const parsed = await parseYahooResponse(yahooRaw);
            if (parsed) {
                marketCache[cacheKey] = { data: parsed, timestamp: Date.now() };
                return parsed;
            }
        }
    } catch (e) {
        console.warn(`Fetch error for ${symbol}:`, e);
    }
    return null;
};
