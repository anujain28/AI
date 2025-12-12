
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { fetchTopStockPicks, analyzeHoldings } from './services/geminiService';
import { checkAndRefreshStockList } from './services/stockListService';
import { fetchRealStockData } from './services/marketDataService';
import { StockRecommendation, PortfolioItem, MarketData, Transaction, AppSettings, UserProfile, Funds, HoldingAnalysis, AssetType } from './types';
import { AuthOverlay } from './components/AuthOverlay';
import { TradeModal } from './components/TradeModal';
import { fetchBrokerBalance, fetchHoldings, placeOrder } from './services/brokerService';
import { runAutoTradeEngine, simulateBackgroundTrades } from './services/autoTradeEngine';
import { BarChart3, AlertCircle, Briefcase, Cpu } from 'lucide-react';

// NEW PAGE COMPONENTS
import { BottomNav } from './components/BottomNav';
import { PageMarket } from './components/PageMarket';
import { PagePaperTrading } from './components/PagePaperTrading';
import { PageLivePNL } from './components/PageLivePNL';
import { PageConfiguration } from './components/PageConfiguration';

const STORAGE_KEYS = {
  SETTINGS: 'aitrade_settings_v10',
  PORTFOLIO: 'aitrade_portfolio_v4',
  FUNDS: 'aitrade_funds_v3', 
  TRANSACTIONS: 'aitrade_transactions_v2',
  USER: 'aitrade_user_profile',
  LAST_RUN: 'aitrade_last_run'
};

