
export type AssetType = 'STOCK' | 'MCX' | 'FOREX' | 'CRYPTO';

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
  sub: string;
  isGuest?: boolean;
}

export interface Funds {
  stock: number;
  mcx: number;
  forex: number;
  crypto: number;
}

export interface StrategyRules {
  rsiBuyZone: number;
  rsiSellZone: number;
  vwapConfirm: boolean;
  minVolMult: number;
  atrStopMult: number;
  atrTargetMult: number;
  maxTradesPerDay: number;
}

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  source: string;
  stock?: string;
  reco?: string;
  target?: string;
}

export interface CustomScanParameters {
  minRsi?: number;
  maxRsi?: number;
  minAdx?: number;
  minRvol?: number;
  priceAboveEma9?: boolean;
  priceAboveEma21?: boolean;
  emaCrossover?: boolean;
  bbSqueeze?: boolean;
  bbBreakout?: boolean;
  priceAboveSupertrend?: boolean;
  macdPositive?: boolean;
  volumeSpike?: boolean;
  stochOversold?: boolean;
  stochOverbought?: boolean;
  adxStrongTrend?: boolean;
}

export interface StockRecommendation {
  symbol: string;
  name: string;
  type: AssetType;
  sector: string;
  currentPrice: number;
  reason: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  targetPrice: number;
  lotSize: number;
  timeframe?: 'INTRADAY' | 'BTST' | 'WEEKLY' | 'MONTHLY';
  chartPattern?: string; 
  isTopPick?: boolean;
  sourceUrl?: string;
  score?: number;
}

export interface BacktestTrade {
  symbol: string;
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  exitReason: string;
}

export interface BacktestResult {
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  maxDrawdown: number;
  trades: BacktestTrade[];
  equityCurve: { time: string; value: number }[];
}

export interface HoldingAnalysis {
  symbol: string;
  action: 'BUY' | 'HOLD' | 'SELL';
  reason: string;
  targetPrice: number;
  dividendYield: string;
  cagr: string;
}

export type BrokerID = 'PAPER' | 'DHAN' | 'SHOONYA' | 'ZERODHA' | 'BINANCE' | 'COINDCX' | 'COINSWITCH';

export interface PortfolioItem {
  symbol: string;
  type: AssetType;
  quantity: number;
  avgCost: number;
  totalCost: number;
  broker: BrokerID;
  timeframe?: 'INTRADAY' | 'BTST' | 'WEEKLY' | 'MONTHLY';
  targets?: {
      t1: number; 
      t2: number; 
      t3: number; 
  };
}

export interface Transaction {
  id: string;
  type: 'BUY' | 'SELL';
  symbol: string;
  assetType: AssetType;
  quantity: number;
  price: number;
  timestamp: number;
  broker: BrokerID;
  brokerage?: number;
  timeframe?: 'INTRADAY' | 'BTST' | 'WEEKLY' | 'MONTHLY';
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalSignals {
  rsi: number;
  macd: { macd: number; signal: number; histogram: number };
  stoch: { k: number; d: number };
  adx: number;
  atr: number; 
  bollinger: { upper: number; middle: number; lower: number; percentB: number };
  bitValue?: number;
  ema: { ema9: number; ema21: number };
  supertrend: { value: number; trend: 'BUY' | 'SELL' };
  obv: number;
  score: number;
  activeSignals: string[];
  signalStrength: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL';
  rvol: number;
}

export interface StockData {
  price: number;
  change: number;
  changePercent: number;
  history: Candle[]; 
  technicals: TechnicalSignals;
}

export interface MarketData {
  [symbol: string]: StockData;
}

export interface MarketSettings {
  stocks: boolean;
  mcx?: boolean;
  forex?: boolean;
  crypto?: boolean;
}

export interface AutoTradeConfig {
  mode: 'PERCENTAGE' | 'FIXED';
  value: number;
}

export interface AppSettings {
  initialFunds: Funds;
  autoTradeConfig: AutoTradeConfig;
  telegramBotToken: string;
  telegramChatId: string;
  activeBrokers: BrokerID[];
  enabledMarkets: MarketSettings;
  strategyRules?: StrategyRules;
  dhanClientId?: string;
  dhanAccessToken?: string;
  shoonyaUserId?: string;
  shoonyaPassword?: string;
  shoonyaApiKey?: string;
  shoonyaVendorCode?: string;
  kiteApiKey?: string;
  kiteApiSecret?: string;
  kiteUserId?: string;
  binanceApiKey?: string;
  binanceSecret?: string;
  coindcxApiKey?: string;
  coindcxSecret?: string;
  coinswitchApiKey?: string;
}

export interface PortfolioHistoryPoint {
  time: string;
  value: number;
}

export interface BrokerIntelResponse {
  data: StockRecommendation[];
  news: NewsItem[];
  error?: string;
}

declare global {
    interface Window {
        adsbygoogle: any[];
    }
}
