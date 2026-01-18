
import { StockRecommendation, AppSettings, NewsItem, BrokerIntelResponse } from "../types";
import { fetchRealStockData } from "./marketDataService";

/**
 * High-conviction universe for secondary technical validation.
 */
const INSTITUTIONAL_CORE = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS', 
  'BHARTIARTL.NS', 'AXISBANK.NS', 'SBIN.NS', 'LICI.NS', 'ITC.NS',
  'MARUTI.NS', 'TATAMOTORS.NS', 'SUNPHARMA.NS', 'JSWSTEEL.NS', 'LT.NS',
  'ADANIENT.NS', 'ONGC.NS', 'TATASTEEL.NS', 'COALINDIA.NS', 'TITAN.NS'
];

const STOCK_IDEAS_URL = "https://www.moneycontrol.com/markets/stock-ideas/";

/**
 * Parses a standard Moneycontrol recommendation string:
 * "Buy Tata Motors; target of Rs 1100: ICICI Direct"
 */
function parseCallString(title: string) {
  const buyMatch = title.match(/Buy\s+(.*?);/i);
  const sellMatch = title.match(/Sell\s+(.*?);/i);
  const targetMatch = title.match(/target\s+of\s+Rs\s+([\d,.]+)/i);
  const brokerMatch = title.match(/:\s+(.*)$/i);

  const action = buyMatch ? 'BUY' : sellMatch ? 'SELL' : 'HOLD';
  const symbol = (buyMatch ? buyMatch[1] : sellMatch ? sellMatch[1] : title.split(';')[0]).trim();
  const target = targetMatch ? targetMatch[1].replace(/,/g, '') : null;
  const broker = brokerMatch ? brokerMatch[1].trim() : "Market Expert";

  return { action, symbol, target, broker };
}

async function fetchLiveStockIdeas(): Promise<NewsItem[]> {
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
      
      // Moneycontrol Stock Ideas titles are typically in <a> tags within specific container classes
      // We look for titles containing "Buy" or "Sell"
      const links = Array.from(doc.querySelectorAll('a[title]'));
      const calls: NewsItem[] = [];
      
      const seenTitles = new Set();

      for (const link of links) {
        const title = link.getAttribute('title') || "";
        if ((title.startsWith('Buy') || title.startsWith('Sell')) && !seenTitles.has(title)) {
          seenTitles.add(title);
          const parsed = parseCallString(title);
          
          calls.push({
            title: title,
            link: link.getAttribute('href')?.startsWith('http') ? link.getAttribute('href')! : `https://www.moneycontrol.com${link.getAttribute('href')}`,
            pubDate: new Date().toISOString(), // Page scrape doesn't always have easy dates, use current
            description: `Expert ${parsed.action} call by ${parsed.broker}. Target Price: ₹${parsed.target || 'TBA'}.`,
            source: parsed.broker
          });

          if (calls.length >= 10) break;
        }
      }

      if (calls.length > 0) return calls;
    } catch (e) {
      console.warn("Proxy failed for stock ideas scrape", proxy, e);
    }
  }
  return [];
}

/**
 * Broker Intel Service
 * Fetches "Latest Calls" directly from Moneycontrol Stock Ideas page.
 */
export const fetchBrokerIntel = async (settings: AppSettings): Promise<BrokerIntelResponse> => {
  try {
    // 1. Fetch Technical Validation for high-conviction stocks
    const technicalResults = await Promise.all(INSTITUTIONAL_CORE.slice(0, 10).map(async (ticker) => {
      try {
        const data = await fetchRealStockData(ticker, settings, "15m", "2d");
        if (!data || data.technicals.score < 60) return null;
        
        const symbol = ticker.split('.')[0];
        return {
          symbol: ticker,
          name: symbol,
          type: 'STOCK',
          sector: 'Technical Alpha',
          currentPrice: data.price,
          reason: `Technical Scanner: ${data.technicals.activeSignals[0] || 'Bullish Momentum'} confirmed.`,
          riskLevel: data.technicals.score > 75 ? 'Low' : 'Medium',
          targetPrice: data.price * (1 + (data.technicals.atr / data.price) * 3),
          score: data.technicals.score,
          lotSize: 1,
          isTopPick: data.technicals.score > 70,
          sourceUrl: `https://www.moneycontrol.com/india/stockpricequote/${symbol.toLowerCase()}`
        } as StockRecommendation;
      } catch (err) { return null; }
    }));

    // 2. Scrape Latest Broker Calls (This is the "Stock Ideas" page content)
    const latestCalls = await fetchLiveStockIdeas();

    const validTechnicalRecs = technicalResults
      .filter((r): r is StockRecommendation => r !== null)
      .sort((a, b) => (b.score || 0) - (a.score || 0));

    return { 
      data: validTechnicalRecs,
      news: latestCalls
    };
  } catch (error: any) {
    console.error("Broker Intel Engine Failure:", error);
    return { data: [], news: [], error: 'DATA_UNAVAILABLE' };
  }
};
