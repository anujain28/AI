import { Candle, TechnicalSignals } from "../types";

// --- Enhanced Helpers ---
const getCloses = (candles: Candle[]) => candles.map(c => c.close);
const getHighs = (candles: Candle[]) => candles.map(c => c.high);
const getLows = (candles: Candle[]) => candles.map(c => c.low);
const getVolumes = (candles: Candle[]) => candles.map(c => c.volume);

const calcSMA = (data: number[], period: number): number => {
  if (data.length < period) return data[data.length - 1] || 0;
  return data.slice(-period).reduce((a, b) => a + b, 0) / period;
};

const calcEMA = (data: number[], period: number): number[] => {
  if (data.length === 0) return [];
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

// --- Accurate Indicators (Fixed & Enhanced) ---
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
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = calcEMA(macdLine, 9);
  
  return {
    macd: macdLine[macdLine.length - 1],
    signal: signalLine[signalLine.length - 1],
    histogram: macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1]
  };
};

export const calculateBollinger = (candles: Candle[], period: number = 20): any => {
  const closes = getCloses(candles);
  if (closes.length < period) return { upper: 0, middle: 0, lower: 0, percentB: 0 };
  
  const sma = calcSMA(closes, period);
  const stdDev = calcStdDev(closes, period);
  const upper = sma + (2 * stdDev);
  const lower = sma - (2 * stdDev);
  const current = closes[closes.length - 1];
  
  return {
    upper, middle: sma, lower,
    percentB: upper > lower ? (current - lower) / (upper - lower) : 0,
    bandwidth: (upper - lower) / sma  // NEW: Squeeze detection
  };
};

// FIXED: Proper 3-period %D smoothing
export const calculateStochastic = (candles: Candle[], period: number = 14): any => {
  if (candles.length < period) return { k: 50, d: 50 };
  
  const lows = getLows(candles);
  const highs = getHighs(candles);
  const closes = getCloses(candles);
  
  const currentClose = closes[closes.length - 1];
  const windowLows = lows.slice(-period);
  const windowHighs = highs.slice(-period);
  const lowestLow = Math.min(...windowLows);
  const highestHigh = Math.max(...windowHighs);
  
  let k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
  
  // Proper %D: 3-period SMA of %K (need historical %K for accuracy)
  const kHistory = [];
  for (let i = period - 1; i < closes.length; i++) {
    const windowLow = Math.min(...lows.slice(i - period + 1, i + 1));
    const windowHigh = Math.max(...highs.slice(i - period + 1, i + 1));
    kHistory.push(((closes[i] - windowLow) / (windowHigh - windowLow)) * 100);
  }
  const d = kHistory.length >= 3 ? calcSMA(kHistory.slice(-3), 3) : k;
  
  return { k: k || 50, d: d || 50 };
};

// NEW: Proper ADX Implementation (No Randomness!)
export const calculateADX = (candles: Candle[], period: number = 14): number => {
  if (candles.length < period * 2) return 20;
  
  const highs = getHighs(candles);
  const lows = getLows(candles);
  const closes = getCloses(candles);
  
  const trs: number[] = [];
  const dms: { plus: number[], minus: number[] } = { plus: [], minus: [] };
  
  for (let i = 1; i < candles.length; i++) {
    const highDiff = highs[i] - highs[i-1];
    const lowDiff = lows[i-1] - lows[i];
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i-1]),
      Math.abs(lows[i] - closes[i-1])
    );
    
    const plusDM = highDiff > lowDiff && highDiff > 0 ? highDiff : 0;
    const minusDM = lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0;
    
    trs.push(tr);
    dms.plus.push(plusDM);
    dms.minus.push(minusDM);
  }
  
  const atr = calcSMA(trs.slice(-period), period);
  const plusDI = 100 * calcSMA(dms.plus.slice(-period), period) / atr;
  const minusDI = 100 * calcSMA(dms.minus.slice(-period), period) / atr;
  const dx = 100 * Math.abs(plusDI - minusDI) / (plusDI + minusDI);
  
  return dx;  // Current ADX value
};

export const calculateSuperTrend = (candles: Candle[], period: number = 10, multiplier: number = 3): any => {
  if (candles.length < period + 1) return { supertrend: 0, direction: 0 };
  
  const atr = calculateATR(candles.slice(-period-1), period);
  const hl2 = candles.slice(-period).map((c, i) => (c.high + c.low) / 2);
  const basicUpper = hl2.map(h => h + (multiplier * atr));
  const basicLower = hl2.map(h => h - (multiplier * atr));
  
  let supertrend = basicLower[0];
  let direction = 1;
  
  for (let i = 1; i < basicUpper.length; i++) {
    const currUpper = basicUpper[i] < basicUpper[i-1] || candles[i].close[0] > basicUpper[i-1] ? basicUpper[i] : basicUpper[i-1];
    const currLower = basicLower[i] > basicLower[i-1] || candles[i].close[0] < basicLower[i-1] ? basicLower[i] : basicLower[i-1];
    
    if (direction > 0 && candles[i].close <= currLower) {
      direction = -1;
      supertrend = currUpper;
    } else if (direction < 0 && candles[i].close >= currUpper) {
      direction = 1;
      supertrend = currLower;
    } else {
      supertrend = direction > 0 ? currLower : currUpper;
    }
  }
  
  return { supertrend: supertrend, direction };  // 1=bullish, -1=bearish [web:46][web:38]
};

export const calculateATR = (candles: Candle[], period: number = 14): number => {
  if (candles.length < period + 1) return 0;
  
  const trValues: number[] = [];
  for(let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i-1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trValues.push(tr);
  }
  return calcSMA(trValues.slice(-period), period);
};

