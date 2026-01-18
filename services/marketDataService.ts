
import { Candle, StockData, AppSettings } from "../types";
import { analyzeStockTechnical } from "./technicalAnalysis";

const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart/";
const marketCache: Record<string, { data: StockData, timestamp: number }> = {};
const pendingRequests = new Map<string, Promise<StockData | null>>();

/**
 * Turbo Proxy Racer - Resolves with the first successful response
 */
async function fetchWithProxy(targetUrl: string): Promise<any> {
    const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); 

    try {
        const responseText = await new Promise<any>((resolve, reject) => {
            let settledCount = 0;
            let resolved = false;
            
            proxies.forEach(url => {
                fetch(url, { signal: controller.signal })
                    .then(async res => {
                        if (!res.ok) throw new Error("Proxy error");
                        const raw = await res.text();
                        
                        let json;
                        try {
                            json = JSON.parse(raw);
                            if (json.contents) json = JSON.parse(json.contents);
                        } catch (e) {
                            json = JSON.parse(raw);
                        }

                        if (json?.chart?.result) {
                            if (!resolved) {
                                resolved = true;
                                resolve(json);
                            }
                        } else {
                            throw new Error("Invalid structure");
                        }
                    })
                    .catch(() => {
                        settledCount++;
                        if (settledCount === proxies.length && !resolved) {
                            reject(new Error("All Proxies Failed"));
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
    interval: string = "15m", 
    range: string = "5d"
): Promise<StockData | null> => {
    const ticker = symbol.includes('.') ? symbol : `${symbol}.NS`;
    const cacheKey = `${ticker}_${interval}_${range}`;
    
    const cached = marketCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp < 30000)) {
        return cached.data;
    }

    if (pendingRequests.has(cacheKey)) return pendingRequests.get(cacheKey)!;

    const requestPromise = (async () => {
        try {
            const targetUrl = `${YAHOO_CHART_BASE}${ticker}?interval=${interval}&range=${range}`;
            const raw = await fetchWithProxy(targetUrl);
            if (!raw) return null;
            
            const parsed = await parseYahooResponse(raw);
            if (parsed) {
                marketCache[cacheKey] = { data: parsed, timestamp: Date.now() };
                return parsed;
            }
        } catch (e) {
            console.debug(`Market fetch failed for ${ticker}`);
        } finally {
            pendingRequests.delete(cacheKey);
        }
        return null;
    })();

    pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
};
