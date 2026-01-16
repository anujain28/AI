
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { analyzeHoldings } from './services/geminiService';
import { checkAndRefreshStockList } from './services/stockListService';
import { fetchRealStockData } from './services/marketDataService';
import { runTechnicalScan } from './services/recommendationEngine';
import { StockRecommendation, PortfolioItem, MarketData, Transaction, AppSettings, UserProfile, Funds, HoldingAnalysis } from './types';
import { AuthOverlay } from './components/AuthOverlay';
import { TradeModal } from './components/TradeModal';
import { fetchBrokerBalance, fetchHoldings, placeOrder } from './services/brokerService';
import { runAutoTradeEngine } from './services/autoTradeEngine';
import { BarChart3, Briefcase } from 'lucide-react';
import { BottomNav } from './components/BottomNav';
import { PageMarket } from './components/PageMarket';
import { PagePaperTrading } from './components/PagePaperTrading';
import { PageLivePNL } from './components/PageLivePNL';
import { PageConfiguration } from './components/PageConfiguration';

const GLOBAL_STORAGE = { USER: 'aitrade_current_user_v2' };
const DEFAULT_FUNDS: Funds = { stock: 1000000, mcx: 0, forex: 0, crypto: 0 };
const DEFAULT_SETTINGS: AppSettings = {
    initialFunds: DEFAULT_FUNDS,
    autoTradeConfig: { mode: 'PERCENTAGE', value: 5 },
    activeBrokers: ['PAPER', 'DHAN', 'SHOONYA'], 
    enabledMarkets: { stocks: true }, 
    telegramBotToken: '',
    telegramChatId: ''
};

