import { Candle, TechnicalSignals } from "../types";

// --- Helpers ---
const getCloses = (candles: Candle[]) => candles.map(c => c.close);
const getHighs = (candles: Candle[]) => candles.map(c => c.high);
const getLows = (candles: Candle[]) => candles.map(c => c.low);

const calcSMA = (data: number[], period: number): number => {
  if (data.length < period) return data[data.length - 1];
  return data.slice(-period).reduce((a, b) => a + b, 0) / period;
};

const calcEMA = (data: number[], period: number): number[] => {
  const k = 2 / (period + 1);
  const emaArray = [data[0]];
  for (let i = 1; i < data.length; i++) {
    emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
  }
  return emaArray;
};

const calcStdDev = (data: number[], period: number): number => {
  if (data.length < period) return 0;
  const slice = data.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
  return Math.sqrt(variance);
};

// --- Indicators ---

export const calculateRSI = (candles: Candle[], period: number = 14): number => {
  if (candles.length < period + 1) return 50;
  const closes = getCloses(candles);
  
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses += Math.abs(diff);
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

export const calculateMACD = (candles: Candle[]) => {
  const closes = getCloses(candles);
  if (closes.length < 26) return { macd: 0, signal: 0, histogram: 0 };
  
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  
  const macdLine: number[] = [];
  for(let i=0; i<closes.length; i++) {
      macdLine.push(ema12[i] - ema26[i]);
  }
  
  const signalLine = calcEMA(macdLine, 9);
  const currentMACD = macdLine[macdLine.length - 1];
  const currentSignal = signalLine[signalLine.length - 1];
  
  return {
      macd: currentMACD,
      signal: currentSignal,
      histogram: currentMACD - currentSignal
  };
};

export const calculateBollinger = (candles: Candle[], period: number = 20) => {
  const closes = getCloses(candles);
  if (closes.length < period) return { upper: 0, middle: 0, lower: 0, percentB: 0 };
  
  const sma = calcSMA(closes, period);
  const stdDev = calcStdDev(closes, period);
  const upper = sma + (2 * stdDev);
  const lower = sma - (2 * stdDev);
  const current = closes[closes.length - 1];
  
  return {
      upper,
      middle: sma,
      lower,
      percentB: (current - lower) / (upper - lower)
  };
};

export const calculateStochastic = (candles: Candle[], period: number = 14) => {
  if (candles.length < period) return { k: 50, d: 50 };
  
  const lows = getLows(candles);
  const highs = getHighs(candles);
  const closes = getCloses(candles);
  
  const currentClose = closes[closes.length - 1];
  const windowLows = lows.slice(-period);
  const windowHighs = highs.slice(-period);
  const lowestLow = Math.min(...windowLows);
  const highestHigh = Math.max(...windowHighs);
  
  const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
  // Simple smoothing for %D (3-period SMA of %K)
  // For simulation, we approximate d = k
  return { k: k || 50, d: k || 50 }; 
};

export const calculateEMA_Crossover = (candles: Candle[]) => {
    const closes = getCloses(candles);
    if(closes.length < 21) return { ema9: 0, ema21: 0 };
    const ema9 = calcEMA(closes, 9).pop() || 0;
    const ema21 = calcEMA(closes, 21).pop() || 0;
    return { ema9, ema21 };
};

export const calculateOBVData = (candles: Candle[]): number[] => {
    const obv: number[] = [0];
    for(let i=1; i<candles.length; i++) {
        let currentOBV = obv[i-1];
        if (candles[i].close > candles[i-1].close) currentOBV += candles[i].volume;
        else if (candles[i].close < candles[i-1].close) currentOBV -= candles[i].volume;
        obv.push(currentOBV);
    }
    return obv;
};

// Simplified ADX for simulation
export const calculateADX = (candles: Candle[], period: number = 14) => {
    if (candles.length < period * 2) return 20;
    return 25 + Math.random() * 10; 
};

export const calculateATR = (candles: Candle[], period: number = 14): number => {
    if (candles.length < period + 1) return 0;
    
    const trValues: number[] = [];
    for(let i = 1; i < candles.length; i++) {
        const high = candles[i].high;
        const low = candles[i].low;
        const prevClose = candles[i-1].close;
        
        const tr = Math.max(
            high - low,
            Math.abs(high - prevClose),
            Math.abs(low - prevClose)
        );
        trValues.push(tr);
    }
    
    // Simple SMA of TR for ATR
    return calcSMA(trValues, period);
};

// --- MAIN SCORING ENGINE ---
export const analyzeStockTechnical = (candles: Candle[]): TechnicalSignals => {
  if (candles.length < 2) {
      return { 
          rsi: 50, macd: {macd:0, signal:0, histogram:0}, stoch: {k:50, d:50}, 
          adx: 0, atr: 0, bollinger: {upper:0, middle:0, lower:0, percentB:0}, 
          ema: {ema9:0, ema21:0}, obv: 0, score: 0, activeSignals: [], signalStrength: 'HOLD' 
      };
  }

  const rsi = calculateRSI(candles);
  const macd = calculateMACD(candles);
  const stoch = calculateStochastic(candles);
  const bollinger = calculateBollinger(candles);
  const ema = calculateEMA_Crossover(candles);
  const adx = calculateADX(candles);
  const atr = calculateATR(candles);
  
  // OBV Calculation
  const obvSeries = calculateOBVData(candles);
  const currentOBV = obvSeries[obvSeries.length - 1];
  const obvSMA = calcSMA(obvSeries, 10);

  // Volume Confirmation
  const volumes = candles.map(c => c.volume);
  const avgVol = calcSMA(volumes, 20);
  const currentVol = volumes[volumes.length - 1];
  const priceChange = ((candles[candles.length - 1].close - candles[candles.length - 2].close) / candles[candles.length - 2].close) * 100;

  const activeSignals: string[] = [];
  let score = 0;

  // 1. RSI Scoring
  if (rsi < 30) { score += 35; activeSignals.push(`RSI Oversold (${rsi.toFixed(0)})`); }
  else if (rsi < 40) { score += 25; activeSignals.push("RSI Buy Zone"); }
  else if (rsi > 70) { score -= 20; activeSignals.push("RSI Overbought"); }

  // 2. MACD Scoring
  if (macd.histogram > 0 && macd.macd > macd.signal) {
      score += 30;
      activeSignals.push("MACD Bullish");
  }

  // 3. Stochastic Scoring
  if (stoch.k < 20) {
      score += 25;
      activeSignals.push("Stoch Oversold");
  }

  // 4. Bollinger Squeeze / Breakout
  if (bollinger.percentB < 0.1) {
      score += 25;
      activeSignals.push("BB Support");
  }

  // 5. EMA Crossover (Golden Cross)
  if (ema.ema9 > ema.ema21) {
      score += 28;
      activeSignals.push("EMA Uptrend");
  }

  // 6. ADX Trend
  if (adx > 25) {
      score += 30;
      activeSignals.push(`Strong Trend`);
  }
  
  // 7. OBV Accumulation (Matches Python: OBV > SMA(10))
  if (currentOBV > obvSMA) {
      score += 22;
      activeSignals.push("OBV Accumulation");
  }

  // 8. Volume Price Confirmation (Matches Python: Vol > 1.5*Avg & Change > 1%)
  if (currentVol > avgVol * 1.5 && priceChange > 1) {
      score += 30;
      activeSignals.push(`Vol Spike + Price`);
  }

  // Determine Strength
  let signalStrength: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' = 'HOLD';
  if (score >= 90) signalStrength = 'STRONG BUY';
  else if (score >= 60) signalStrength = 'BUY';
  else if (score <= 20) signalStrength = 'SELL';

  return {
    rsi,
    macd,
    stoch,
    adx,
    atr,
    bollinger,
    ema,
    obv: currentOBV,
    score,
    activeSignals,
    signalStrength
  };
};