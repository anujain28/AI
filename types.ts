
export type AssetType = 'STOCK' | 'MCX' | 'FOREX' | 'CRYPTO';

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
  sub: string; // Google ID
  isGuest?: boolean;
}

export interface Funds {
  stock: number;
  mcx: number;
  forex: number;
  crypto: number;
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
  isTopPick?: boolean; // New flag for AIRobots picks
  sourceUrl?: string; // Grounding source
}

export interface HoldingAnalysis {
  symbol: string;
  action: 'BUY' | 'HOLD' | 'SELL';
  reason: string;
  targetPrice: number;
  dividendYield: string;
  cagr: string;
}

export type BrokerID = 'PAPER' | 'DHAN' | 'SHOONYA' | 'BINANCE' | 'COINDCX' | 'COINSWITCH';

export interface PortfolioItem {
  symbol: string;
  type: AssetType;
  quantity: number;
  avgCost: number;
  totalCost: number;
  broker: BrokerID;
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
  ema: { ema9: number; ema21: number };
  obv: number;
  score: number;
  activeSignals: string[];
  signalStrength: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL';
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
  mcx: boolean;
  forex: boolean;
  crypto: boolean;
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
  dhanClientId?: string;
  dhanAccessToken?: string;
  shoonyaUserId?: string;
  shoonyaPassword?: string;
  shoonyaApiKey?: string;
  shoonyaVendorCode?: string;
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

declare global {
    interface Window {
        adsbygoogle: any[];
    }
}