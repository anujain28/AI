import { Candle, StockData, TechnicalSignals, AppSettings, AssetType } from "../types";
import { analyzeStockTechnical } from "./technicalAnalysis";

const YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart/";
export const USD_INR_RATE = 84.50; // Live update below

// ✅ COMPREHENSIVE TICKER MAPPING - All Segments [web:44]
const TICKER_MAP: { [key: string]: string } = {
    // NSE Stocks (.NS) - Direct mapping
    'RELIANCE': 'RELIANCE.NS',
    'TCS': 'TCS.NS',
    'HDFCBANK': 'HDFCBANK.NS',
    'INFY': 'INFY.NS',
    // Add more Nifty 100/200 as needed...

    // MCX Commodities (US Futures + MCX direct)
    'GOLD': 'MCX:GOLDM',
    'SILVER': 'MCX:SILVERM', 
    'CRUDEOIL': 'MCX:CRUDEOILM',
    'NATURALGAS': 'MCX:NATURALGASM',
    'COPPER': 'MCX:COPPERM',
    
    // FOREX (Yahoo + direct pairs)
    'USDINR': 'USDINR=X',
    'EURINR': 'EURINR=X',
    'GBPINR': 'GBPINR=X',
    'EURUSD': 'EURUSD=X',
    'GBPUSD': 'GBPUSD=X',
    'JPYINR': 'JPYINR=X',

    // CRYPTO (Multiple sources for reliability)
    'BTC/USDT': 'BTC-USD',
    'ETH/USDT': 'ETH-USD', 
    'SOL/USDT': 'SOL-USD',
    'BNB/USDT': 'BNB-USD',
    'XRP/USDT': 'XRP-USD',
    'ADA/USDT': 'ADA-USD',
    'DOGE/USDT': 'DOGE-USD',
    'SHIB/USDT': 'SHIB-USD'
};

// ✅ LIVE EXCHANGE RATES
async function getLiveUSDINR(): Promise<number> {
    try {
        const data = await fetchYahooData('USDINR=X');
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        return price || USD_INR_RATE;
    } catch {
        return USD_INR_RATE;
    }
}

// --- MULTI-SOURCE RELIABLE FETCHER ---
async function fetchWithMultiProxy(targetUrl: string): Promise<any> {
    const proxies = [
        // Primary: AllOrigins (best for Yahoo JSON)
        (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        // Backup 1: CORS Anywhere
        (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        // Backup 2: CodeTabs
        (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
        // Direct (some browsers allow)
        (url: string) => url
    ];

    for (const proxy of proxies) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const finalUrl = proxy(targetUrl);
            
            const response = await fetch(finalUrl, { 
                signal: controller.signal,
                headers: { 'User-Agent': 'Mozilla/5.0' } 
            });
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                if (data.chart?.result?.length > 0) return data;
            }
        } catch (e) {
            console.warn(`Proxy ${targetUrl.slice(-30)} failed:`, e);
            continue;
        }
    }
    return null;
}

// ✅ ENHANCED YAHOO FETCHER - 1min/5min/15min support
async function fetchYahooData(ticker: string, interval: string = '5m'): Promise<any> {
    const ranges = ['1d', '5d']; // Try multiple ranges
    const cb = Date.now(); // Cache buster
    
    for (const range of ranges) {
        const targetUrl = `${YAHOO_CHART_BASE}${ticker}?interval=${interval}&range=${range}&_cb=${cb}`;
        const data = await fetchWithMultiProxy(targetUrl);
        if (data?.chart?.result?.[0]?.timestamp?.length > 0) {
            return data;
        }
    }
    return null;
}

// ✅ NSE INDIA LIVE DATA (Direct API)
async function fetchNSELive(symbol: string): Promise<any> {
    try {
        const url = `https://www.nseindia.com/api/quote-equity?symbol=${symbol.toUpperCase()}&section=quote_equity`;
        const data = await fetchWithMultiProxy(url);
        return data;
    } catch {
        return null;
    }
}

