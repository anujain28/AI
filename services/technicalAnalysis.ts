
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
  return { k: k || 50, d: k || 50 }; 
};

export const calculateATR = (candles: Candle[], period: number = 14): number => {
    if (candles.length < period + 1) return 0;
    const trValues: number[] = [];
    for(let i = 1; i < candles.length; i++) {
        const tr = Math.max(
            candles[i].high - candles[i].low,
            Math.abs(candles[i].high - candles[i-1].close),
            Math.abs(candles[i].low - candles[i-1].close)
        );
        trValues.push(tr);
    }
    return trValues.slice(-period).reduce((a, b) => a + b, 0) / period;
};

/**
 * Calculates Intraday Levels (Support / Resistance / OI Proxy)
 */
export const calculateLevels = (candles: Candle[]) => {
    if (candles.length < 5) return { support: 0, resistance: 0, oiStrength: 0 };
    
    const highs = getHighs(candles);
    const lows = getLows(candles);
    const lastPrice = candles[candles.length - 1].close;
    
    // Simple S/R based on session extremes
    const resistance = Math.max(...highs);
    const support = Math.min(...lows);
    
    // Simulate OI Profile (Open Interest proxy)
    // Positive if Price UP + Volume UP
    // Negative if Price DOWN + Volume UP (short build-up)
    let oiScore = 0;
    for (let i = 1; i < candles.length; i++) {
        const priceChange = candles[i].close - candles[i-1].close;
        const volChange = candles[i].volume / (candles[i-1].volume || 1);
        if (priceChange > 0 && volChange > 1.2) oiScore += 5;
        if (priceChange < 0 && volChange > 1.2) oiScore -= 3;
    }
    
    return { 
        support, 
        resistance, 
        oiStrength: Math.max(-100, Math.min(100, oiScore * 2)) 
    };
};

/**
 * Calculates Intraday Volume Profile Strength & VWAP Approximation
 */
const calculateIntradayMetrics = (candles: Candle[]) => {
    const volumes = candles.map(c => c.volume);
    const avgVol = calcSMA(volumes, 20);
    const currentVol = volumes[volumes.length - 1];
    const relativeVol = currentVol / (avgVol || 1);
    
    // VWAP Approximation = Sum(Price * Volume) / Sum(Volume)
    let cumulativePV = 0;
    let cumulativeV = 0;
    candles.slice(-20).forEach(c => {
        const avgPrice = (c.high + c.low + c.close) / 3;
        cumulativePV += avgPrice * c.volume;
        cumulativeV += c.volume;
    });
    const vwap = cumulativeV > 0 ? cumulativePV / cumulativeV : candles[candles.length - 1].close;

    // Price Velocity (Price change over last 3 candles)
    const priceVelocity = candles.length >= 4 
        ? ((candles[candles.length - 1].close - candles[candles.length - 4].close) / candles[candles.length - 4].close) * 100
        : 0;

    return { relativeVol, vwap, priceVelocity };
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
  const atr = calculateATR(candles);
  const { relativeVol, vwap, priceVelocity } = calculateIntradayMetrics(candles);
  
  const closes = getCloses(candles);
  const currentPrice = closes[closes.length - 1];
  const ema9Series = calcEMA(closes, 9);
  const ema21Series = calcEMA(closes, 21);
  const ema9 = ema9Series[ema9Series.length - 1];
  const ema21 = ema21Series[ema21Series.length - 1];

  const obvSeries: number[] = [0];
  for(let i=1; i<candles.length; i++) {
      let currentOBV = obvSeries[i-1];
      if (candles[i].close > candles[i-1].close) currentOBV += candles[i].volume;
      else if (candles[i].close < candles[i-1].close) currentOBV -= candles[i].volume;
      obvSeries.push(currentOBV);
  }
  const currentOBV = obvSeries[obvSeries.length - 1];
  const obvSMA = calcSMA(obvSeries, 10);

  const activeSignals: string[] = [];
  let score = 0;

  // INTRADAY PRIORITY 1: VWAP & Price Velocity
  if (currentPrice > vwap) {
      score += 25;
      activeSignals.push("Above VWAP");
  }
  if (priceVelocity > 0.5) {
      score += 20;
      activeSignals.push("High Velocity");
  }

  // INTRADAY PRIORITY 2: Relative Volume (Proxy for institutional interest/OI build-up)
  if (relativeVol > 2) {
      score += 35;
      activeSignals.push("Institutional Burst");
  } else if (relativeVol > 1.2) {
      score += 15;
      activeSignals.push("Volume Support");
  }

  // STANDARD MOMENTUM
  if (rsi < 35) { score += 20; activeSignals.push(`Oversold RSI`); }
  else if (rsi > 70) { score -= 15; activeSignals.push("Overbought RSI"); }

  if (macd.histogram > 0 && macd.macd > macd.signal) {
      score += 20;
      activeSignals.push("MACD Bullish");
  }

  if (ema9 > ema21) {
      score += 15;
      activeSignals.push("Trend Align");
  }

  if (currentOBV > obvSMA) {
      score += 10;
      activeSignals.push("Accumulation");
  }

  let signalStrength: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' = 'HOLD';
  if (score >= 85) signalStrength = 'STRONG BUY';
  else if (score >= 60) signalStrength = 'BUY';
  else if (score <= 20) signalStrength = 'SELL';

  return { rsi, macd, stoch, adx: 30, atr, bollinger, ema: {ema9, ema21}, obv: currentOBV, score: Math.min(100, score), activeSignals, signalStrength };
};
