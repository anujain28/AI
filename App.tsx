
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
             <h1 className="text-2xl font-bold text-white tracking-[0.2em] mb-2 font-mono uppercase">AI Equity Robot</h1>
             <p className="text-slate-500 text-[8px] mt-4 font-mono tracking-widest text-center uppercase">Robot Intelligence v4.5<br/>Yahoo Technical Core Online</p>
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
  const [brokerIntel, setBrokerIntel] = useState<StockRecommendation[]>([]);
  const [brokerNews, setBrokerNews] = useState<NewsItem[]>([]);
  const [marketData, setMarketData] = useState<MarketData>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<Record<string, HoldingAnalysis>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeBots, setActiveBots] = useState<{ [key: string]: boolean }>({ 'PAPER': true }); 
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockRecommendation | null>(null);
  const [marketStatus, setMarketStatus] = useState(getMarketStatus('STOCK'));
  const [intelError, setIntelError] = useState<string | null>(null);
  
  const scanIntervalRef = useRef<any>(null);
  const priceIntervalRef = useRef<any>(null);
  const botIntervalRef = useRef<any>(null);

  useEffect(() => { 
    const splashTimer = setTimeout(() => setShowSplash(false), 1200); 
    loadAppData();
    
    const statusTimer = setInterval(() => {
        setMarketStatus(getMarketStatus('STOCK'));
    }, 15000);

    return () => {
      clearTimeout(splashTimer);
      clearInterval(statusTimer);
    };
  }, []);

  const loadAppData = () => {
      const savedSettings = localStorage.getItem(`${STORAGE_PREFIX}settings`);
      if (savedSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      const savedFunds = localStorage.getItem(`${STORAGE_PREFIX}funds`);
      if (savedFunds) setFunds(JSON.parse(savedFunds));
      const savedPortfolio = localStorage.getItem(`${STORAGE_PREFIX}portfolio`);
      if (savedPortfolio) setPaperPortfolio(JSON.parse(savedPortfolio));
      const savedTx = localStorage.getItem(`${STORAGE_PREFIX}transactions`);
      if (savedTx) setTransactions(JSON.parse(savedTx));
  };

  const saveData = useCallback((key: string, data: any) => {
    localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
  }, []);

  const showNotification = useCallback((msg: string) => {
      setNotification(msg);
      setTimeout(() => setNotification(null), 3000);
  }, []);

  const performTechnicalScan = useCallback(async () => {
    const ideasUniverse = getIdeasWatchlist();
    const combinedUniverse = Array.from(new Set([...ideasUniverse, ...getEngineUniverse()]));
    
    setIsLoading(true);
    try {
        const [recs, intelRes] = await Promise.all([
          runTechnicalScan(combinedUniverse, settings),
          fetchBrokerIntel(settings)
        ]);
        setRecommendations(recs);
        setBrokerIntel(intelRes.data);
        setBrokerNews(intelRes.news || []);
        if (intelRes.error) setIntelError(intelRes.error);
    } catch (e) {
        console.error("Scan Failure", e);
    } finally {
        setIsLoading(false);
    }
  }, [settings]);

  const refreshActivePrices = useCallback(async () => {
    const symbolsToUpdate = new Set([
      ...recommendations.map(s => s.symbol), 
      ...paperPortfolio.map(p => p.symbol)
    ]);
    
    if (symbolsToUpdate.size === 0) return;

    const results = await Promise.all(
        Array.from(symbolsToUpdate).map(async sym => ({ 
            symbol: sym, 
            data: await fetchRealStockData(sym, settings) 
        }))
    );

    setMarketData(prev => {
         const next = { ...prev };
         results.forEach(({ symbol, data }) => { if (data) next[symbol] = data; });
         return next;
    });
  }, [recommendations, paperPortfolio, settings]);

  const runAnalysis = useCallback(async () => {
    if (paperPortfolio.length === 0) return;
    setIsAnalyzing(true);
    try {
        const results = await analyzeHoldings(paperPortfolio, marketData);
        const map: Record<string, HoldingAnalysis> = {};
        results.forEach(r => { map[r.symbol] = r; });
        setAnalysisData(map);
        showNotification("Portfolio Re-Balanced via Technical Score");
    } catch (e) {
        console.error("Analysis Failed", e);
    } finally {
        setIsAnalyzing(false);
    }
  }, [paperPortfolio, marketData, showNotification]);

  useEffect(() => {
    performTechnicalScan().then(() => refreshActivePrices());

    scanIntervalRef.current = setInterval(performTechnicalScan, 60000); 
    priceIntervalRef.current = setInterval(refreshActivePrices, 10000); 
    
    botIntervalRef.current = setInterval(() => {
        if (!activeBots['PAPER']) return;
        const results = runAutoTradeEngine(settings, paperPortfolio, marketData, funds, recommendations);
        results.forEach(res => {
            if (res.transaction && res.newFunds) {
                const tx = res.transaction;
                setTransactions(prev => {
                    const next = [...prev, tx];
                    saveData('transactions', next);
                    return next;
                });
                setFunds(res.newFunds);
                saveData('funds', res.newFunds);
                setPaperPortfolio((prev: PortfolioItem[]) => {
                    const next: PortfolioItem[] = tx.type === 'BUY' 
                        ? [...prev, { 
                            symbol: tx.symbol, 
                            type: tx.assetType, 
                            quantity: tx.quantity, 
                            avgCost: tx.price, 
                            totalCost: (tx.price * tx.quantity) + (tx.brokerage || 0), 
                            broker: tx.broker 
                          }]
                        : prev.filter(p => p.symbol !== tx.symbol);
                    saveData('portfolio', next);
                    return next;
                });
                showNotification(`Bot: ${tx.type} ${tx.symbol}`);
            }
        });
    }, 15000); 
    
    return () => { 
        clearInterval(scanIntervalRef.current); 
        clearInterval(priceIntervalRef.current); 
        clearInterval(botIntervalRef.current); 
    };
  }, [performTechnicalScan, refreshActivePrices, settings, paperPortfolio, marketData, funds, recommendations, activeBots, saveData, showNotification]);

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
  };

  const handleSell = async (symbol: string, quantity: number, price: number, broker: BrokerID = 'PAPER') => {
      const brokerage = 20;
      const proceeds = (quantity * price) - brokerage;
      const tx: Transaction = { id: Date.now().toString(), type: 'SELL', symbol, assetType: 'STOCK', quantity, price, timestamp: Date.now(), broker, brokerage };
      setPaperPortfolio(prev => { const next = prev.filter(p => p.symbol !== symbol); saveData('portfolio', next); return next; });
      setFunds(prev => { const next = { ...prev, stock: prev.stock + proceeds }; saveData('funds', next); return next; });
      setTransactions(prev => { const next = [...prev, tx]; saveData('transactions', next); return next; });
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
        <div className="fixed top-4 left-4 right-4 z-[60] bg-blue-600 text-white px-4 py-3 rounded-xl border border-blue-400/30 animate-slide-up text-xs font-black text-center shadow-2xl uppercase tracking-widest">
          {notification}
        </div>
      )}
      
      <main className="flex-1 overflow-y-auto custom-scrollbar w-full max-w-lg mx-auto md:max-w-7xl md:border-x md:border-slate-800">
        {activePage === 0 && <PageMarket settings={settings} recommendations={recommendations} marketData={marketData} onTrade={(s) => { setSelectedStock(s); setIsTradeModalOpen(true); }} onRefresh={() => { setRecommendations([]); setBrokerIntel([]); performTechnicalScan(); }} isLoading={isLoading} enabledMarkets={settings.enabledMarkets} />}
        {activePage === 1 && <PageBrokerIntel recommendations={brokerIntel} news={brokerNews} marketData={marketData} onTrade={(s) => { setSelectedStock(s); setIsTradeModalOpen(true); }} onRefresh={() => { setRecommendations([]); setBrokerIntel([]); performTechnicalScan(); }} isLoading={isLoading} error={intelError} />}
        {activePage === 2 && <PageScalper recommendations={recommendations} marketData={marketData} funds={funds} holdings={paperPortfolio} onBuy={handleBuy} onSell={handleSell} onRefresh={performTechnicalScan} />}
        {activePage === 3 && <PageScan marketData={marketData} settings={settings} onTrade={(s) => { setSelectedStock(s); setIsTradeModalOpen(true); }} />}
        {activePage === 4 && <PagePaperTrading holdings={paperPortfolio} marketData={marketData} analysisData={analysisData} onSell={(s, b) => handleSell(s, 0, marketData[s]?.price || 0, b)} onAnalyze={runAnalysis} isAnalyzing={isAnalyzing} funds={funds} activeBots={activeBots} onToggleBot={(b) => setActiveBots(p => ({...p, [b]: !p[b]}))} transactions={transactions} onUpdateFunds={(f) => { setFunds(f); saveData('funds', f); }} />}
        {activePage === 5 && <PageStrategyLog recommendations={recommendations} marketData={marketData} rules={settings.strategyRules || DEFAULT_RULES} onUpdateRules={(r) => { setSettings(s => ({...s, strategyRules: r})); saveData('settings', {...settings, strategyRules: r}); }} aiIntradayPicks={[]} onRefresh={() => performTechnicalScan()} settings={settings} />}
        {activePage === 6 && <PageConfiguration settings={settings} onSave={(s) => { setSettings(s); saveData('settings', s); showNotification("Settings Saved"); }} transactions={transactions} activeBots={activeBots} onToggleBot={(b) => setActiveBots(p => ({...p, [b]: !p[b]}))} onTestTrade={() => {}} />}
      </main>

      <BottomNav activeTab={activePage} onChange={setActivePage} />
      
      {selectedStock && <TradeModal isOpen={isTradeModalOpen} onClose={() => setIsTradeModalOpen(false)} stock={selectedStock} currentPrice={marketData[selectedStock.symbol]?.price || selectedStock.currentPrice} funds={funds} holdings={paperPortfolio.filter(p => p.symbol === selectedStock.symbol)} activeBrokers={['PAPER']} onBuy={handleBuy} onSell={handleSell} />}
    </div>
  );
}
