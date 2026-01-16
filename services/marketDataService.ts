
import { Candle, StockData, AppSettings } from "../types";
import { analyzeStockTechnical } from "./technicalAnalysis";

const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart/";

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
            const response = await fetch(proxy(targetUrl), { signal: controller.signal });
            clearTimeout(timeoutId);
            if (response.ok) return await response.json();
        } catch (e) { continue; }
    }
    return null;
}

async function fetchYahooData(ticker: string, interval: string = "5m", range: string = "1d"): Promise<any> {
    const cb = Math.floor(Math.random() * 1000000);
    const targetUrl = `${YAHOO_CHART_BASE}${ticker}?interval=${interval}&range=${range}&_cb=${cb}`;
    return await fetchWithProxy(targetUrl);
}

async function parseYahooResponse(data: any): Promise<StockData | null> {
    const result = data?.chart?.result?.[0];
    if (!result || !result.timestamp) return null;

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const candles: Candle[] = [];

    for (let i = 0; i < timestamps.length; i++) {
        if (quotes.open[i] != null && quotes.close[i] != null) {
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

export const fetchRealStockData = async (symbol: string, settings: AppSettings, interval: string = "5m", range: string = "1d"): Promise<StockData | null> => {
    const ticker = symbol.toUpperCase().includes('.') ? symbol.toUpperCase() : `${symbol.toUpperCase()}.NS`;
    try {
        const yahooRaw = await fetchYahooData(ticker, interval, range);
        if (yahooRaw) {
            return await parseYahooResponse(yahooRaw);
        }
    } catch (e) {
        console.warn(`Fetch failed for ${symbol}`);
    }
    return null;
};
