
import { StockRecommendation, AppSettings, NewsItem, BrokerIntelResponse } from "../types";
import { fetchRealStockData } from "./marketDataService";

const STOCK_IDEAS_URL = "https://www.moneycontrol.com/markets/stock-ideas/";
const NEWS_FALLBACK_URL = "https://www.moneycontrol.com/news/tags/recommendations.html";

/**
 * High-Speed Browser Scraper 
 * Replicates your provided Puppeteer logic using DOMParser and Proxy Racing.
 */
async function scrapeLatestCalls(): Promise<Partial<NewsItem>[]> {
  const primaryProxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(STOCK_IDEAS_URL)}`,
    `https://corsproxy.io/?${encodeURIComponent(STOCK_IDEAS_URL)}`
  ];

  let calls: Partial<NewsItem>[] = [];

  // Race proxies for the fastest response
  try {
    // Fixed: Replaced Promise.any with custom racing logic to avoid TypeScript errors on targets below ES2021.
    // This implementation mimic Promise.any by resolving with the first successful fetch text response.
    const html = await new Promise<string>((resolve, reject) => {
      let settledCount = 0;
      let resolved = false;
      primaryProxies.forEach(url => {
        fetch(url)
          .then(async res => {
            if (!res.ok) throw new Error("Proxy failed");
            const text = await res.text();
            if (!resolved) {
              resolved = true;
              resolve(text);
            }
          })
          .catch(err => {
            settledCount++;
            if (settledCount === primaryProxies.length && !resolved) {
              reject(new Error("All proxies failed"));
            }
          });
      });
    });

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    // Your requested logic: table tr iteration
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
            source: "Moneycontrol Live"
          });
        }
      }
    });
  } catch (e) {
    console.warn("Primary scraper race failed, using news fallback.");
  }

  // Fallback: news tags recommendations (titles only)
  if (calls.length === 0) {
    try {
      const newsHtml = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(NEWS_FALLBACK_URL)}`).then(r => r.text());
      const doc = new DOMParser().parseFromString(newsHtml, "text/html");
      const newsLinks = doc.querySelectorAll('.article_title a, h2 a');
      Array.from(newsLinks).slice(0, 10).forEach(el => {
        const title = el.textContent?.trim();
        if (title) {
          calls.push({ title, reco: title, stock: '', target: '', source: "News Feed" });
        }
      });
    } catch (e) {}
  }

  return calls;
}

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

    // Best 5 Recommendations: Based on pure Technical Conviction from Yahoo data
    const CORE_UNIVERSE = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS', 'SBIN.NS', 'AXISBANK.NS', 'BHARTIARTL.NS'];
    
    const enriched = await Promise.all(CORE_UNIVERSE.map(async (ticker) => {
        const data = await fetchRealStockData(ticker, settings, "15m", "2d");
        if (!data) return null;
        return {
          symbol: ticker,
          name: ticker.split('.')[0],
          type: 'STOCK',
          sector: 'High-Alpha Pick',
          currentPrice: data.price,
          reason: `Yahoo Technicals: ${data.technicals.activeSignals[0] || 'Momentum Breakout'} detected.`,
          riskLevel: data.technicals.score > 75 ? 'Low' : 'Medium',
          targetPrice: data.price * (1 + (data.technicals.atr / data.price) * 3),
          score: data.technicals.score,
          lotSize: 1,
          isTopPick: data.technicals.score > 70,
          sourceUrl: STOCK_IDEAS_URL
        } as StockRecommendation;
    }));

    const recommendations = (enriched.filter(r => r !== null) as StockRecommendation[])
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);

    return { data: recommendations, news: news };
  } catch (error: any) {
    return { data: [], news: [], error: 'SCRAPER_ERROR' };
  }
};