const STOCK_BROKERS = ['DHAN', 'SHOONYA'];
const CRYPTO_BROKERS = ['BINANCE', 'COINDCX', 'COINSWITCH', 'ZEBPAY'];

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
        activeBrokers: ['PAPER', 'DHAN', 'SHOONYA', 'BINANCE', 'COINDCX', 'COINSWITCH', 'ZEBPAY'], 
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

  const refreshIntervalRef = useRef<any>(null);
  const botIntervalRef = useRef<any>(null);

  const allHoldings = useMemo(() => [...paperPortfolio, ...externalHoldings], [paperPortfolio, externalHoldings]);

  // Derived Portfolios for new tabs
  const stockHoldings = useMemo(() => allHoldings.filter(h => STOCK_BROKERS.includes(h.broker)), [allHoldings]);
  const stockBalances = useMemo(() => {
    const bals: Record<string, number> = {};
    Object.entries(brokerBalances).forEach(([b, v]) => { if(STOCK_BROKERS.includes(b)) bals[b] = v as number; });
    return bals;
  }, [brokerBalances]);

  const cryptoHoldings = useMemo(() => allHoldings.filter(h => CRYPTO_BROKERS.includes(h.broker)), [allHoldings]);
  const cryptoBalances = useMemo(() => {
    const bals: Record<string, number> = {};
    Object.entries(brokerBalances).forEach(([b, v]) => { if(CRYPTO_BROKERS.includes(b)) bals[b] = v as number; });
    return bals;
  }, [brokerBalances]);


  useEffect(() => { setTimeout(() => setShowSplash(false), 2000); }, []);
  
  useEffect(() => localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.FUNDS, JSON.stringify(funds)), [funds]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.PORTFOLIO, JSON.stringify(paperPortfolio)), [paperPortfolio]);
  useEffect(() => localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions)), [transactions]);

  useEffect(() => {
      const lastRun = localStorage.getItem(STORAGE_KEYS.LAST_RUN);
      if (lastRun && activeBots['PAPER']) {
          const { newTransactions, newFunds } = simulateBackgroundTrades(parseInt(lastRun), settings, funds);
          if (newTransactions.length > 0) {
              setTransactions(prev => [...prev, ...newTransactions]);
              setFunds(newFunds);
              setPaperPortfolio(prev => {
                  const updated = [...prev];
                  newTransactions.forEach(tx => {
                      if (tx.type === 'BUY') {
                          updated.push({
                              symbol: tx.symbol, type: tx.assetType, quantity: tx.quantity, 
                              avgCost: tx.price, totalCost: tx.price * tx.quantity, broker: 'PAPER'
                          });
                      }
                  });
                  return updated;
              });
              showNotification(`Simulated ${newTransactions.length} background trades`);
          }
      }
      localStorage.setItem(STORAGE_KEYS.LAST_RUN, Date.now().toString());
  }, []);

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
     if (user) { 
         syncExternalPortfolios(); 
         const i = setInterval(syncExternalPortfolios, 30000); 
         return () => clearInterval(i); 
     }
  }, [user, syncExternalPortfolios]);

  const loadMarketData = useCallback(async () => {
    if (!user) return;
    
    setMarketData(current => {
       if (Object.keys(current).length === 0) setIsLoading(true);
       return current;
    });

    let stocksList = niftyList;
    if (stocksList.length === 0) {
        stocksList = await checkAndRefreshStockList();
        setNiftyList(stocksList);
    }
    
    let currentRecs = recommendations;
    if (recommendations.length === 0) {
        const totalCap = settings.initialFunds.stock + settings.initialFunds.mcx + settings.initialFunds.forex + settings.initialFunds.crypto;
        currentRecs = await fetchTopStockPicks(totalCap, stocksList, settings.enabledMarkets);
        setRecommendations(currentRecs);
    }
    
    const symbols = new Set([...currentRecs.map(s => s.symbol), ...allHoldings.map(p => p.symbol)]);
    
    const fetchPromises = Array.from(symbols).map(async (sym) => {
         const realData = await fetchRealStockData(sym, settings);
         return { symbol: sym, data: realData };
    });

    const results = await Promise.all(fetchPromises);

    setMarketData(prevMarketData => {
         const nextMarketData = { ...prevMarketData };
         
         results.forEach(({ symbol, data }) => {
             if (data) {
                 nextMarketData[symbol] = data;
             }
         });
         return nextMarketData;
    });

    setIsLoading(false);
    localStorage.setItem(STORAGE_KEYS.LAST_RUN, Date.now().toString());

  }, [settings, allHoldings, niftyList, user, recommendations]); 

  useEffect(() => { loadMarketData(); }, [user]);

  useEffect(() => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      if (user) {
          refreshIntervalRef.current = setInterval(() => {
              loadMarketData();
          }, 5000); // REFRESH RATE: 5s (Safe for Yahoo Finance)
      }
      return () => { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); };
  }, [user, loadMarketData]);

  useEffect(() => {
      if (botIntervalRef.current) clearInterval(botIntervalRef.current);
      if (user && activeBots['PAPER']) {
          botIntervalRef.current = setInterval(() => {
              const results = runAutoTradeEngine(settings, paperPortfolio, marketData, funds, recommendations);
              if (results.length > 0) {
                  const newTxs: Transaction[] = [];
                  let updatedFunds = { ...funds };
                  let updatedPortfolio = [...paperPortfolio];

                  results.forEach(res => {
                      if (res.transaction && res.newFunds) {
                          newTxs.push(res.transaction);
                          updatedFunds = res.newFunds; 
                          
                          if (res.transaction.type === 'BUY') {
                              // Add/Update Portfolio
                              const existingIdx = updatedPortfolio.findIndex(p => p.symbol === res.transaction?.symbol);
                              if (existingIdx >= 0) {
                                  const existing = updatedPortfolio[existingIdx];
                                  const newQty = existing.quantity + res.transaction.quantity;
                                  const newTotalCost = existing.totalCost + (res.transaction.price * res.transaction.quantity);
                                  updatedPortfolio[existingIdx] = {
                                      ...existing,
                                      quantity: newQty,
                                      totalCost: newTotalCost,
                                      avgCost: newTotalCost / newQty
                                  };
                              } else {
                                  updatedPortfolio.push({
                                      symbol: res.transaction.symbol,
                                      type: res.transaction.assetType,
                                      quantity: res.transaction.quantity,
                                      avgCost: res.transaction.price,
                                      totalCost: res.transaction.price * res.transaction.quantity,
                                      broker: 'PAPER'
                                  });
                              }
                          } else {
                              // SELL Logic
                              updatedPortfolio = updatedPortfolio.filter(p => p.symbol !== res.transaction?.symbol);
                          }
                      }
                  });

                  if (newTxs.length > 0) {
                      setTransactions(prev => [...prev, ...newTxs]);
                      setFunds(updatedFunds);
                      setPaperPortfolio(updatedPortfolio);
                      showNotification(`Bot executed ${newTxs.length} trades`);
                  }
              }
          }, 5000); // BOT RATE: 5s to match market data
      }
      return () => { if (botIntervalRef.current) clearInterval(botIntervalRef.current); };
  }, [user, activeBots, settings, paperPortfolio, marketData, funds, recommendations]);


  const handleBuy = async (symbol: string, quantity: number, price: number, broker: any) => {
      const rec = recommendations.find(r => r.symbol === symbol) || allHoldings.find(h => h.symbol === symbol);
      const type = rec?.type || 'STOCK';
      
      if (broker === 'PAPER') {
          const cost = quantity * price;
          
          // Separate Fund Check
          let hasFunds = false;
          if (type === 'MCX' && funds.mcx >= cost) hasFunds = true;
          else if (type === 'FOREX' && funds.forex >= cost) hasFunds = true;
          else if (type === 'CRYPTO' && funds.crypto >= cost) hasFunds = true;
          else if (type === 'STOCK' && funds.stock >= cost) hasFunds = true;

          if (!hasFunds) {
              showNotification(`Insufficient ${type} Funds`);
              return;
          }

          const existing = paperPortfolio.find(p => p.symbol === symbol && p.broker === 'PAPER');
          if (existing) {
              setPaperPortfolio(prev => prev.map(p => p.symbol === symbol ? {...p, quantity: p.quantity + quantity, totalCost: p.totalCost + cost, avgCost: (p.totalCost + cost)/(p.quantity+quantity)} : p));
          } else {
              setPaperPortfolio(prev => [...prev, { symbol, type, quantity, avgCost: price, totalCost: cost, broker: 'PAPER' }]);
          }

          setFunds(prev => {
              const newFunds = { ...prev };
              if (type === 'MCX') newFunds.mcx -= cost;
              else if (type === 'FOREX') newFunds.forex -= cost;
              else if (type === 'CRYPTO') newFunds.crypto -= cost;
              else newFunds.stock -= cost;
              return newFunds;
          });
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
               const proceeds = quantity * price;

               if (remaining < 0.0001) setPaperPortfolio(prev => prev.filter(p => p.symbol !== symbol));
               else setPaperPortfolio(prev => prev.map(p => p.symbol === symbol ? {...p, quantity: remaining, totalCost: p.avgCost * remaining} : p));
               
               setFunds(prev => {
                   const newFunds = { ...prev };
                   if (type === 'MCX') newFunds.mcx += proceeds;
                   else if (type === 'FOREX') newFunds.forex += proceeds;
                   else if (type === 'CRYPTO') newFunds.crypto += proceeds;
                   else newFunds.stock += proceeds;
                   return newFunds;
               });
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
  if (!user) return <AuthOverlay onLogin={(u) => { handleLogin(u); }} />;

  return (
    <div className="h-full flex flex-col bg-background text-slate-100 font-sans overflow-hidden">
      {notification && (
          <div className="fixed top-4 left-4 right-4 z-[60] bg-slate-800 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-3 animate-slide-up">
              <AlertCircle size={18} className="text-blue-400 flex-shrink-0" />
              <span className="text-xs font-medium">{notification}</span>
          </div>
      )}

      <main className="flex-1 overflow-y-auto custom-scrollbar relative w-full max-w-lg mx-auto md:max-w-7xl md:border-x md:border-slate-800">
        {/* Page 0: Stock Market (Ideas) */}
        {activePage === 0 && (
            <PageMarket 
                recommendations={recommendations} 
                marketData={marketData} 
                onTrade={(s) => { setSelectedStock(s); setIsTradeModalOpen(true); }}
                onRefresh={() => loadMarketData()}
                isLoading={isLoading}
                enabledMarkets={settings.enabledMarkets}
                allowedTypes={['STOCK']}
            />
        )}
        {/* Page 1: F&O/Crypto Market */}
        {activePage === 1 && (
            <PageMarket 
                recommendations={recommendations} 
                marketData={marketData} 
                onTrade={(s) => { setSelectedStock(s); setIsTradeModalOpen(true); }}
                onRefresh={() => loadMarketData()}
                isLoading={isLoading}
                enabledMarkets={settings.enabledMarkets}
                allowedTypes={['MCX', 'FOREX', 'CRYPTO']}
            />
        )}
        {/* Page 2: Paper & AutoBot */}
        {activePage === 2 && (
            <PagePaperTrading 
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
                activeBots={activeBots}
                onToggleBot={(b) => setActiveBots(p => ({...p, [b]: !p[b]}))}
                transactions={transactions}
                onUpdateFunds={(f) => setFunds(f)}
            />
        )}
        {/* Page 3: Stock Portfolio (Dhan, Shoonya) */}
        {activePage === 3 && (
            <PageLivePNL 
                title="My Stocks"
                subtitle="Dhan & Shoonya Portfolio"
                icon={Briefcase}
                holdings={stockHoldings}
                marketData={marketData}
                analysisData={analysisData}
                onSell={(s, b) => { 
                     const stk = recommendations.find(r => r.symbol === s) || { symbol: s, type: 'STOCK', currentPrice: marketData[s]?.price || 0 } as any;
                     setSelectedStock(stk);
                     setTradeModalBroker(b);
                     setIsTradeModalOpen(true);
                }}
                brokerBalances={stockBalances}
            />
        )}
        {/* Page 4: Crypto Portfolio (Binance, CoinDCX, CoinSwitch, Zebpay) */}
        {activePage === 4 && (
            <PageLivePNL 
                title="My Crypto"
                subtitle="Binance, CoinDCX, CoinSwitch & Zebpay"
                icon={Cpu}
                holdings={cryptoHoldings}
                marketData={marketData}
                analysisData={analysisData}
                onSell={(s, b) => { 
                     const stk = recommendations.find(r => r.symbol === s) || { symbol: s, type: 'CRYPTO', currentPrice: marketData[s]?.price || 0 } as any;
                     setSelectedStock(stk);
                     setTradeModalBroker(b);
                     setIsTradeModalOpen(true);
                }}
                brokerBalances={cryptoBalances}
            />
        )}
        {/* Page 5: Config */}
        {activePage === 5 && (
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
