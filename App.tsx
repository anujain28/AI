
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { getIdeasWatchlist, getEngineUniverse } from './services/stockListService';
import { fetchRealStockData } from './services/marketDataService';
import { runTechnicalScan } from './services/recommendationEngine';
import { fetchBrokerIntel } from './services/brokerIntelService';
import { StockRecommendation, PortfolioItem, MarketData, Transaction, AppSettings, Funds, HoldingAnalysis, StrategyRules, AssetType, BrokerID, NewsItem } from './types';
import { TradeModal } from './components/TradeModal';
import { runAutoTradeEngine } from './services/autoTradeEngine';
import { BarChart3, Briefcase, RefreshCw, Sparkles, Clock, Zap } from 'lucide-react';
import { BottomNav } from './components/BottomNav';
import { PageMarket } from './components/PageMarket';
import { PageBrokerIntel } from './components/PageBrokerIntel';
import { PagePaperTrading } from './components/PagePaperTrading';
import { PageConfiguration } from './components/PageConfiguration';
import { PageStrategyLog } from './components/PageStrategyLog';
import { PageScan } from './components/PageScan';
import { PageScalper } from './components/PageScalper';
import { sendTelegramMessage } from './services/telegramService';
import { getMarketStatus } from './services/marketStatusService';
import { analyzeHoldings } from './services/analysisService';

const STORAGE_PREFIX = 'aitrade_v3_';
const DEFAULT_FUNDS: Funds = { stock: 1000000, mcx: 0, forex: 0, crypto: 0 };
const DEFAULT_RULES: StrategyRules = {
    rsiBuyZone: 30,
    rsiSellZone: 70,
    vwapConfirm: true,
    minVolMult: 1.5,
    atrStopMult: 1.5,
    atrTargetMult: 3.0,
    maxTradesPerDay: 5
};
const DEFAULT_SETTINGS: AppSettings = {
    initialFunds: DEFAULT_FUNDS,
    autoTradeConfig: { mode: 'PERCENTAGE', value: 5 },
    activeBrokers: ['PAPER'], 
    enabledMarkets: { stocks: true }, 
    telegramBotToken: '',
    telegramChatId: '',
    strategyRules: DEFAULT_RULES
};

