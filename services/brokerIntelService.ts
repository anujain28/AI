
import { StockRecommendation, AppSettings, NewsItem, BrokerIntelResponse } from "../types";
import { fetchRealStockData } from "./marketDataService";

const STOCK_IDEAS_URL = "https://www.moneycontrol.com/markets/stock-ideas/";

/**
 * Scraper for MoneyControl or similar sources
 */
async function scrapeLatestCalls(): Promise<Partial<NewsItem>[]> {
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(STOCK_IDEAS_URL)}`,
    `https://corsproxy.io/?${encodeURIComponent(STOCK_IDEAS_URL)}`
  ];

  let calls: Partial<NewsItem>[] = [];

  try {
    const html = await new Promise<string>((resolve, reject) => {
      let settledCount = 0;
      let resolved = false;
      proxies.forEach(url => {
        fetch(url)
          .then(async res => {
            if (!res.ok) throw new Error("Proxy failed");
            const text = await res.text();
            if (!resolved) {
              resolved = true;
              resolve(text);
            }
          })
          .catch(() => {
            settledCount++;
            if (settledCount === proxies.length && !resolved) {
              reject(new Error("All proxies failed"));
            }
          });
      });
    });

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const rows = doc.querySelectorAll('table tr');
    rows.forEach(row => {
      const tds = row.querySelectorAll('td');
      if (tds.length >= 3) {
        const stock = tds[0].textContent?.trim() || '';
        const reco = tds[1].textContent?.trim() || '';
        const target = tds[2].textContent?.trim() || '';
        if (stock && (reco.toLowerCase().includes('buy'))) {
          calls.push({ stock, reco, target, title: `${stock}: ${reco}`, source: "Moneycontrol" });
        }
      }
    });
  } catch (e) {
    console.debug("Broker intel scraper failed, using technical fallback.");
  }
  return calls;
}

export const fetchBrokerIntel = async (settings: AppSettings): Promise<BrokerIntelResponse> => {
  try {
    const rawResults = await scrapeLatestCalls();
    const news: NewsItem[] = rawResults.map(item => ({
      title: item.title || "Call",
      link: STOCK_IDEAS_URL,
      pubDate: new Date().toISOString(),
      description: item.reco || "",
      source: item.source || "Feed",
      stock: item.stock,
      reco: item.reco,
      target: item.target
    }));

    // BEST 5 RECOMMENDATIONS: Quantitative high-conviction logic
    const TOP_50_STOCKS = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'AXISBANK.NS', 'ITC.NS', 'KOTAKBANK.NS'];
    
    const enriched = await Promise.all(TOP_50_STOCKS.map(async (ticker) => {
        const data = await fetchRealStockData(ticker, settings, "15m", "2d");
        if (!data) return null;
        return {
          symbol: ticker,
          name: ticker.split('.')[0],
          type: 'STOCK',
          sector: 'High-Conviction',
          currentPrice: data.price,
          reason: `AI Momentum: ${data.technicals.activeSignals[0] || 'Technical Breakout'}`,
          riskLevel: data.technicals.score > 80 ? 'Low' : 'Medium',
          targetPrice: data.price * 1.05,
          score: data.technicals.score,
          lotSize: 1,
          isTopPick: data.technicals.score >= 80,
          sourceUrl: STOCK_IDEAS_URL
        } as StockRecommendation;
    }));

    const recommendations = (enriched.filter(r => r !== null) as StockRecommendation[])
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);

    return { data: recommendations, news: news };
  } catch (error) {
    return { data: [], news: [], error: 'INTEL_FETCH_ERROR' };
  }
};
