
import { StockRecommendation, AppSettings, NewsItem, BrokerIntelResponse } from "../types";
import { fetchRealStockData } from "./marketDataService";

/**
 * High-conviction universe focusing on liquid Nifty 50 and Next 50 leaders.
 */
const INSTITUTIONAL_CORE = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS', 
  'BHARTIARTL.NS', 'AXISBANK.NS', 'SBIN.NS', 'LICI.NS', 'ITC.NS',
  'MARUTI.NS', 'TATAMOTORS.NS', 'SUNPHARMA.NS', 'JSWSTEEL.NS', 'LT.NS',
  'ADANIENT.NS', 'ONGC.NS', 'TATASTEEL.NS', 'COALINDIA.NS', 'TITAN.NS',
  'ULTRACEMCO.NS', 'BHARTIHEXA.NS', 'ZOMATO.NS', 'PAYTM.NS', 'HAL.NS',
  'BEL.NS', 'MAZDOCK.NS', 'IRFC.NS', 'RVNL.NS', 'SUZLON.NS', 'TRENT.NS',
  'DLF.NS', 'SIEMENS.NS', 'ABB.NS', 'BAJFINANCE.NS', 'WIPRO.NS', 'JIOFIN.NS'
];

const RSS_FEEDS = [
  { url: "https://economictimes.indiatimes.com/markets/stocks/recos/rssfeeds/81872147.cms", source: "Economic Times" },
  { url: "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms", source: "ET Markets" },
  { url: "https://www.moneycontrol.com/rss/stockadvices.xml", source: "Moneycontrol Advice" }
];

async function fetchRSSNews(): Promise<NewsItem[]> {
  const allNews: NewsItem[] = [];
  
  for (const feed of RSS_FEEDS) {
    const proxies = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(feed.url)}`,
      `https://corsproxy.io/?${encodeURIComponent(feed.url)}`
    ];

    for (const proxy of proxies) {
      try {
        const res = await fetch(proxy);
        if (!res.ok) continue;
        const xmlText = await res.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const items = xmlDoc.querySelectorAll("item");
        
        items.forEach((item, idx) => {
          if (idx > 5) return; // Limit items per feed for variety
          allNews.push({
            title: item.querySelector("title")?.textContent || "",
            link: item.querySelector("link")?.textContent || "",
            pubDate: item.querySelector("pubDate")?.textContent || "",
            description: item.querySelector("description")?.textContent || "",
            source: feed.source
          });
        });
        break; // Successfully fetched this feed, move to next
      } catch (e) {
        console.warn(`RSS Proxy failed for ${feed.source}`, proxy, e);
      }
    }
  }

  // Sort by date (descending)
  return allNews.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
}

/**
 * Broker Intel Service (Unified News & Technical Engine)
 */
export const fetchBrokerIntel = async (settings: AppSettings): Promise<BrokerIntelResponse> => {
  try {
    // 1. Fetch Technical Calls (Best 5 - 10 Logic)
    const technicalResults = await Promise.all(INSTITUTIONAL_CORE.map(async (ticker) => {
      try {
        const data = await fetchRealStockData(ticker, settings, "15m", "2d");
        if (!data) return null;

        const tech = data.technicals;
        const price = data.price;
        const symbol = ticker.split('.')[0];

        if (tech.score < 65) return null;

        let signalContext = "";
        if (tech.activeSignals.includes("BB Breakout")) signalContext = "Breakout detected.";
        else if (tech.activeSignals.includes("EMA Bull Stack")) signalContext = "Strong trend confirmed.";
        else if (tech.activeSignals.includes("High Volume Pulse")) signalContext = "Institutional buying pulse.";
        else signalContext = "Bullish momentum reversal.";

        const reason = `Quant Intelligence: ${signalContext} Support zone at ₹${(price * 0.985).toFixed(2)}. Alpha targets projected.`;

        return {
          symbol: ticker,
          name: symbol,
          type: 'STOCK',
          sector: 'Consensus Idea',
          currentPrice: price,
          reason,
          riskLevel: tech.score > 80 ? 'Low' : 'Medium',
          targetPrice: price * (1 + (tech.atr / price) * 3.5),
          score: tech.score,
          lotSize: 1,
          isTopPick: tech.score > 75,
          sourceUrl: `https://www.moneycontrol.com/india/stockpricequote/${symbol.toLowerCase()}`
        } as StockRecommendation;
      } catch (err) {
        return null;
      }
    }));

    // 2. Fetch Latest News & ET Recos
    const newsFeed = await fetchRSSNews();

    const validData = technicalResults
      .filter((r): r is StockRecommendation => r !== null)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 10);

    return { 
      data: validData,
      news: newsFeed
    };
  } catch (error: any) {
    console.error("Institutional Engine Failure:", error);
    return { data: [], news: [], error: 'DATA_UNAVAILABLE' };
  }
};
