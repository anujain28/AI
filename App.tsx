import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { fetchTopStockPicks, analyzeHoldings } from './services/geminiService';
import { checkAndRefreshStockList } from './services/stockListService';
import { StockRecommendation, PortfolioItem, MarketData, Transaction, AppSettings, UserProfile, Funds, HoldingAnalysis } from './types';
import { AuthOverlay } from './components/AuthOverlay';
import { TradeModal } from './components/TradeModal';
import { analyzeStockTechnical } from './services/technicalAnalysis';
import { fetchBrokerBalance, fetchHoldings, placeOrder } from './services/brokerService';
import { BarChart3, AlertCircle } from 'lucide-react';

// NEW PAGE COMPONENTS
import { BottomNav } from './components/BottomNav';
import { PageMarket } from './components/PageMarket';
import { PageCrypto } from './components/PageCrypto';
import { PagePaperPNL } from './components/PagePaperPNL';
import { PageLivePNL } from './components/PageLivePNL';
import { PageConfiguration } from './components/PageConfiguration';

const generateFallbackHistory = (startPrice: number, count: number) => {
    const candles = [];
    let price = startPrice;
    let time = Date.now() - (count * 300000); 
    for(let i=0; i<count; i++) {
        const change = (Math.random() - 0.5) * 0.004;
        const close = price * (1 + change);
        const high = Math.max(price, close) * (1 + Math.random() * 0.001);
        const low = Math.min(price, close) * (1 - Math.random() * 0.001);
        candles.push({ time, open: price, high, low, close, volume: Math.floor(Math.random() * 10000) });
        price = close;
        time += 300000;
    }
    return candles;
};

const STORAGE_KEYS = {
  SETTINGS: 'aitrade_settings_v9',
  PORTFOLIO: 'aitrade_portfolio_v3',
  FUNDS: 'aitrade_funds_v2', 
  TRANSACTIONS: 'aitrade_transactions',
  USER: 'aitrade_user_profile'
};

