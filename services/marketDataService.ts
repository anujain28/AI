
import { Candle, StockData, AppSettings } from "../types";
import { analyzeStockTechnical } from "./technicalAnalysis";

const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart/";
const marketCache: Record<string, { data: StockData, timestamp: number }> = {};
const pendingRequests = new Map<string, Promise<StockData | null>>();

/**
 * Turbo Proxy Racer - Races 3 proxies with a 2.5s hard timeout
 */
async function fetchWithProxy(targetUrl: string, settings: AppSettings): Promise<any> {
    const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://proxy.cors.sh/${targetUrl}`
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2800);

    try {
        // Fixed: Replaced Promise.any with custom racing logic to avoid compatibility errors in environments below ES2021.
        // This logic resolves with the first successful (fulfilled) response.
        const responseText = await new Promise<any>((resolve, reject) => {
            let settledCount = 0;
            let resolved = false;
            
            proxies.forEach(url => {
                fetch(url, { 
                    signal: controller.signal,
                    headers: url.includes('cors.sh') ? { 'x-cors-gratis': 'true' } : {}
                }).then(async res => {
                    if (!res.ok) throw new Error("Fetch failed");
                    const json = await res.json();
                    if (!json?.chart?.result) throw new Error("Invalid response structure");
                    
                    if (!resolved) {
                        resolved = true;
                        resolve(json);
                    }
                }).catch(() => {
                    settledCount++;
                    if (settledCount === proxies.length && !resolved) {
                        reject(new Error("All proxies failed"));
                    }
                });
            });
        });

        clearTimeout(timeoutId);
        return responseText;
    } catch (e) {
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}

async function parseYahooResponse(data: any): Promise<StockData | null> {
    const result = data?.chart?.result?.[0];
    if (!result || !result.timestamp) return null;

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const candles: Candle[] = [];

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
    
    // Memory Cache Check
    const cached = marketCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp < 10000)) {
        return cached.data;
    }

    if (pendingRequests.has(cacheKey)) return pendingRequests.get(cacheKey)!;

    const requestPromise = (async () => {
        const ticker = symbol.includes('.') ? symbol : `${symbol}.NS`;
        try {
            const targetUrl = `${YAHOO_CHART_BASE}${ticker}?interval=${interval}&range=${range}`;
            const raw = await fetchWithProxy(targetUrl, settings);
            if (!raw) return null;
            
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
