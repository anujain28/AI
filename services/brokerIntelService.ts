
import { StockRecommendation, AppSettings, NewsItem, BrokerIntelResponse } from "../types";
import { fetchRealStockData } from "./marketDataService";

const STOCK_IDEAS_URL = "https://www.moneycontrol.com/markets/stock-ideas/";
const NEWS_FALLBACK_URL = "https://www.moneycontrol.com/news/tags/recommendations.html";

/**
 * Frontend Implementation of the user-provided Puppeteer/Cheerio logic.
 * Uses CORS proxies and DOMParser to replicate the scraping behavior.
 */
async function getLatestCalls(): Promise<string[]> {
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(STOCK_IDEAS_URL)}`,
    `https://corsproxy.io/?${encodeURIComponent(STOCK_IDEAS_URL)}`
  ];

  let calls: string[] = [];

  // 1. Primary Scrape: Stock Ideas Page
  for (const proxy of proxies) {
    try {
      const res = await fetch(proxy);
      if (!res.ok) continue;
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      
      // Selectors from user script: table.MC_table tr, .MC_RECO_WRAP .grey10pt, .b_12bl
      const selectors = ['table.MC_table tr', '.MC_RECO_WRAP .grey10pt', '.b_12bl'];
      
      selectors.forEach(selector => {
        doc.querySelectorAll(selector).forEach(el => {
          const text = el.textContent?.trim();
          if (text && (
            text.includes('Buy') || 
            text.includes('Sell') || 
            text.includes('Target')
          )) {
            // Basic cleaning to remove excess whitespace and formatting
            const cleanText = text.replace(/\s+/g, ' ').trim();
            if (cleanText.length > 15 && !calls.includes(cleanText)) {
              calls.push(cleanText);
            }
          }
        });
      });

      if (calls.length > 0) break;
    } catch (e) {
      console.warn("Primary scrape failed", e);
    }
  }

  // 2. Fallback Scrape: News Tags if no table data found
  if (calls.length === 0) {
    const newsProxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(NEWS_FALLBACK_URL)}`,
      `https://corsproxy.io/?${encodeURIComponent(NEWS_FALLBACK_URL)}`
    ];

    for (const proxy of newsProxies) {
      try {
        const res = await fetch(proxy);
        if (!res.ok) continue;
        const html = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        
        // Selectors from user script: .article_title a, h2 a
        const newsItems = doc.querySelectorAll('.article_title a, h2 a');
        Array.from(newsItems).slice(0, 5).forEach(el => {
          const text = el.textContent?.trim();
          if (text) calls.push(text);
        });

        if (calls.length > 0) break;
      } catch (e) {
        console.warn("Fallback scrape failed", e);
      }
    }
  }

  return calls.length ? calls.slice(0, 10) : ['No latest calls available right now.'];
}

/**
 * Broker Intel Service
 * Finalized to use the user-provided scraping logic for "Latest Calls".
 */
export const fetchBrokerIntel = async (settings: AppSettings): Promise<BrokerIntelResponse> => {
  try {
    // Execute the user-provided scraping logic
    const scrapedCalls = await getLatestCalls();
    
    // Map strings to NewsItems for the UI
    const news: NewsItem[] = scrapedCalls.map(call => ({
      title: call,
      link: call.includes('available right now') ? '#' : STOCK_IDEAS_URL,
      pubDate: new Date().toISOString(),
      description: "Extracted via Moneycontrol Stock Ideas Scraper.",
      source: "Scraped Data"
    }));

    // Generate Best 5 recommendations based on technical conviction
    const CORE_UNIVERSE = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS', 'SBIN.NS', 'AXISBANK.NS', 'BHARTIARTL.NS'];
    
    const enriched = await Promise.all(CORE_UNIVERSE.map(async (ticker) => {
      try {
        const data = await fetchRealStockData(ticker, settings, "15m", "2d");
        if (!data) return null;

        const tech = data.technicals;
        const price = data.price;
        const symbol = ticker.split('.')[0];

        return {
          symbol: ticker,
          name: symbol,
          type: 'STOCK',
          sector: 'Top Quant Pick',
          currentPrice: price,
          reason: `Institutional Pulse: ${tech.activeSignals[0] || 'Bullish Pattern'} confirmed on 15m core.`,
          riskLevel: tech.score > 75 ? 'Low' : 'Medium',
          targetPrice: price * (1 + (tech.atr / price) * 3),
          score: tech.score,
          lotSize: 1,
          isTopPick: tech.score > 70,
          sourceUrl: STOCK_IDEAS_URL
        } as StockRecommendation;
      } catch { return null; }
    }));

    const recommendations = enriched
      .filter((r): r is StockRecommendation => r !== null)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);

    return { 
      data: recommendations,
      news: news
    };
  } catch (error: any) {
    console.error("Broker Scraper Failure:", error);
    return { data: [], news: [], error: 'SCRAPER_FAILURE' };
  }
};
