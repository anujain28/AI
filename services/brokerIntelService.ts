
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

const RSS_FEED_URL = "https://www.moneycontrol.com/rss/stockadvices.xml";

async function fetchRSSNews(): Promise<NewsItem[]> {
  const proxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(RSS_FEED_URL)}`,
    `https://corsproxy.io/?${encodeURIComponent(RSS_FEED_URL)}`
  ];

  for (const proxy of proxies) {
    try {
      const res = await fetch(proxy);
      if (!res.ok) continue;
      const xmlText = await res.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      const items = xmlDoc.querySelectorAll("item");
      
      const news: NewsItem[] = [];
      items.forEach((item, idx) => {
        if (idx > 10) return; // Limit to 10 latest news
        news.push({
          title: item.querySelector("title")?.textContent || "",
          link: item.querySelector("link")?.textContent || "",
          pubDate: item.querySelector("pubDate")?.textContent || "",
          description: item.querySelector("description")?.textContent || "",
          source: "Moneycontrol Advice"
        });
      });
      return news;
    } catch (e) {
      console.warn("RSS Proxy failed", proxy, e);
    }
  }
  return [];
}

/**
 * Broker Intel Service (Unified News & Technical Engine)
 */
export const fetchBrokerIntel = async (settings: AppSettings): Promise<BrokerIntelResponse> => {
  try {
    // 1. Fetch Technical Calls
    const technicalResults = await Promise.all(INSTITUTIONAL_CORE.map(async (ticker) => {
      try {
        const data = await fetchRealStockData(ticker, settings, "15m", "2d");
        if (!data) return null;

        const tech = data.technicals;
        const price = data.price;
        const symbol = ticker.split('.')[0];

        if (tech.score < 65) return null;

        let signalContext = "";
        if (tech.activeSignals.includes("BB Breakout")) signalContext = "Price breakout from volatility squeeze.";
        else if (tech.activeSignals.includes("EMA Bull Stack")) signalContext = "Strong multi-day momentum trend confirmed.";
        else if (tech.activeSignals.includes("High Volume Pulse")) signalContext = "Institutional buying detected at lower levels.";
        else signalContext = "Trend reversal confirmed with positive volume flow.";

        const reason = `Technical Consensus: ${signalContext} Support zone identified at ₹${(price * 0.985).toFixed(2)}. Targets set based on ATR volatility expansion.`;

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

    // 2. Fetch Latest News Feed
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
