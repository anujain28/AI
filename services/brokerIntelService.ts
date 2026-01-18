
import { StockRecommendation, AppSettings, NewsItem, BrokerIntelResponse } from "../types";
import { fetchRealStockData } from "./marketDataService";

const STOCK_IDEAS_URL = "https://www.moneycontrol.com/markets/stock-ideas/";

/**
 * Frontend Scraper Logic
 * Replicates the provided puppeteer logic using DOMParser and CORS proxies.
 * Targets: table.MC_table tr, .MC_RECO_WRAP .grey10pt, .b_12bl
 */
async function scrapeMoneycontrolCalls(): Promise<string[]> {
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(STOCK_IDEAS_URL)}`,
    `https://corsproxy.io/?${encodeURIComponent(STOCK_IDEAS_URL)}`
  ];

  for (const proxy of proxies) {
    try {
      const res = await fetch(proxy);
      if (!res.ok) continue;
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      
      const calls: string[] = [];
      
      // Mirroring the provided script's selectors
      const selectors = ['table.MC_table tr', '.MC_RECO_WRAP .grey10pt', '.b_12bl'];
      
      selectors.forEach(selector => {
        doc.querySelectorAll(selector).forEach(el => {
          const text = el.textContent?.trim();
          if (text && (
            text.includes('Buy') || 
            text.includes('Sell') || 
            text.includes('Target')
          )) {
            // Remove timeframe tags like BTST, Weekly etc from the string itself if present
            const cleanText = text
              .replace(/\b(BTST|Weekly|Monthly|Intraday)\b/gi, '')
              .replace(/\s+/g, ' ')
              .trim();
            
            if (cleanText.length > 10 && !calls.includes(cleanText)) {
              calls.push(cleanText);
            }
          }
        });
      });

      if (calls.length > 0) return calls.slice(0, 10);
    } catch (e) {
      console.warn("Scraper proxy failed", e);
    }
  }
  return ["No latest calls available right now."];
}

/**
 * Broker Intel Service
 * Unified recommendations engine focused on latest calls and technical alpha.
 */
export const fetchBrokerIntel = async (settings: AppSettings): Promise<BrokerIntelResponse> => {
  try {
    // 1. Get the latest calls using the scraped logic
    const rawCalls = await scrapeMoneycontrolCalls();
    
    // Convert raw calls to NewsItem format for the UI
    const news: NewsItem[] = rawCalls.map(call => ({
      title: call,
      link: STOCK_IDEAS_URL,
      pubDate: new Date().toISOString(),
      description: "Direct expert recommendation scraped from Moneycontrol.",
      source: "Moneycontrol Live"
    }));

    // 2. Fetch technical validation for a subset of major tickers (Best 5 logic)
    // We scan a core list to find the 5 with the highest technical conviction
    const CORE_TICKERS = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS', 'AXISBANK.NS', 'SBIN.NS', 'BHARTIARTL.NS'];
    
    const techResults = await Promise.all(CORE_TICKERS.map(async (ticker) => {
      try {
        const data = await fetchRealStockData(ticker, settings, "15m", "2d");
        if (!data || data.technicals.score < 60) return null;
        
        return {
          symbol: ticker,
          name: ticker.split('.')[0],
          type: 'STOCK',
          sector: 'Top Pick',
          currentPrice: data.price,
          reason: `Technical Pulse: ${data.technicals.activeSignals[0] || 'Bullish Momentum'} confirmed.`,
          riskLevel: data.technicals.score > 75 ? 'Low' : 'Medium',
          targetPrice: data.price * (1 + (data.technicals.atr / data.price) * 3),
          score: data.technicals.score,
          lotSize: 1,
          isTopPick: data.technicals.score > 70,
          sourceUrl: STOCK_IDEAS_URL
        } as StockRecommendation;
      } catch { return null; }
    }));

    const recommendations = techResults
      .filter((r): r is StockRecommendation => r !== null)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5); // Best 5 picks

    return { 
      data: recommendations,
      news: news
    };
  } catch (error: any) {
    console.error("Broker Intel Engine Failure:", error);
    return { data: [], news: [], error: 'DATA_UNAVAILABLE' };
  }
};
