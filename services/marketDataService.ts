
import { Candle, StockData, AppSettings } from "../types";
import { analyzeStockTechnical } from "./technicalAnalysis";

const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart/";
const marketCache: Record<string, { data: StockData, timestamp: number }> = {};
const pendingRequests = new Map<string, Promise<StockData | null>>();

const getCacheTTL = (interval: string): number => {
  if (interval.includes('m')) return 45 * 1000; 
  return 15 * 60 * 1000;
};

async function fetchWithProxy(targetUrl: string): Promise<any> {
    const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://cors-anywhere.herokuapp.com/${targetUrl}`,
        `https://thingproxy.freeboard.io/fetch/${targetUrl}`
    ];

    for (const url of proxies) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); 
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (res.ok) {
                const data = await res.json();
                if (data?.chart?.result) return data;
            }
        } catch (e) {
            continue; 
        }
    }
    return null;
}

async function parseYahooResponse(data: any): Promise<StockData | null> {
    const result = data?.chart?.result?.[0];
    if (!result || !result.timestamp) return null;

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const candles: Candle[] = [];

    for (let i = 0; i < timestamps.length; i++) {
        if (quotes.close[i] != null) {
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
    if (cached && (Date.now() - cached.timestamp < getCacheTTL(interval))) return cached.data;

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
