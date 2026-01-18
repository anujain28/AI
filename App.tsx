
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { getIdeasWatchlist, getEngineUniverse } from './services/stockListService';
import { fetchRealStockData } from './services/marketDataService';
import { runTechnicalScan, runIntradayAiAnalysis } from './services/recommendationEngine';
import { StockRecommendation, PortfolioItem, MarketData, Transaction, AppSettings, UserProfile, Funds, HoldingAnalysis, StrategyRules, AssetType, BrokerID } from './types';
import { TradeModal } from './components/TradeModal';
import { runAutoTradeEngine } from './services/autoTradeEngine';
import { BarChart3, Briefcase, RefreshCw, Sparkles, Clock } from 'lucide-react';
import { BottomNav } from './components/BottomNav';
import { PageMarket } from './components/PageMarket';
import { PagePaperTrading } from './components/PagePaperTrading';
import { PageLivePNL } from './components/PageLivePNL';
import { PageConfiguration } from './components/PageConfiguration';
import { PageStrategyLog } from './components/PageStrategyLog';
import { PageScan } from './components/PageScan';
import { sendTelegramMessage, generatePNLReport } from './services/telegramService';
import { getMarketStatus } from './services/marketStatusService';
import { analyzeHoldings } from './services/geminiService';

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
    telegramBotToken: '8527792845:AAHyUC59F-Vdm4qCKfEdvHqQJFJz25T4HOs',
    telegramChatId: '711856868',
    strategyRules: DEFAULT_RULES
};