const SplashScreen = ({ visible }: { visible: boolean }) => {
    if (!visible) return null;
    return (
        <div className="fixed inset-0 z-[100] bg-[#0f172a] flex flex-col items-center justify-center animate-fade-out">
             <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/50 mb-8 animate-bounce">
                <BarChart3 size(40) className="text-white" />
             </div>
             <h1 className="text-2xl font-bold text-white tracking-[0.2em] mb-2 font-mono">AI-TRADE</h1>
             <p className="text-slate-500 text-[8px] mt-4 font-mono tracking-widest">TECHNICAL ENGINE INITIALIZING</p>
        </div>
    );
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activePage, setActivePage] = useState(0); 
  const [user, setUser] = useState<UserProfile | null>(null);
  const [storagePrefix, setStoragePrefix] = useState<string>('');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [funds, setFunds] = useState<Funds>(DEFAULT_FUNDS);
  const [paperPortfolio, setPaperPortfolio] = useState<PortfolioItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [brokerBalances, setBrokerBalances] = useState<Record<string, number>>({});
  const [externalHoldings, setExternalHoldings] = useState<PortfolioItem[]>([]);
  const [recommendations, setRecommendations] = useState<StockRecommendation[]>([]);
  const [marketData, setMarketData] = useState<MarketData>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<Record<string, HoldingAnalysis>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeBots, setActiveBots] = useState<{ [key: string]: boolean }>({ 'PAPER': true });
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockRecommendation | null>(null);
  const [niftyList, setNiftyList] = useState<string[]>([]);
  
  const refreshIntervalRef = useRef<any>(null);
  const botIntervalRef = useRef<any>(null);
  const allHoldings = useMemo(() => [...paperPortfolio, ...externalHoldings], [paperPortfolio, externalHoldings]);

  useEffect(() => { setTimeout(() => setShowSplash(false), 2000); }, []);

  useEffect(() => {
      const savedUser = localStorage.getItem(GLOBAL_STORAGE.USER);
      if (savedUser) loadUserData(JSON.parse(savedUser));
  }, []);

  const loadUserData = (u: UserProfile) => {
      const prefix = `user_${u.email.replace(/[^a-zA-Z0-9]/g, '_')}_`;
      setStoragePrefix(prefix);
      setUser(u);
      const savedSettings = localStorage.getItem(`${prefix}settings`);
      setSettings(savedSettings ? { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) } : DEFAULT_SETTINGS);
      const savedFunds = localStorage.getItem(`${prefix}funds`);
      setFunds(savedFunds ? JSON.parse(savedFunds) : DEFAULT_FUNDS);
      const savedPortfolio = localStorage.getItem(`${prefix}portfolio`);
      setPaperPortfolio(savedPortfolio ? JSON.parse(savedPortfolio) : []);
      const savedTx = localStorage.getItem(`${prefix}transactions`);
      setTransactions(savedTx ? JSON.parse(savedTx) : []);
  };

  const handleLogin = (u: UserProfile) => {
    localStorage.setItem(GLOBAL_STORAGE.USER, JSON.stringify(u));
    loadUserData(u);
  };

  const showNotification = (msg: string) => {
      setNotification(msg);
      setTimeout(() => setNotification(null), 3000);
  };

  const loadMarketData = useCallback(async () => {
    if (!user) return;
    let stocksList = niftyList;
    if (stocksList.length === 0) {
        stocksList = await checkAndRefreshStockList();
        setNiftyList(stocksList);
    }
    
    // Technical Scan replaces Gemini
    if (recommendations.length === 0) {
        setIsLoading(true);
        const recs = await runTechnicalScan(stocksList, settings);
        setRecommendations(recs);
    }

    const symbols = new Set([...recommendations.map(s => s.symbol), ...allHoldings.map(p => p.symbol)]);
    const results = await Promise.all(Array.from(symbols).map(async sym => ({ symbol: sym, data: await fetchRealStockData(sym, settings) })));
    setMarketData(prev => {
         const next = { ...prev };
         results.forEach(({ symbol, data }) => { if (data) next[symbol] = data; });
         return next;
    });
    setIsLoading(false);
  }, [user, recommendations, allHoldings, niftyList, settings]);

  useEffect(() => {
      if (user) {
          loadMarketData();
          refreshIntervalRef.current = setInterval(loadMarketData, 30000); // Slower refresh for technical scanning
          botIntervalRef.current = setInterval(() => {
              const results = runAutoTradeEngine(settings, paperPortfolio, marketData, funds, recommendations);
              results.forEach(res => {
                  if (res.transaction && res.newFunds) {
                      setTransactions(prev => [...prev, res.transaction!]);
                      setFunds(res.newFunds!);
                      if (res.transaction.type === 'BUY') {
                          setPaperPortfolio(prev => [...prev, { symbol: res.transaction!.symbol, type: res.transaction!.assetType, quantity: res.transaction!.quantity, avgCost: res.transaction!.price, totalCost: res.transaction!.price * res.transaction!.quantity, broker: 'PAPER' }]);
                      } else {
                          setPaperPortfolio(prev => prev.filter(p => p.symbol !== res.transaction!.symbol));
                      }
                      showNotification(`Bot: ${res.reason}`);
                  }
              });
          }, 8000);
      }
      return () => { clearInterval(refreshIntervalRef.current); clearInterval(botIntervalRef.current); };
  }, [user, loadMarketData, settings, paperPortfolio, marketData, funds, recommendations]);

  const handleBuy = async (symbol: string, quantity: number, price: number, broker: any) => {
      if (broker === 'PAPER') {
          const cost = quantity * price;
          setPaperPortfolio(prev => [...prev, { symbol, type: 'STOCK', quantity, avgCost: price, totalCost: cost, broker: 'PAPER' }]);
          setFunds(prev => ({ ...prev, stock: prev.stock - cost }));
      } else {
          await placeOrder(broker, symbol, quantity, 'BUY', price, 'STOCK', settings);
      }
      setTransactions(prev => [...prev, { id: Date.now().toString(), type: 'BUY', symbol, assetType: 'STOCK', quantity, price, timestamp: Date.now(), broker }]);
  };

  const handleSell = async (symbol: string, quantity: number, price: number, broker: any) => {
      if (broker === 'PAPER') {
          setPaperPortfolio(prev => prev.filter(p => p.symbol !== symbol));
          setFunds(prev => ({ ...prev, stock: prev.stock + (quantity * price) }));
      } else {
          await placeOrder(broker, symbol, quantity, 'SELL', price, 'STOCK', settings);
      }
      setTransactions(prev => [...prev, { id: Date.now().toString(), type: 'SELL', symbol, assetType: 'STOCK', quantity, price, timestamp: Date.now(), broker }]);
  };

  if (showSplash) return <SplashScreen visible={true} />;
  if (!user) return <AuthOverlay onLogin={handleLogin} />;

  return (
    <div className="h-full flex flex-col bg-background text-slate-100 overflow-hidden">
      {notification && <div className="fixed top-4 left-4 right-4 z-[60] bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-700 animate-slide-up text-xs font-bold">{notification}</div>}
      <main className="flex-1 overflow-y-auto custom-scrollbar w-full max-w-lg mx-auto md:max-w-7xl md:border-x md:border-slate-800">
        {activePage === 0 && <PageMarket recommendations={recommendations} marketData={marketData} onTrade={(s) => { setSelectedStock(s); setIsTradeModalOpen(true); }} onRefresh={() => { setRecommendations([]); loadMarketData(); }} isLoading={isLoading} enabledMarkets={settings.enabledMarkets} allowedTypes={['STOCK']} />}
        {activePage === 1 && <PagePaperTrading holdings={allHoldings} marketData={marketData} analysisData={analysisData} onSell={(s, b) => handleSell(s, 1, marketData[s]?.price || 0, b)} onAnalyze={() => analyzeHoldings(allHoldings, marketData)} isAnalyzing={isAnalyzing} funds={funds} activeBots={activeBots} onToggleBot={(b) => setActiveBots(p => ({...p, [b]: !p[b]}))} transactions={transactions} onUpdateFunds={setFunds} />}
        {activePage === 2 && <PageLivePNL title="My Portfolio" subtitle="Connected Accounts" icon={Briefcase} holdings={allHoldings.filter(h => h.broker !== 'PAPER')} marketData={marketData} analysisData={analysisData} onSell={(s, b) => handleSell(s, 1, marketData[s]?.price || 0, b)} brokerBalances={brokerBalances} />}
        {activePage === 3 && <PageConfiguration settings={settings} onSave={(s) => { setSettings(s); showNotification("Saved"); }} transactions={transactions} activeBots={activeBots} onToggleBot={(b) => setActiveBots(p => ({...p, [b]: !p[b]}))} />}
      </main>
      <BottomNav activeTab={activePage} onChange={setActivePage} />
      {selectedStock && <TradeModal isOpen={isTradeModalOpen} onClose={() => setIsTradeModalOpen(false)} stock={selectedStock} currentPrice={marketData[selectedStock.symbol]?.price || selectedStock.currentPrice} funds={funds} holdings={allHoldings.filter(p => p.symbol === selectedStock.symbol)} activeBrokers={settings.activeBrokers} onBuy={handleBuy} onSell={handleSell} />}
    </div>
  );
}
