
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { getIdeasWatchlist, getEngineUniverse } from './services/stockListService';
import { fetchRealStockData } from './services/marketDataService';
import { runTechnicalScan, runIntradayAiAnalysis } from './services/recommendationEngine';
import { StockRecommendation, PortfolioItem, MarketData, Transaction, AppSettings, UserProfile, Funds, HoldingAnalysis, StrategyRules } from './types';
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
  name: 'Pro Trader',
  email: 'trader@aitrade.pro',
  picture: 'https://ui-avatars.com/api/?name=Pro+Trader&background=2563eb&color=fff',
  sub: 'default-user',
  isGuest: true
};

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
             <h1 className="text-2xl font-bold text-white tracking-[0.2em] mb-2 font-mono uppercase">AI Equity Pro</h1>
             <p className="text-slate-500 text-[8px] mt-4 font-mono tracking-widest text-center uppercase">Intrabot Initializing...<br/>Momentum Engine Online</p>
        </div>
    );
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activePage, setActivePage] = useState(0); 
  const [user] = useState<UserProfile>(DEFAULT_USER);
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
  
  const refreshIntervalRef = useRef<any>(null);
  const botIntervalRef = useRef<any>(null);
  const aiPickIntervalRef = useRef<any>(null);

  useEffect(() => { 
    const splashTimer = setTimeout(() => setShowSplash(false), 2000); 
    loadAppData();
    return () => clearTimeout(splashTimer);
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

  const showNotification = (msg: string) => {
      setNotification(msg);
      setTimeout(() => setNotification(null), 3000);
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
         results.forEach(({ symbol, data }) => { if (data) next[symbol] = data; });
         return next;
    });
    setIsLoading(false);
  }, [recommendations, paperPortfolio, settings]);

  const updateAiIntradayPicks = useCallback(async () => {
    if (recommendations.length > 5) {
        const picks = await runIntradayAiAnalysis(recommendations, marketData);
        if (picks && picks.length > 0) {
            setAiIntradayPicks(picks);
            showNotification("Intrabot AI Analysis Updated");
        }
    }
  }, [recommendations, marketData]);

  const handleManualAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    const newAnalysis: Record<string, HoldingAnalysis> = {};
    
    paperPortfolio.forEach(h => {
        const data = marketData[h.symbol];
        if (data) {
            const score = data.technicals.score;
            newAnalysis[h.symbol] = {
                symbol: h.symbol,
                action: score >= 75 ? 'BUY' : score <= 35 ? 'SELL' : 'HOLD',
                reason: data.technicals.activeSignals.join(', '),
                targetPrice: data.price + (data.technicals.atr * 2),
                dividendYield: "0.00%",
                cagr: "N/A"
            };
        }
    });
    
    setAnalysisData(newAnalysis);
    setTimeout(() => setIsAnalyzing(false), 1000);
    showNotification("Portfolio Analyzed");
  }, [paperPortfolio, marketData]);

  useEffect(() => {
    loadMarketData();
    refreshIntervalRef.current = setInterval(loadMarketData, 60000); 
    
    // AI Pick update every 10 mins
    aiPickIntervalRef.current = setInterval(updateAiIntradayPicks, 600000);
    
    botIntervalRef.current = setInterval(() => {
        if (!activeBots['PAPER']) return;
        
        const results = runAutoTradeEngine(settings, paperPortfolio, marketData, funds, recommendations);
        
        results.forEach(res => {
            if (res.transaction && res.newFunds) {
                const nextTx = [...transactions, res.transaction];
                setTransactions(nextTx);
                saveData('transactions', nextTx);
                
                setFunds(res.newFunds);
                saveData('funds', res.newFunds);

                if (res.transaction.type === 'BUY') {
                    const nextPortfolio = [...paperPortfolio, { 
                      symbol: res.transaction.symbol, 
                      type: res.transaction.assetType, 
                      quantity: res.transaction.quantity, 
                      avgCost: res.transaction.price, 
                      totalCost: res.transaction.price * res.transaction.quantity, 
                      broker: 'PAPER' as const
                    }];
                    setPaperPortfolio(nextPortfolio);
                    saveData('portfolio', nextPortfolio);
                } else {
                    const nextPortfolio = paperPortfolio.filter(p => p.symbol !== res.transaction!.symbol);
                    setPaperPortfolio(nextPortfolio);
                    saveData('portfolio', nextPortfolio);
                }
                showNotification(`Bot Executed: ${res.reason || 'Momentum Entry'}`);
            }
        });
    }, 15000);
    
    return () => { 
        clearInterval(refreshIntervalRef.current); 
        clearInterval(botIntervalRef.current); 
        clearInterval(aiPickIntervalRef.current);
    };
  }, [loadMarketData, updateAiIntradayPicks, settings, paperPortfolio, marketData, funds, recommendations, activeBots, transactions, saveData]);

  const handleBuy = async (symbol: string, quantity: number, price: number, broker: any) => {
      const cost = quantity * price;
      const nextPortfolio = [...paperPortfolio, { symbol, type: 'STOCK' as const, quantity, avgCost: price, totalCost: cost, broker: 'PAPER' as const }];
      const nextFunds = { ...funds, stock: funds.stock - cost };
      const nextTx = [...transactions, { id: Date.now().toString(), type: 'BUY' as const, symbol, assetType: 'STOCK' as const, quantity, price, timestamp: Date.now(), broker: 'PAPER' as const }];
      
      setPaperPortfolio(nextPortfolio);
      setFunds(nextFunds);
      setTransactions(nextTx);
      
      saveData('portfolio', nextPortfolio);
      saveData('funds', nextFunds);
      saveData('transactions', nextTx);
  };

  const handleSell = async (symbol: string, quantity: number, price: number, broker: any) => {
      const nextPortfolio = paperPortfolio.filter(p => p.symbol !== symbol);
      const nextFunds = { ...funds, stock: funds.stock + (quantity * price) };
      const nextTx = [...transactions, { id: Date.now().toString(), type: 'SELL' as const, symbol, assetType: 'STOCK' as const, quantity, price, timestamp: Date.now(), broker: 'PAPER' as const }];
      
      setPaperPortfolio(nextPortfolio);
      setFunds(nextFunds);
      setTransactions(nextTx);

      saveData('portfolio', nextPortfolio);
      saveData('funds', nextFunds);
      saveData('transactions', nextTx);
  };

  const handleUpdateRules = (rules: StrategyRules) => {
    const next = { ...settings, strategyRules: rules };
    setSettings(next);
    saveData('settings', next);
  };

  const handleUpdateFunds = (newFunds: Funds) => {
    setFunds(newFunds);
    saveData('funds', newFunds);
  };

  if (showSplash) return <SplashScreen visible={true} />;

  return (
    <div className="h-full flex flex-col bg-background text-slate-100 overflow-hidden">
      {notification && (
        <div className="fixed top-4 left-4 right-4 z-[60] bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-700 animate-slide-up text-xs font-bold text-center shadow-2xl">
          {notification}
        </div>
      )}
      <main className="flex-1 overflow-y-auto custom-scrollbar w-full max-w-lg mx-auto md:max-w-7xl md:border-x md:border-slate-800">
        {activePage === 0 && <PageMarket recommendations={recommendations} marketData={marketData} onTrade={(s) => { setSelectedStock(s); setIsTradeModalOpen(true); }} onRefresh={() => { setRecommendations([]); loadMarketData(); }} isLoading={isLoading} enabledMarkets={settings.enabledMarkets} />}
        {activePage === 1 && <PageStrategyLog recommendations={recommendations} marketData={marketData} rules={settings.strategyRules || DEFAULT_RULES} onUpdateRules={handleUpdateRules} aiIntradayPicks={aiIntradayPicks} />}
        {activePage === 2 && <PagePaperTrading holdings={paperPortfolio} marketData={marketData} analysisData={analysisData} onSell={(s, b) => handleSell(s, 1, marketData[s]?.price || 0, b)} onAnalyze={handleManualAnalyze} isAnalyzing={isAnalyzing} funds={funds} activeBots={activeBots} onToggleBot={(b) => setActiveBots(p => ({...p, [b]: !p[b]}))} transactions={transactions} onUpdateFunds={handleUpdateFunds} />}
        {activePage === 3 && <PageLivePNL title="Broker Portfolio" subtitle="Live Connected Accounts" icon={Briefcase} holdings={paperPortfolio.filter(h => h.broker !== 'PAPER')} marketData={marketData} analysisData={analysisData} onSell={(s, b) => handleSell(s, 1, marketData[s]?.price || 0, b)} brokerBalances={{}} />}
        {activePage === 4 && <PageConfiguration settings={settings} onSave={(s) => { setSettings(s); saveData('settings', s); showNotification("Settings Saved"); }} transactions={transactions} activeBots={activeBots} onToggleBot={(b) => setActiveBots(p => ({...p, [b]: !p[b]}))} />}
      </main>
      <BottomNav activeTab={activePage} onChange={setActivePage} />
      {selectedStock && <TradeModal isOpen={isTradeModalOpen} onClose={() => setIsTradeModalOpen(false)} stock={selectedStock} currentPrice={marketData[selectedStock.symbol]?.price || selectedStock.currentPrice} funds={funds} holdings={paperPortfolio.filter(p => p.symbol === selectedStock.symbol)} activeBrokers={['PAPER']} onBuy={handleBuy} onSell={handleSell} />}
    </div>
  );
}