const SplashScreen = ({ visible }: { visible: boolean }) => {
    if (!visible) return null;
    return (
        <div className="fixed inset-0 z-[100] bg-[#0f172a] flex flex-col items-center justify-center transition-opacity duration-1000 animate-fade-out">
             <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/50 mb-8 animate-bounce">
                <BarChart3 size={48} className="text-white" />
             </div>
             <h1 className="text-3xl font-bold text-white tracking-[0.2em] mb-2 font-mono">AI-TRADE</h1>
             <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-500 animate-[width_1.5s_ease-in-out_infinite]" style={{width: '50%'}}></div>
             </div>
             <p className="text-slate-500 text-[10px] mt-4 font-mono tracking-widest">INITIALIZING</p>
        </div>
    );
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activePage, setActivePage] = useState(0); 
  
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    return saved ? JSON.parse(saved) : null;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const defaults = {
        initialFunds: { stock: 1000000, mcx: 500000, forex: 500000, crypto: 500000 },
        autoTradeConfig: { mode: 'PERCENTAGE', value: 5 },
        activeBrokers: ['PAPER', 'DHAN', 'GROWW', 'SHOONYA', 'BINANCE', 'COINDCX', 'COINSWITCH', 'ZEBPAY'], 
        enabledMarkets: { stocks: true, mcx: true, forex: true, crypto: true }, 
        telegramBotToken: '',
        telegramChatId: ''
    } as AppSettings;
    if (!saved) return defaults;
    return { ...defaults, ...JSON.parse(saved) };
  });

  const [funds, setFunds] = useState<Funds>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FUNDS);
    if (saved) return JSON.parse(saved);
    return { stock: 1000000, mcx: 500000, forex: 500000, crypto: 500000 };
  });
  
  const [brokerBalances, setBrokerBalances] = useState<Record<string, number>>({});
  const [paperPortfolio, setPaperPortfolio] = useState<PortfolioItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PORTFOLIO);
    if (!saved) return [];
    return JSON.parse(saved).filter((p: any) => p.broker === 'PAPER');
  });
  const [externalHoldings, setExternalHoldings] = useState<PortfolioItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [recommendations, setRecommendations] = useState<StockRecommendation[]>([]);
  const [marketData, setMarketData] = useState<MarketData>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<Record<string, HoldingAnalysis>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeBots, setActiveBots] = useState<{ [key: string]: boolean }>({ 'PAPER': true });
  
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockRecommendation | null>(null);
  const [tradeModalBroker, setTradeModalBroker] = useState<string | undefined>(undefined);
  const [niftyList, setNiftyList] = useState<string[]>([]);

  const allHoldings = useMemo(() => [...paperPortfolio, ...externalHoldings], [paperPortfolio, externalHoldings]);

  useEffect(() => { setTimeout(() => setShowSplash(false), 2000); }, []);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.FUNDS, JSON.stringify(funds)), [funds]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.PORTFOLIO, JSON.stringify(paperPortfolio)), [paperPortfolio]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions)), [transactions]);

  const handleLogin = (u: UserProfile) => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(u));
    setUser(u);
  };

  const showNotification = (msg: string) => {
      setNotification(msg);
      setTimeout(() => setNotification(null), 3000);
  };

  const syncExternalPortfolios = useCallback(async () => {
      if (!user) return;
      const { activeBrokers } = settings;
      const promises: any[] = [];
      const balPromises: any[] = [];

      activeBrokers.forEach(broker => {
          if (broker === 'PAPER') return;
          balPromises.push(fetchBrokerBalance(broker, settings).then(amt => ({ broker, amt })));
          promises.push(fetchHoldings(broker, settings));
      });

      if (balPromises.length) {
          Promise.all(balPromises).then(results => {
              const bals: Record<string, number> = {};
              results.forEach(r => bals[r.broker] = r.amt);
              setBrokerBalances(prev => ({...prev, ...bals}));
          });
      }

      if (promises.length) {
          const results = await Promise.all(promises);
          setExternalHoldings(results.flat());
      }
  }, [settings, user]);

  useEffect(() => {
     if (user) { syncExternalPortfolios(); const i = setInterval(syncExternalPortfolios, 30000); return () => clearInterval(i); }
  }, [user, syncExternalPortfolios]);

  const loadMarketData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    let stocksList = niftyList;
    if (stocksList.length === 0) {
        stocksList = await checkAndRefreshStockList();
        setNiftyList(stocksList);
    }
    const totalCap = settings.initialFunds.stock + settings.initialFunds.mcx + settings.initialFunds.forex + settings.initialFunds.crypto;
    const stocks = await fetchTopStockPicks(totalCap, stocksList, settings.enabledMarkets);
    setRecommendations(stocks);
    
    const initialMarketData: MarketData = {};
    const symbols = new Set([...stocks.map(s => s.symbol), ...allHoldings.map(p => p.symbol)]);
    
    for (const sym of symbols) {
         const rec = stocks.find(s => s.symbol === sym);
         const port = allHoldings.find(p => p.symbol === sym);
         const basePrice = rec ? rec.currentPrice : (port ? port.avgCost : 100);
         const history = generateFallbackHistory(basePrice, 50);
         initialMarketData[sym] = { 
             price: basePrice, 
             change: 0, 
             changePercent: 0, 
             history, 
             technicals: analyzeStockTechnical(history) 
         };
    }
    setMarketData(prev => ({...prev, ...initialMarketData}));
    setIsLoading(false);
  }, [settings, allHoldings, niftyList, user]);

  useEffect(() => { loadMarketData(); }, [user, loadMarketData]);

  const handleBuy = async (symbol: string, quantity: number, price: number, broker: any) => {
      const rec = recommendations.find(r => r.symbol === symbol) || allHoldings.find(h => h.symbol === symbol);
      const type = rec?.type || 'STOCK';
      
      if (broker === 'PAPER') {
          const cost = quantity * price;
          const existing = paperPortfolio.find(p => p.symbol === symbol && p.broker === 'PAPER');
          if (existing) {
              setPaperPortfolio(prev => prev.map(p => p.symbol === symbol ? {...p, quantity: p.quantity + quantity, totalCost: p.totalCost + cost, avgCost: (p.totalCost + cost)/(p.quantity+quantity)} : p));
          } else {
              setPaperPortfolio(prev => [...prev, { symbol, type, quantity, avgCost: price, totalCost: cost, broker: 'PAPER' }]);
          }
          setFunds(prev => ({...prev, stock: prev.stock - cost})); 
      } else {
          await placeOrder(broker, symbol, quantity, 'BUY', price, type, settings);
          syncExternalPortfolios();
      }
      setTransactions(prev => [...prev, { id: Date.now().toString(), type: 'BUY', symbol, assetType: type, quantity, price, timestamp: Date.now(), broker }]);
      showNotification(`BUY Executed: ${symbol}`);
  };

  const handleSell = async (symbol: string, quantity: number, price: number, broker: any) => {
      const rec = recommendations.find(r => r.symbol === symbol) || allHoldings.find(h => h.symbol === symbol);
      const type = rec?.type || 'STOCK';

      if (broker === 'PAPER') {
          const existing = paperPortfolio.find(p => p.symbol === symbol);
          if (existing && existing.quantity >= quantity) {
               const remaining = existing.quantity - quantity;
               if (remaining < 0.0001) setPaperPortfolio(prev => prev.filter(p => p.symbol !== symbol));
               else setPaperPortfolio(prev => prev.map(p => p.symbol === symbol ? {...p, quantity: remaining, totalCost: p.avgCost * remaining} : p));
               setFunds(prev => ({...prev, stock: prev.stock + (quantity * price)}));
          }
      } else {
          await placeOrder(broker, symbol, quantity, 'SELL', price, type, settings);
          syncExternalPortfolios();
      }
      setTransactions(prev => [...prev, { id: Date.now().toString(), type: 'SELL', symbol, assetType: type, quantity, price, timestamp: Date.now(), broker }]);
      showNotification(`SELL Executed: ${symbol}`);
  };

  const handleAnalysis = async () => {
      setIsAnalyzing(true);
      try {
          const res = await analyzeHoldings(allHoldings, marketData);
          const map: any = {};
          res.forEach(r => map[r.symbol] = r);
          setAnalysisData(map);
      } catch(e) {}
      setIsAnalyzing(false);
  };

  if (showSplash) return <SplashScreen visible={true} />;
  if (!user) return <AuthOverlay onLogin={(u) => { handleLogin(u); loadMarketData(); }} />;

  return (
    <div className="h-full flex flex-col bg-background text-slate-100 font-sans overflow-hidden">
      {notification && (
          <div className="fixed top-4 left-4 right-4 z-[60] bg-slate-800 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-3 animate-slide-up">
              <AlertCircle size={18} className="text-blue-400 flex-shrink-0" />
              <span className="text-xs font-medium">{notification}</span>
          </div>
      )}

      <main className="flex-1 overflow-y-auto custom-scrollbar relative w-full max-w-lg mx-auto md:max-w-7xl md:border-x md:border-slate-800">
        {activePage === 0 && (
            <PageMarket 
                recommendations={recommendations} 
                marketData={marketData} 
                onTrade={(s) => { setSelectedStock(s); setIsTradeModalOpen(true); }}
                onRefresh={loadMarketData}
                isLoading={isLoading}
                enabledMarkets={settings.enabledMarkets}
            />
        )}
        {activePage === 1 && (
            <PageCrypto 
                recommendations={recommendations} 
                marketData={marketData} 
                onTrade={(s) => { setSelectedStock(s); setIsTradeModalOpen(true); }}
                onRefresh={loadMarketData}
                isLoading={isLoading}
                enabledMarkets={settings.enabledMarkets}
            />
        )}
        {activePage === 2 && (
            <PagePaperPNL 
                holdings={allHoldings} 
                marketData={marketData}
                analysisData={analysisData}
                onSell={(s, b) => { 
                    const stk = recommendations.find(r => r.symbol === s) || { symbol: s, type: 'STOCK', currentPrice: marketData[s]?.price || 0 } as any;
                    setSelectedStock(stk);
                    setTradeModalBroker(b);
                    setIsTradeModalOpen(true);
                }}
                onAnalyze={handleAnalysis}
                isAnalyzing={isAnalyzing}
                funds={funds}
            />
        )}
        {activePage === 3 && (
            <PageLivePNL 
                holdings={allHoldings}
                marketData={marketData}
                analysisData={analysisData}
                onSell={(s, b) => { 
                     const stk = recommendations.find(r => r.symbol === s) || { symbol: s, type: 'STOCK', currentPrice: marketData[s]?.price || 0 } as any;
                     setSelectedStock(stk);
                     setTradeModalBroker(b);
                     setIsTradeModalOpen(true);
                }}
                brokerBalances={brokerBalances}
            />
        )}
        {activePage === 4 && (
            <PageConfiguration 
                settings={settings}
                onSave={(s) => { setSettings(s); showNotification("Settings Saved"); }}
                transactions={transactions}
                activeBots={activeBots}
                onToggleBot={(b) => setActiveBots(p => ({...p, [b]: !p[b]}))}
            />
        )}
      </main>

      <BottomNav activeTab={activePage} onChange={setActivePage} />

      {selectedStock && (
          <TradeModal 
            isOpen={isTradeModalOpen} 
            onClose={() => setIsTradeModalOpen(false)} 
            stock={selectedStock} 
            currentPrice={marketData[selectedStock.symbol]?.price || selectedStock.currentPrice} 
            funds={funds} 
            holdings={allHoldings.filter(p => p.symbol === selectedStock.symbol)} 
            activeBrokers={settings.activeBrokers} 
            initialBroker={tradeModalBroker}
            onBuy={handleBuy} 
            onSell={handleSell} 
          />
      )}
    </div>
  );
}