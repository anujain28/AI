
export type AssetType = 'STOCK' | 'MCX' | 'FOREX' | 'CRYPTO';
export type BrokerID = 'PAPER' | 'DHAN' | 'SHOONYA' | 'BINANCE' | 'COINDCX' | 'COINSWITCH';

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
  oiSpikeThreshold: number; // Percentage increase in OI
  volMultiplier: number;    // Volume vs Avg Volume
  vwapConfirm: boolean;
  minTime: string;          // e.g., "09:30"
  maxTime: string;          // e.g., "15:00"
  atrStopMult: number;
  atrTargetMult: number;
  maxTradesPerDay: number;
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
  score?: number;
  isTopPick?: boolean;
  support?: number;
  resistance?: number;
  sourceUrl?: string;
  oiData?: {
    current: number;
    change: number;
  };
}

export interface HoldingAnalysis {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  reason: string;
  targetPrice: number;
  dividendYield: string;
  cagr: string;
}

export interface PortfolioHistoryPoint {
  time: string;
  value: number;
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
  atr: number; 
  vwap?: number;
  score: number;
  activeSignals: string[];
  support: number;
  resistance: number;
  volumeProfile: { price: number; volume: number }[];
  oiProfile?: { current: number; changePercent: number };
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

export interface AppSettings {
  initialFunds: Funds;
  autoTradeConfig: { mode: 'PERCENTAGE' | 'FIXED'; value: number };
  telegramBotToken: string;
  telegramChatId: string;
  activeBrokers: BrokerID[];
  enabledMarkets: MarketSettings;
  strategyRules: StrategyRules;
  dhanClientId?: string;
  dhanAccessToken?: string;
  shoonyaUserId?: string;
  shoonyaPassword?: string;
  binanceApiKey?: string;
  binanceSecret?: string;
  coindcxApiKey?: string;
  coindcxSecret?: string;
  coinswitchApiKey?: string;
}

export interface PortfolioItem {
  symbol: string;
  type: AssetType;
  quantity: number;
  avgCost: number;
  totalCost: number;
  broker: BrokerID;
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
}