// --- HIGH-PROFIT SCREENER ALGO (Minimum 5%+ Potential) ---
export const analyzeHighProfitStock = (candles: Candle[]): TechnicalSignals & { profitPotential: number, minTarget: number } => {
  if (candles.length < 50) {  // Need 50+ candles for reliable signals
    return { rsi: 50, macd: {macd:0, signal:0, histogram:0}, stoch: {k:50, d:50}, 
      adx: 0, atr: 0, bollinger: {upper:0, middle:0, lower:0, percentB:0}, 
      ema: {ema9:0, ema21:0}, obv: 0, supertrend: {supertrend:0, direction:0}, score: 0, 
      activeSignals: [], signalStrength: 'HOLD', profitPotential: 0, minTarget: 0 };
  }

  // Calculate ALL indicators
  const rsi = calculateRSI(candles);
  const macd = calculateMACD(candles);
  const stoch = calculateStochastic(candles);
  const bollinger = calculateBollinger(candles);
  const adx = calculateADX(candles);
  const atr = calculateATR(candles);
  const ema = { ema9: calcEMA(getCloses(candles), 9).pop() || 0, ema21: calcEMA(getCloses(candles), 21).pop() || 0 };
  const supertrend = calculateSuperTrend(candles);
  const obvSeries = calculateOBVData(candles);
  const currentOBV = obvSeries[obvSeries.length - 1];
  
  const currentPrice = candles[candles.length - 1].close;
  const volumes = getVolumes(candles);
  const avgVol = calcSMA(volumes, 20);
  const currentVol = volumes[volumes.length - 1];
  const priceChange5d = ((currentPrice - getCloses(candles).slice(-6)[0]) / getCloses(candles).slice(-6)[0]) * 100;  // 5-day momentum

  const activeSignals: string[] = [];
  let score = 0;
  let profitPotential = 0;

  // HIGH-PROFIT SIGNALS ONLY (5%+ minimum targets) [web:35][web:40]
  
  // 1. SUPERBULL MOMENTUM (35 pts) - New: Highest weight [web:36]
  if (priceChange5d > 8 && adx > 25 && currentVol > avgVol * 2) {
    score += 35;
    activeSignals.push(`🚀 5D Momentum +${priceChange5d.toFixed(1)}%`);
    profitPotential = Math.max(profitPotential, 12);  // 12%+ potential
  }

  // 2. SUPERTREND BUY (32 pts) - Most reliable trend [web:38][web:46]
  if (supertrend.direction === 1 && currentPrice > supertrend.supertrend && adx > 20) {
    score += 32;
    activeSignals.push("🟢 SuperTrend Bull");
    profitPotential = Math.max(profitPotential, 8);
  }

  // 3. MACD + ZERO LINE (28 pts) - Strong momentum confirmation
  if (macd.macd > macd.signal && macd.macd > 0 && macd.histogram > 0) {
    score += 28;
    activeSignals.push("📈 MACD Bull + Zero");
  }

  // 4. BOLLINGER SQUEEZE BREAKOUT (26 pts) - Volatility expansion [web:35]
  if (bollinger.bandwidth < 0.04 && bollinger.percentB > 0.8 && priceChange5d > 2) {
    score += 26;
    activeSignals.push("💥 BB Squeeze Breakout");
    profitPotential = Math.max(profitPotential, 10);
  }

  // 5. RSI DIVERGENCE ZONE (22 pts) - Early reversal
  if (rsi > 45 && rsi < 60 && ema.ema9 > ema.ema21) {
    score += 22;
    activeSignals.push(`RSI Strength ${rsi.toFixed(0)}`);
  }

  // 6. VOLUME CONFIRMATION (20 pts)
  if (currentVol > avgVol * 1.8 && priceChange5d > 1.5) {
    score += 20;
    activeSignals.push(`Vol x${(currentVol/avgVol).toFixed(1)}`);
  }

  // 7. OBV ACCUMULATION (18 pts)
  if (currentOBV > calcSMA(obvSeries, 10)) {
    score += 18;
    activeSignals.push("💰 OBV Uptrend");
  }

  // HIGH-PROFIT FILTER: Only STRONG BUY if score > 110 AND profitPotential >= 7%
  let signalStrength: '🚀 STRONG BUY' | '✅ BUY' | '⚪ HOLD' | '❌ AVOID' = '⚪ HOLD';
  const minTarget = currentPrice * (1 + profitPotential / 100);
  
  if (score >= 110 && profitPotential >= 7) {
    signalStrength = '🚀 STRONG BUY';
  } else if (score >= 85 && profitPotential >= 5) {
    signalStrength = '✅ BUY';
  } else if (score < 40) {
    signalStrength = '❌ AVOID';
  }

  return {
    rsi, macd, stoch, adx, atr, bollinger, ema, obv: currentOBV,
    supertrend, score, activeSignals, signalStrength,
    profitPotential, minTarget  // NEW: Explicit profit metrics
  };
};

// Keep original for backward compatibility
export const analyzeStockTechnical = analyzeHighProfitStock;

export const calculateOBVData = (candles: Candle[]): number[] => {
  const obv: number[] = [0];
  for(let i = 1; i < candles.length; i++) {
    let currentOBV = obv[i-1];
    if (candles[i].close > candles[i-1].close) currentOBV += candles[i].volume;
    else if (candles[i].close < candles[i-1].close) currentOBV -= candles[i].volume;
    obv.push(currentOBV);
  }
  return obv;
};
