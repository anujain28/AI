
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { checkAndRefreshStockList } from './services/stockListService';
import { fetchRealStockData } from './services/marketDataService';
import { runTechnicalScan } from './services/recommendationEngine';
import { StockRecommendation, PortfolioItem, MarketData, Transaction, AppSettings, UserProfile, Funds, StrategyRules } from './types';
import { TradeModal } from './components/TradeModal';
import { runAutoTradeEngine } from './services/autoTradeEngine';
import { BarChart3, Briefcase } from 'lucide-react';
import { BottomNav } from './components/BottomNav';
import { PageMarket } from './components/PageMarket';
import { PagePaperTrading } from './components/PagePaperTrading';
import { PageLivePNL } from './components/PageLivePNL';
import { PageConfiguration } from './components/PageConfiguration';
import { PageStrategyLog } from './components/PageStrategyLog';

const STORAGE_PREFIX = 'aitrade_v2_';
const DEFAULT_USER: UserProfile = {
  name: 'Pro Trader', email: 'trader@aitrade.pro',
  picture: 'https://ui-avatars.com/api/?name=Pro+Trader&background=2563eb&color=fff',
  sub: 'default-user', isGuest: true
};

const DEFAULT_STRATEGY: StrategyRules = {
    oiSpikeThreshold: 3.5,
    volMultiplier: 1.5,
    vwapConfirm: true,
    minTime: "09:30",
    maxTime: "15:00",
    atrStopMult: 1.5,
    atrTargetMult: 3.0,
    maxTradesPerDay: 5
};

const DEFAULT_SETTINGS: AppSettings = {
    initialFunds: { stock: 1000000, mcx: 0, forex: 0, crypto: 0 },
    autoTradeConfig: { mode: 'PERCENTAGE', value: 5 },
    activeBrokers: ['PAPER'], 
    enabledMarkets: { stocks: true }, 
    telegramBotToken: '', telegramChatId: '',
    strategyRules: DEFAULT_STRATEGY
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activePage, setActivePage] = useState(0); 
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [funds, setFunds] = useState<Funds>(DEFAULT_SETTINGS.initialFunds);
  const [paperPortfolio, setPaperPortfolio] = useState<PortfolioItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recommendations, setRecommendations] = useState<StockRecommendation[]>([]);
  const [marketData, setMarketData] = useState<MarketData>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [activeBots, setActiveBots] = useState<{ [key: string]: boolean }>({ 'PAPER': true });
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockRecommendation | null>(null);
  
  const refreshIntervalRef = useRef<any>(null);

  const loadMarketData = useCallback(async () => {
    setIsLoading(true);
    const universe = await checkAndRefreshStockList();
    const recs = await runTechnicalScan(universe, settings);
    setRecommendations(recs);

    const results = await Promise.all(
        universe.map(async sym => ({ 
            symbol: sym, 
            data: await fetchRealStockData(sym, settings) 
        }))
    );

    setMarketData(prev => {
         const next = { ...prev };
         results.forEach(({ symbol, data }) => { if (data) next[symbol] = data; });
         return next;
    });
    setIsLoading(false);
  }, [settings]);

  useEffect(() => {
      const splashTimer = setTimeout(() => setShowSplash(false), 2000);
      loadMarketData();
      refreshIntervalRef.current = setInterval(loadMarketData, 60000);
      return () => { clearTimeout(splashTimer); clearInterval(refreshIntervalRef.current); };
  }, [loadMarketData]);

  const showNotification = (msg: string) => {
      setNotification(msg);
      setTimeout(() => setNotification(null), 3000);
  };

  const handleBuy = async (symbol: string, quantity: number, price: number) => {
      const cost = quantity * price;
      const nextPortfolio = [...paperPortfolio, { symbol, type: 'STOCK' as const, quantity, avgCost: price, totalCost: cost, broker: 'PAPER' as const }];
      const nextFunds = { ...funds, stock: funds.stock - cost };
      setPaperPortfolio(nextPortfolio);
      setFunds(nextFunds);
      setTransactions(prev => [...prev, { id: Date.now().toString(), type: 'BUY', symbol, assetType: 'STOCK', quantity, price, timestamp: Date.now(), broker: 'PAPER' }]);
  };

  const handleSell = async (symbol: string) => {
      const item = paperPortfolio.find(p => p.symbol === symbol);
      if (!item) return;
      const price = marketData[symbol]?.price || item.avgCost;
      setPaperPortfolio(prev => prev.filter(p => p.symbol !== symbol));
      setFunds(prev => ({ ...prev, stock: prev.stock + (item.quantity * price) }));
      setTransactions(prev => [...prev, { id: Date.now().toString(), type: 'SELL', symbol, assetType: 'STOCK', quantity: item.quantity, price, timestamp: Date.now(), broker: 'PAPER' }]);
  };

  if (showSplash) return (
    <div className="fixed inset-0 z-[100] bg-[#0f172a] flex flex-col items-center justify-center">
         <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl animate-bounce">
            <BarChart3 size={40} className="text-white" />
         </div>
         <h1 className="text-2xl font-bold text-white mt-8 tracking-tighter uppercase italic">AI OI-Profile Pro</h1>
         <p className="text-slate-500 text-[8px] mt-4 font-mono tracking-widest">BOOTING STRATEGY ENGINE</p>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-background text-slate-100 overflow-hidden font-sans">
      {notification && (
        <div className="fixed top-4 left-4 right-4 z-[60] bg-blue-600 text-white px-4 py-3 rounded-xl shadow-2xl text-xs font-bold text-center">
          {notification}
        </div>
      )}
      <main className="flex-1 overflow-y-auto custom-scrollbar w-full max-w-lg mx-auto md:max-w-7xl md:border-x md:border-slate-800">
        {activePage === 0 && <PageMarket recommendations={recommendations} marketData={marketData} onTrade={(s) => { setSelectedStock(s); setIsTradeModalOpen(true); }} onRefresh={loadMarketData} isLoading={isLoading} enabledMarkets={settings.enabledMarkets} />}
        {activePage === 1 && <PagePaperTrading holdings={paperPortfolio} marketData={marketData} analysisData={{}} onSell={handleSell} onAnalyze={() => {}} isAnalyzing={false} funds={funds} activeBots={activeBots} onToggleBot={(b) => setActiveBots(p => ({...p, [b]: !p[b]}))} transactions={transactions} onUpdateFunds={setFunds} />}
        {activePage === 2 && <PageStrategyLog rules={settings.strategyRules} onUpdateRules={(r) => { setSettings({...settings, strategyRules: r}); showNotification("Rules Updated"); }} />}
        {activePage === 3 && <PageLivePNL title="Live PNL" subtitle="Simulated Broker Connect" icon={Briefcase} holdings={paperPortfolio} marketData={marketData} analysisData={{}} onSell={handleSell} brokerBalances={{}} />}
        {activePage === 4 && <PageConfiguration settings={settings} onSave={setSettings} transactions={transactions} activeBots={activeBots} onToggleBot={(b) => setActiveBots(p => ({...p, [b]: !p[b]}))} />}
      </main>
      <BottomNav activeTab={activePage} onChange={setActivePage} />
      {selectedStock && <TradeModal isOpen={isTradeModalOpen} onClose={() => setIsTradeModalOpen(false)} stock={selectedStock} currentPrice={marketData[selectedStock.symbol]?.price || selectedStock.currentPrice} funds={funds} holdings={paperPortfolio.filter(p => p.symbol === selectedStock.symbol)} activeBrokers={['PAPER']} onBuy={handleBuy} onSell={handleSell} />}
    </div>
  );
}