const SplashScreen = ({ visible }: { visible: boolean }) => {
    if (!visible) return null;
    return (
        <div className="fixed inset-0 z-[100] bg-[#0f172a] flex flex-col items-center justify-center animate-fade-out">
             <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/50 mb-8 animate-bounce">
                <BarChart3 size={40} className="text-white" />
             </div>
             <h1 className="text-2xl font-bold text-white tracking-[0.2em] mb-2 font-mono uppercase">AI Equity Pro</h1>
             <p className="text-slate-500 text-[8px] mt-4 font-mono tracking-widest text-center uppercase">Intrabot Initializing...<br/>Momentum Engine Online</p>
        </div>
    );
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [activePage, setActivePage] = useState(0); 
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [funds, setFunds] = useState<Funds>(DEFAULT_FUNDS);
  const [paperPortfolio, setPaperPortfolio] = useState<PortfolioItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recommendations, setRecommendations] = useState<StockRecommendation[]>([]);
  const [aiIntradayPicks, setAiIntradayPicks] = useState<string[]>([]);
  const [marketData, setMarketData] = useState<MarketData>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<Record<string, HoldingAnalysis>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeBots, setActiveBots] = useState<{ [key: string]: boolean }>({ 'PAPER': true }); 
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockRecommendation | null>(null);
  const [initialBroker, setInitialBroker] = useState<any>(undefined);
  const [marketStatus, setMarketStatus] = useState(getMarketStatus('STOCK'));
  
  const refreshIntervalRef = useRef<any>(null);
  const botIntervalRef = useRef<any>(null);

  useEffect(() => { 
    const splashTimer = setTimeout(() => setShowSplash(false), 2000); 
    loadAppData();

    const handleUpdate = () => {
      setUpdateAvailable(true);
    };
    window.addEventListener('sw-update-available', handleUpdate);

    const statusTimer = setInterval(() => {
        setMarketStatus(getMarketStatus('STOCK'));
    }, 30000);

    return () => {
      clearTimeout(splashTimer);
      clearInterval(statusTimer);
      window.removeEventListener('sw-update-available', handleUpdate);
    };
  }, []);

  const loadAppData = () => {
      const savedSettings = localStorage.getItem(`${STORAGE_PREFIX}settings`);
      if (savedSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      else setSettings(DEFAULT_SETTINGS); 
      
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

  const notifyTelegram = useCallback(async (tx: Transaction, reason?: string) => {
    if (!settings.telegramBotToken || !settings.telegramChatId) return;
    const emoji = tx.type === 'BUY' ? '🔵' : '🔴';
    const message = `${emoji} *Trade Notification: ${tx.type}*\nSymbol: ${tx.symbol}\nPrice: ₹${tx.price.toFixed(2)}\nQuantity: ${tx.quantity}\nReason: ${reason || 'AI Strategy'}\nBroker: ${tx.broker}`;
    await sendTelegramMessage(settings.telegramBotToken, settings.telegramChatId, message);
  }, [settings]);

  // Fixed: Added Effect to trigger Gemini Portfolio Analysis when 'isAnalyzing' state is requested.
  useEffect(() => {
    if (isAnalyzing && paperPortfolio.length > 0) {
      const runAiAnalysis = async () => {
        try {
          const results = await analyzeHoldings(paperPortfolio, marketData);
          const dataMap: Record<string, HoldingAnalysis> = {};
          results.forEach(item => {
              dataMap[item.symbol] = item;
          });
          setAnalysisData(dataMap);
          showNotification("AI Portfolio Insight Generated");
        } catch (error) {
          console.error("AI Analysis failed", error);
          showNotification("Analysis failed. Check your network.");
        } finally {
          setIsAnalyzing(false);
        }
      };
      runAiAnalysis();
    } else if (isAnalyzing) {
        setIsAnalyzing(false);
    }
  }, [isAnalyzing, paperPortfolio, marketData, showNotification]);

  const handleTestTrade = async () => {
    const testSymbol = 'RELIANCE.NS';
    const data = await fetchRealStockData(testSymbol, settings);
    const price = data?.price || 2450.50;
    
    const tx: Transaction = {
        id: `test-${Date.now()}`,
        type: 'BUY',
        symbol: testSymbol,
        assetType: 'STOCK',
        quantity: 1,
        price: price,
        timestamp: Date.now(),
        broker: 'PAPER',
        brokerage: 20
    };

    setTransactions(prev => {
        const next = [...prev, tx];
        saveData('transactions', next);
        return next;
    });

    setPaperPortfolio(prev => {
        const newItem: PortfolioItem = { symbol: testSymbol, type: 'STOCK', quantity: 1, avgCost: price, totalCost: price + 20, broker: 'PAPER' };
        const next = [...prev, newItem];
        saveData('portfolio', next);
        return next;
    });

    showNotification("Test Trade Executed: RELIANCE");
    notifyTelegram(tx, "Manual Connection Test");
  };

  const loadMarketData = useCallback(async () => {
    const ideasUniverse = getIdeasWatchlist();
    const engineUniverse = getEngineUniverse();
    const combinedUniverse = Array.from(new Set([...ideasUniverse, ...engineUniverse]));
    
    if (recommendations.length === 0) {
        setIsLoading(true);
        const recs = await runTechnicalScan(combinedUniverse, settings);
        setRecommendations(recs);
    }

    const symbolsToUpdate = new Set([
        ...recommendations.map(s => s.symbol), 
        ...paperPortfolio.map(p => p.symbol)
    ]);

    const results = await Promise.all(
        Array.from(symbolsToUpdate).map(async sym => ({ 
            symbol: sym, 
            data: await fetchRealStockData(sym, settings) 
        }))
    );

    setMarketData(prev => {
         const next = { ...prev };
         let changed = false;
         results.forEach(({ symbol, data }) => { 
            if (data && next[symbol] !== data) {
                next[symbol] = data; 
                changed = true;
            }
         });
         return changed ? next : prev;
    });
    setIsLoading(false);
  }, [recommendations, paperPortfolio, settings]);

  useEffect(() => {
    loadMarketData();
    refreshIntervalRef.current = setInterval(loadMarketData, 15000); 
    
    botIntervalRef.current = setInterval(() => {
        if (!activeBots['PAPER']) return;
        
        const currentStatus = getMarketStatus('STOCK');
        if (!currentStatus.isOpen) return;

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
                setPaperPortfolio(prev => {
                    let next: PortfolioItem[];
                    if (tx.type === 'BUY') {
                        const newItem: PortfolioItem = { 
                            symbol: tx.symbol, type: tx.assetType, quantity: tx.quantity, 
                            avgCost: tx.price, totalCost: (tx.price * tx.quantity) + (tx.brokerage || 0), 
                            broker: tx.broker, timeframe: tx.timeframe
                        };
                        next = [...prev, newItem];
                    } else {
                        next = prev.filter(p => p.symbol !== tx.symbol);
                    }
                    saveData('portfolio', next);
                    return next;
                });
                showNotification(`Bot Execution: ${tx.type} ${tx.symbol}`);
                notifyTelegram(tx, res.reason);
            }
        });
    }, 20000); 
    
    return () => { 
        clearInterval(refreshIntervalRef.current); 
        clearInterval(botIntervalRef.current); 
    };
  }, [loadMarketData, settings, paperPortfolio, marketData, funds, recommendations, activeBots, notifyTelegram, saveData, showNotification]);

  const handleBuy = async (symbol: string, quantity: number, price: number, broker: any = 'PAPER') => {
      const brokerage = 20;
      const cost = (quantity * price) + brokerage;
      const rec = recommendations.find(r => r.symbol === symbol);
      const tx: Transaction = { id: Date.now().toString(), type: 'BUY', symbol, assetType: 'STOCK', quantity, price, timestamp: Date.now(), broker: 'PAPER', brokerage, timeframe: rec?.timeframe };
      const newItem: PortfolioItem = { symbol, type: 'STOCK' as AssetType, quantity, avgCost: price, totalCost: cost, broker: 'PAPER' as BrokerID, timeframe: rec?.timeframe };
      setPaperPortfolio(prev => { const next = [...prev, newItem]; saveData('portfolio', next); return next; });
      setFunds(prev => { const next = { ...prev, stock: prev.stock - cost }; saveData('funds', next); return next; });
      setTransactions(prev => { const next = [...prev, tx]; saveData('transactions', next); return next; });
      notifyTelegram(tx, "Manual Entry");
  };

  const handleSell = async (symbol: string, quantity: number, price: number, broker: any = 'PAPER') => {
      const brokerage = 20;
      const proceeds = (quantity * price) - brokerage;
      const item = paperPortfolio.find(p => p.symbol === symbol);
      const tx: Transaction = { id: Date.now().toString(), type: 'SELL', symbol, assetType: 'STOCK', quantity, price, timestamp: Date.now(), broker: 'PAPER', brokerage, timeframe: item?.timeframe };
      setPaperPortfolio(prev => { const next = prev.filter(p => p.symbol !== symbol); saveData('portfolio', next); return next; });
      setFunds(prev => { const next = { ...prev, stock: prev.stock + proceeds }; saveData('funds', next); return next; });
      setTransactions(prev => { const next = [...prev, tx]; saveData('transactions', next); return next; });
      notifyTelegram(tx, "Manual Exit");
  };

  const handleInitiateSell = useCallback((symbol: string, broker: any) => {
    const rec = recommendations.find(r => r.symbol === symbol);
    const mData = marketData[symbol];
    const stockRec: StockRecommendation = rec || { symbol, name: symbol.split('.')[0], type: 'STOCK', sector: 'Holdings', currentPrice: mData?.price || 0, reason: 'Existing Position', riskLevel: 'Medium', targetPrice: (mData?.price || 0) * 1.1, lotSize: 1 };
    setInitialBroker(broker);
    setSelectedStock(stockRec);
    setIsTradeModalOpen(true);
  }, [recommendations, marketData]);

  const onTradeRequest = useCallback((s: StockRecommendation) => {
    setInitialBroker(undefined);
    setSelectedStock(s);
    setIsTradeModalOpen(true);
  }, []);

  if (showSplash) return <SplashScreen visible={true} />;

  return (
    <div className="h-full flex flex-col bg-background text-slate-100 overflow-hidden relative">
      <div className="fixed top-4 right-4 z-[70] pointer-events-none">
          <div className="bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-2xl backdrop-blur-md">
              <div className={`w-1.5 h-1.5 rounded-full ${marketStatus.isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className={`text-[9px] font-black tracking-widest ${marketStatus.isOpen ? 'text-green-400' : 'text-red-400 uppercase'}`}>
                  NSE {marketStatus.isOpen ? 'OPEN' : 'CLOSED'}
              </span>
          </div>
      </div>

      {updateAvailable && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-blue-600 p-3 flex items-center justify-between shadow-2xl animate-fade-in">
           <div className="flex items-center gap-3">
              <Sparkles className="text-white animate-pulse" size={20} />
              <span className="text-xs font-black uppercase tracking-widest text-white">New version available!</span>
           </div>
           <button onClick={() => window.location.reload()} className="px-4 py-1.5 bg-white text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Update Now</button>
        </div>
      )}

      {notification && (
        <div className="fixed top-4 left-4 right-4 z-[60] bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-700 animate-slide-up text-xs font-bold text-center shadow-2xl">
          {notification}
        </div>
      )}
      <main className="flex-1 overflow-y-auto custom-scrollbar w-full max-w-lg mx-auto md:max-w-7xl md:border-x md:border-slate-800">
        {activePage === 0 && <PageMarket settings={settings} recommendations={recommendations} marketData={marketData} onTrade={onTradeRequest} onRefresh={() => { setRecommendations([]); loadMarketData(); }} isLoading={isLoading} enabledMarkets={settings.enabledMarkets} />}
        {activePage === 1 && <PageStrategyLog recommendations={recommendations} marketData={marketData} rules={settings.strategyRules || DEFAULT_RULES} onUpdateRules={(r) => { setSettings(s => ({...s, strategyRules: r})); saveData('settings', {...settings, strategyRules: r}); }} aiIntradayPicks={aiIntradayPicks} onRefresh={() => loadMarketData()} settings={settings} />}
        {activePage === 2 && <PageScan marketData={marketData} settings={settings} onTrade={onTradeRequest} />}
        {activePage === 3 && <PagePaperTrading holdings={paperPortfolio} marketData={marketData} analysisData={analysisData} onSell={handleInitiateSell} onAnalyze={() => setIsAnalyzing(true)} isAnalyzing={isAnalyzing} funds={funds} activeBots={activeBots} onToggleBot={(b) => setActiveBots(p => ({...p, [b]: !p[b]}))} transactions={transactions} onUpdateFunds={(f) => { setFunds(f); saveData('funds', f); }} />}
        {activePage === 4 && <PageLivePNL title="Broker Portfolio" subtitle="Live Connected Accounts" icon={Briefcase} holdings={paperPortfolio.filter(h => h.broker !== 'PAPER')} marketData={marketData} analysisData={analysisData} onSell={handleInitiateSell} brokerBalances={{}} />}
        {activePage === 5 && <PageConfiguration settings={settings} onSave={(s) => { setSettings(s); saveData('settings', s); showNotification("Settings Saved"); }} transactions={transactions} activeBots={activeBots} onToggleBot={(b) => setActiveBots(p => ({...p, [b]: !p[b]}))} onTestTrade={handleTestTrade} />}
      </main>
      <BottomNav activeTab={activePage} onChange={setActivePage} />
      {selectedStock && <TradeModal isOpen={isTradeModalOpen} onClose={() => setIsTradeModalOpen(false)} stock={selectedStock} currentPrice={marketData[selectedStock.symbol]?.price || selectedStock.currentPrice} funds={funds} holdings={paperPortfolio.filter(p => p.symbol === selectedStock.symbol)} activeBrokers={['PAPER']} initialBroker={initialBroker} onBuy={handleBuy} onSell={handleSell} />}
    </div>
  );
}
