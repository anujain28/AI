
import { Candle, StockData, AppSettings } from "../types";
import { analyzeStockTechnical } from "./technicalAnalysis";

const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart/";
const marketCache: Record<string, { data: StockData, timestamp: number }> = {};
const pendingRequests = new Map<string, Promise<StockData | null>>();

// Faster refresh rate for live data (10s instead of 45s)
const getCacheTTL = (interval: string): number => {
  if (interval.includes('m')) return 10 * 1000; 
  return 5 * 60 * 1000;
};

/**
 * Optimized Proxy Fetcher
 * Races the fastest two proxies to minimize network latency.
 */
async function fetchWithProxy(targetUrl: string): Promise<any> {
    const primaryProxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
    ];

    const fallbackProxies = [
        `https://thingproxy.freeboard.io/fetch/${targetUrl}`,
        `https://cors-anywhere.herokuapp.com/${targetUrl}`
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
        // Race the top 2 proxies for maximum speed
        // Fixed: Replaced Promise.any with custom racing logic to avoid TypeScript errors on targets below ES2021.
        // This implementation mimics Promise.any by resolving with the first successful fetch.
        const fastestResponse = await new Promise((resolve, reject) => {
            let settledCount = 0;
            let resolved = false;
            primaryProxies.forEach(url => {
                fetch(url, { signal: controller.signal })
                    .then(async res => {
                        if (!res.ok) throw new Error("Proxy failed");
                        const json = await res.json();
                        if (!json?.chart?.result) throw new Error("Invalid payload");
                        if (!resolved) {
                            resolved = true;
                            resolve(json);
                        }
                    })
                    .catch(err => {
                        settledCount++;
                        if (settledCount === primaryProxies.length && !resolved) {
                            reject(err);
                        }
                    });
            });
        });
        clearTimeout(timeoutId);
        return fastestResponse;
    } catch (e) {
        // Sequential fallback if racing fails
        for (const url of fallbackProxies) {
            try {
                const res = await fetch(url, { signal: controller.signal });
                if (res.ok) {
                    const data = await res.json();
                    if (data?.chart?.result) return data;
                }
            } catch (err) { continue; }
        }
    } finally {
        clearTimeout(timeoutId);
    }
    return null;
}

async function parseYahooResponse(data: any): Promise<StockData | null> {
    const result = data?.chart?.result?.[0];
    if (!result || !result.timestamp) return null;

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const candles: Candle[] = [];

    // Fast mapping
    for (let i = 0, len = timestamps.length; i < len; i++) {
        const c = quotes.close[i];
        if (c != null) {
            candles.push({
                time: timestamps[i] * 1000,
                open: quotes.open[i],
                high: quotes.high[i],
                low: quotes.low[i],
                close: c,
                volume: quotes.volume[i] || 0
            });
        }
    }

    if (candles.length < 5) return null;

    const lastCandle = candles[candles.length - 1];
    const technicals = analyzeStockTechnical(candles);
    const prevClose = result.meta.chartPreviousClose || candles[0].open;
    
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
    
    if (pendingRequests.has(cacheKey)) return pendingRequests.get(cacheKey)!;
    
    const cached = marketCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp < getCacheTTL(interval))) {
        return cached.data;
    }

    const requestPromise = (async () => {
        const ticker = symbol.includes('.') ? symbol : `${symbol}.NS`;
        try {
            const targetUrl = `${YAHOO_CHART_BASE}${ticker}?interval=${interval}&range=${range}`;
            const raw = await fetchWithProxy(targetUrl);
            const parsed = await parseYahooResponse(raw);
            if (parsed) {
                marketCache[cacheKey] = { data: parsed, timestamp: Date.now() };
                return parsed;
            }
        } catch (e) {} finally {
            pendingRequests.delete(cacheKey);
        }
        return null;
    })();

    pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
};