// ✅ BINANCE CRYPTO LIVE (24/7 markets)
async function fetchBinanceLive(symbol: string): Promise<any> {
    if (!symbol.includes('/')) return null;
    const pair = symbol.replace('/', '').toLowerCase();
    try {
        const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`;
        const response = await fetch(url);
        return await response.json();
    } catch {
        return null;
    }
}

// --- INTELLIGENT TICKER RESOLVER ---
async function resolveTicker(symbol: string, assetType: AssetType): Promise<{ ticker: string, source: string, needsConversion: boolean }> {
    const upperSymbol = symbol.toUpperCase();
    
    // 1. Exact mapping (highest priority)
    if (TICKER_MAP[upperSymbol]) {
        return { ticker: TICKER_MAP[upperSymbol], source: 'yahoo', needsConversion: false };
    }
    
    // 2. NSE Stocks (.NS)
    if (assetType === 'stocks' || upperSymbol.match(/^[A-Z]{2,5}$/)) {
        const nseTicker = `${upperSymbol}.NS`;
        return { ticker: nseTicker, source: 'yahoo', needsConversion: false };
    }
    
    // 3. MCX Commodities
    if (assetType === 'mcx' && ['GOLD', 'SILVER', 'CRUDEOIL', 'NATURALGAS', 'COPPER'].includes(upperSymbol)) {
        return { ticker: `MCX:${upperSymbol}M`, source: 'yahoo', needsConversion: false };
    }
    
    // 4. Crypto USDT pairs
    if (assetType === 'crypto' || upperSymbol.includes('/USDT')) {
        const yahooCrypto = upperSymbol.replace('/USDT', '-USD');
        return { ticker: yahooCrypto, source: 'yahoo', needsConversion: true };
    }
    
    // 5. Forex pairs
    if (assetType === 'forex' || upperSymbol.includes('INR') || upperSymbol.match(/^[A-Z]{3,6}=X$/)) {
        return { ticker: upperSymbol, source: 'yahoo', needsConversion: false };
    }
    
    return { ticker: `${upperSymbol}.NS`, source: 'yahoo', needsConversion: false };
}

// ✅ ENHANCED PARSER - Multi-source support
async function parseMarketData(symbol: string, rawData: any, source: string, needsConversion: boolean): Promise<StockData | null> {
    let candles: Candle[] = [];
    let currentPrice = 0;
    let prevClose = 0;
    
    const conversionRate = await getLiveUSDINR();
    const conversion = needsConversion ? conversionRate : 1;
    
    switch (source) {
        case 'yahoo':
            const yahooResult = rawData?.chart?.result?.[0];
            if (!yahooResult?.timestamp) return null;
            
            const timestamps = yahooResult.timestamp;
            const quotes = yahooResult.indicators.quote[0];
            
            for (let i = 0; i < timestamps.length; i++) {
                if (quotes.close[i] != null) {
                    candles.push({
                        time: timestamps[i] * 1000,
                        open: (quotes.open[i] || quotes.close[i]) * conversion,
                        high: quotes.high[i] * conversion || quotes.close[i] * conversion,
                        low: quotes.low[i] * conversion || quotes.close[i] * conversion,
                        close: quotes.close[i] * conversion,
                        volume: quotes.volume[i] || 0
                    });
                }
            }
            currentPrice = candles[candles.length - 1]?.close || 0;
            prevClose = (yahooResult.meta?.chartPreviousClose || candles[0]?.open || 0) * conversion;
            break;
            
        case 'nse':
            if (rawData?.lastPrice) {
                currentPrice = rawData.lastPrice;
                prevClose = rawData.previousClose || currentPrice * 0.99;
                // Create single candle for technicals
                candles = [{
                    time: Date.now(),
                    open: prevClose,
                    high: Math.max(currentPrice, prevClose),
                    low: Math.min(currentPrice, prevClose),
                    close: currentPrice,
                    volume: rawData.totalTradedVolume || 0
                }];
            }
            break;
            
        case 'binance':
            if (rawData?.lastPrice) {
                currentPrice = parseFloat(rawData.lastPrice) * conversion;
                prevClose = parseFloat(rawData.openPrice || rawData.lastPrice) * conversion;
                candles = [{
                    time: Date.now(),
                    open: prevClose,
                    high: currentPrice * 1.001,
                    low: currentPrice * 0.999,
                    close: currentPrice,
                    volume: parseFloat(rawData.volume || '0')
                }];
            }
            break;
    }
    
    if (candles.length === 0 || currentPrice === 0) return null;
    
    // Compute technicals (needs min 20 candles for reliability)
    const technicals = candles.length >= 20 ? analyzeStockTechnical(candles) : {
        score: 0, signalStrength: 'HOLD', activeSignals: [], rsi: 50, macd: {macd:0,signal:0,histogram:0}
    } as TechnicalSignals;
    
    return {
        price: currentPrice,
        change: currentPrice - prevClose,
        changePercent: ((currentPrice - prevClose) / prevClose) * 100,
        history: candles,
        technicals
    };
}

// 🚀 MAIN ENHANCED FETCHER - All Segments Live
export const fetchRealStockData = async (
    symbol: string, 
    settings: AppSettings, 
    assetType: AssetType = 'stocks'
): Promise<StockData | null> => {
    
    const { ticker, source, needsConversion } = await resolveTicker(symbol, assetType);
    console.log(`📡 Fetching ${symbol} → ${ticker} (${source})`);
    
    // Priority 1: NSE Direct (Indian market hours)
    if (assetType === 'stocks' && source === 'yahoo' && !ticker.includes('=')) {
        const nseData = await fetchNSELive(symbol.toUpperCase());
        if (nseData) {
            const parsed = await parseMarketData(symbol, nseData, 'nse', needsConversion);
            if (parsed) return parsed;
        }
    }
    
    // Priority 2: Binance Crypto (24/7, most reliable)
    if (assetType === 'crypto') {
        const binanceData = await fetchBinanceLive(symbol);
        if (binanceData) {
            const parsed = await parseMarketData(symbol, binanceData, 'binance', needsConversion);
            if (parsed) return parsed;
        }
    }
    
    // Priority 3: Yahoo Finance (fallback for all)
    const yahooData = await fetchYahooData(ticker);
    if (yahooData) {
        const parsed = await parseMarketData(symbol, yahooData, 'yahoo', needsConversion);
        if (parsed) return parsed;
    }
    
    console.warn(`❌ No data for ${symbol} (${ticker})`);
    return null;
};

// ✅ BATCH FETCHER for Portfolio/Scanner
export const fetchMultipleSymbols = async (
    symbols: string[], 
    settings: AppSettings
): Promise<{[key: string]: StockData}> => {
    const results: {[key: string]: StockData} = {};
    
    // Parallel fetch with rate limiting
    const promises = symbols.map(async (symbol, index) => {
        await new Promise(r => setTimeout(r, index * 100)); // 100ms stagger
        return fetchRealStockData(symbol, settings);
    });
    
    const dataArray = await Promise.allSettled(promises);
    dataArray.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value) {
            results[symbols[i]] = result.value;
        }
    });
    
    return results;
};

// ✅ MARKET STATUS HELPER
export const getMarketStatus = async (): Promise<'OPEN' | 'CLOSED'> => {
    // Check Nifty 50 futures for live market status
    const niftyData = await fetchYahooData('^NSEI');
    const lastTime = niftyData?.chart?.result?.[0]?.meta?.regularMarketTime;
    const now = Date.now() / 1000;
    return (now - lastTime) < 3600 ? 'OPEN' : 'CLOSED'; // Active if traded in last hour
};