const SplashScreen = ({ visible }: { visible: boolean }) => {
    if (!visible) return null;
    return (
        <div className="fixed inset-0 z-[100] bg-[#0f172a] flex flex-col items-center justify-center animate-fade-out">
             <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/50 mb-8 animate-bounce">
                <BarChart3 size={40} className="text-white" />
             </div>
             <h1 className="text-2xl font-bold text-white tracking-[0.2em] mb-2 font-mono uppercase text-center px-4">AI EQUITY ROBOT</h1>
             <p className="text-slate-500 text-[8px] mt-4 font-mono tracking-widest text-center uppercase">System Intel Core Active</p>
        </div>
    );
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activePage, setActivePage] = useState(0); 
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [funds, setFunds] = useState<Funds>(DEFAULT_FUNDS);
  const [paperPortfolio, setPaperPortfolio] = useState<PortfolioItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recommendations, setRecommendations] = useState<StockRecommendation[]>([]);
  const [marketData, setMarketData] = useState<MarketData>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [scanProgress, setScanProgress] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<Record<string, HoldingAnalysis>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeBots, setActiveBots] = useState<{ [key: string]: boolean }>({ 'PAPER': true }); 
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockRecommendation | null>(null);
  const [marketStatus, setMarketStatus] = useState(getMarketStatus('STOCK'));
  
  const scanTimerRef = useRef<any>(null);
  const priceTimerRef = useRef<any>(null);

  const saveData = useCallback((key: string, data: any) => {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
  }, []);

  const showNotification = useCallback((msg: string) => {
      setNotification(msg);
      setTimeout(() => setNotification(null), 3000);
  }, []);

  const performTechnicalScan = useCallback(async () => {
    setIsLoading(true);
    setScanProgress(0);
    
    try {
        const universe = getIdeasWatchlist();
        const results = await runTechnicalScan(universe, settings, (p) => setScanProgress(p));
        setRecommendations(results);
    } catch (e) {
        console.error("Scanner Error", e);
    } finally {
        setIsLoading(false);
        setScanProgress(0);
    }
  }, [settings]);

  const refreshActivePrices = useCallback(async () => {
    const symbols = Array.from(new Set([
        ...recommendations.map(r => r.symbol),
        ...paperPortfolio.map(p => p.symbol)
    ]));

    if (symbols.length === 0) return;

    for (let i = 0; i < symbols.length; i += 5) {
        const batch = symbols.slice(i, i + 5);
        const updates = await Promise.all(batch.map(async s => ({ 
            symbol: s, 
            data: await fetchRealStockData(s, settings) 
        })));

        setMarketData(prev => {
            const next = { ...prev };
            updates.forEach(upd => { if (upd.data) next[upd.symbol] = upd.data; });
            return next;
        });
    }
    setMarketStatus(getMarketStatus('STOCK'));
  }, [recommendations, paperPortfolio, settings]);

  useEffect(() => { 
    const savedSettings = localStorage.getItem(`${STORAGE_PREFIX}settings`);
    if (savedSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
    const savedFunds = localStorage.getItem(`${STORAGE_PREFIX}funds`);
    if (savedFunds) setFunds(JSON.parse(savedFunds));
    const savedPortfolio = localStorage.getItem(`${STORAGE_PREFIX}portfolio`);
    if (savedPortfolio) setPaperPortfolio(JSON.parse(savedPortfolio));
    const savedTx = localStorage.getItem(`${STORAGE_PREFIX}transactions`);
    if (savedTx) setTransactions(JSON.parse(savedTx));

    const splashTimer = setTimeout(() => setShowSplash(false), 1200); 
    performTechnicalScan();

    scanTimerRef.current = setInterval(performTechnicalScan, 240000); // 4 min scan
    priceTimerRef.current = setInterval(refreshActivePrices, 25000); // 25s price refresh

    return () => {
        clearTimeout(splashTimer);
        clearInterval(scanTimerRef.current);
        clearInterval(priceTimerRef.current);
    };
  }, []);

  const handleBuy = async (symbol: string, quantity: number, price: number, broker: BrokerID = 'PAPER') => {
      const brokerage = 20;
      const cost = (quantity * price) + brokerage;
      const tx: Transaction = { id: Date.now().toString(), type: 'BUY', symbol, assetType: 'STOCK', quantity, price, timestamp: Date.now(), broker, brokerage };
      setPaperPortfolio(prev => { 
          const next: PortfolioItem[] = [...prev, { symbol, type: 'STOCK', quantity, avgCost: price, totalCost: cost, broker }]; 
          saveData('portfolio', next); 
          return next; 
      });
      setFunds(prev => { const next = { ...prev, stock: prev.stock - cost }; saveData('funds', next); return next; });
      setTransactions(prev => { const next = [...prev, tx]; saveData('transactions', next); return next; });
      showNotification(`Bought ${symbol} @ ₹${price.toFixed(2)}`);
  };

  const handleSell = async (symbol: string, quantity: number, price: number, broker: BrokerID = 'PAPER') => {
      const brokerage = 20;
      const proceeds = (quantity * price) - brokerage;
      const tx: Transaction = { id: Date.now().toString(), type: 'SELL', symbol, assetType: 'STOCK', quantity, price, timestamp: Date.now(), broker, brokerage };
      setPaperPortfolio(prev => { const next = prev.filter(p => p.symbol !== symbol); saveData('portfolio', next); return next; });
      setFunds(prev => { const next = { ...prev, stock: prev.stock + proceeds }; saveData('funds', next); return next; });
      setTransactions(prev => { const next = [...prev, tx]; saveData('transactions', next); return next; });
      showNotification(`Sold ${symbol} @ ₹${price.toFixed(2)}`);
  };

  if (showSplash) return <SplashScreen visible={true} />;

  return (
    <div className="h-full flex flex-col bg-background text-slate-100 overflow-hidden relative">
      <div className="fixed top-4 right-4 z-[70] pointer-events-none">
          <div className="bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-2xl backdrop-blur-md">
              <div className={`w-1.5 h-1.5 rounded-full ${marketStatus.isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className={`text-[9px] font-black tracking-widest uppercase ${marketStatus.color}`}>
                  {marketStatus.message}
              </span>
          </div>
      </div>

      {notification && (
        <div className="fixed top-4 left-4 right-4 z-[80] bg-blue-600 text-white px-4 py-3 rounded-xl border border-blue-400/30 animate-slide-up text-xs font-black text-center shadow-2xl uppercase tracking-widest">
          {notification}
        </div>
      )}
      
      <main className="flex-1 overflow-y-auto custom-scrollbar w-full max-w-lg mx-auto md:max-w-7xl md:border-x md:border-slate-800">
        {activePage === 0 && (
            <PageMarket 
                settings={settings} 
                recommendations={recommendations} 
                marketData={marketData} 
                onTrade={(s) => { setSelectedStock(s); setIsTradeModalOpen(true); }} 
                onRefresh={performTechnicalScan} 
                isLoading={isLoading} 
                scanProgress={scanProgress}
                enabledMarkets={settings.enabledMarkets} 
            />
        )}
        {activePage === 1 && <PageBrokerIntel onRefresh={performTechnicalScan} isLoading={isLoading} />}
        {activePage === 2 && <PageScalper recommendations={recommendations} marketData={marketData} funds={funds} holdings={paperPortfolio} onBuy={handleBuy} onSell={handleSell} onRefresh={performTechnicalScan} />}
        {activePage === 3 && <PageScan marketData={marketData} settings={settings} onTrade={(s) => { setSelectedStock(s); setIsTradeModalOpen(true); }} />}
        {activePage === 4 && <PagePaperTrading holdings={paperPortfolio} marketData={marketData} analysisData={analysisData} onSell={(s, b) => handleSell(s, 0, marketData[s]?.price || 0, b)} onAnalyze={() => {}} isAnalyzing={isAnalyzing} funds={funds} activeBots={activeBots} onToggleBot={(b) => setActiveBots(p => ({...p, [b]: !p[b]}))} transactions={transactions} onUpdateFunds={(f) => { setFunds(f); saveData('funds', f); }} />}
        {activePage === 5 && <PageStrategyLog recommendations={recommendations} marketData={marketData} rules={settings.strategyRules || DEFAULT_RULES} onUpdateRules={(r) => { setSettings(s => ({...s, strategyRules: r})); saveData('settings', {...settings, strategyRules: r}); }} aiIntradayPicks={[]} onRefresh={performTechnicalScan} settings={settings} />}
        {activePage === 6 && <PageConfiguration settings={settings} onSave={(s) => { setSettings(s); saveData('settings', s); showNotification("Settings Saved"); }} transactions={transactions} activeBots={activeBots} onToggleBot={(b) => setActiveBots(p => ({...p, [b]: !p[b]}))} onTestTrade={() => {}} />}
      </main>

      <BottomNav activeTab={activePage} onChange={setActivePage} />
      
      {selectedStock && (
        <TradeModal 
            isOpen={isTradeModalOpen} 
            onClose={() => setIsTradeModalOpen(false)} 
            stock={selectedStock} 
            currentPrice={marketData[selectedStock.symbol]?.price || selectedStock.currentPrice} 
            funds={funds} 
            holdings={paperPortfolio.filter(p => p.symbol === selectedStock.symbol)} 
            activeBrokers={['PAPER']} 
            onBuy={handleBuy} 
            onSell={handleSell} 
        />
      )}
    </div>
  );
}
