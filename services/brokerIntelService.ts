
import { StockRecommendation, AppSettings, NewsItem, BrokerIntelResponse } from "../types";
import { fetchRealStockData } from "./marketDataService";

const STOCK_IDEAS_URL = "https://www.moneycontrol.com/markets/stock-ideas/";
const NEWS_FALLBACK_URL = "https://www.moneycontrol.com/news/tags/recommendations.html";

/**
 * Frontend Implementation of the user-provided Puppeteer/Cheerio script.
 * Replicates the table tr iteration and fallback news title extraction.
 */
async function scrapeLatestCalls(): Promise<Partial<NewsItem>[]> {
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(STOCK_IDEAS_URL)}`,
    `https://corsproxy.io/?${encodeURIComponent(STOCK_IDEAS_URL)}`
  ];

  let calls: Partial<NewsItem>[] = [];

  // 1. Primary Scrape: table tr logic
  for (const proxy of proxies) {
    try {
      const res = await fetch(proxy);
      if (!res.ok) continue;
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      
      const rows = doc.querySelectorAll('table tr');
      rows.forEach(row => {
        const tds = row.querySelectorAll('td');
        if (tds.length >= 3) {
          const stock = tds[0].textContent?.trim() || '';
          const reco = tds[1].textContent?.trim() || '';
          const target = tds[2].textContent?.trim() || '';

          if (stock && (reco.toLowerCase().includes('buy') || reco.toLowerCase().includes('sell'))) {
            calls.push({ 
              stock, 
              reco, 
              target,
              title: `${stock}: ${reco} (Tgt: ${target})`,
              source: "Moneycontrol Table"
            });
          }
        }
      });

      if (calls.length > 0) break;
    } catch (e) {
      console.warn("Table scrape failed", e);
    }
  }

  // 2. Fallback: news tags recommendations
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
        
        // Selectors: .article_title a, h2 a
        const newsLinks = doc.querySelectorAll('.article_title a, h2 a');
        Array.from(newsLinks).slice(0, 10).forEach(el => {
          const title = el.textContent?.trim();
          if (title) {
            calls.push({ 
              title, 
              reco: title, 
              stock: '', 
              target: '',
              source: "News Recommendations"
            });
          }
        });

        if (calls.length > 0) break;
      } catch (e) {
        console.warn("News fallback failed", e);
      }
    }
  }

  return calls;
}

/**
 * Broker Intel Service
 * Integrates the new structured scraper into the app's data flow.
 */
export const fetchBrokerIntel = async (settings: AppSettings): Promise<BrokerIntelResponse> => {
  try {
    const rawResults = await scrapeLatestCalls();
    
    const news: NewsItem[] = rawResults.map(item => ({
      title: item.title || "Latest Call",
      link: STOCK_IDEAS_URL,
      pubDate: new Date().toISOString(),
      description: item.reco || "",
      source: item.source || "Scraper",
      stock: item.stock,
      reco: item.reco,
      target: item.target
    }));

    // Generate Best 5 picks based on technical scoring of core tickers
    const CORE_UNIVERSE = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS', 'SBIN.NS', 'AXISBANK.NS', 'BHARTIARTL.NS'];
    
    const enriched = await Promise.all(CORE_UNIVERSE.map(async (ticker) => {
      try {
        const data = await fetchRealStockData(ticker, settings, "15m", "2d");
        if (!data) return null;
        
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

    const recommendations = enriched
      .filter((r): r is StockRecommendation => r !== null)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);

    return { 
      data: recommendations,
      news: news
    };
  } catch (error: any) {
    console.error("Scraper Failure:", error);
    return { data: [], news: [], error: 'SCRAPER_ERROR' };
  }
};
