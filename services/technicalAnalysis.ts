
import { StockRecommendation, TechnicalSignals } from "../types";

export const analyzeStockOIProfile = (candles: any[]): TechnicalSignals => {
    if (candles.length < 5) {
        return { rsi: 50, macd: {macd:0, signal:0, histogram:0}, atr: 0, score: 0, activeSignals: [], support: 0, resistance: 0, volumeProfile: [] };
    }

    const last = candles[candles.length - 1];
    const prices = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);
    
    // Simulate OI Data (as Yahoo doesn't provide real-time OI for free)
    // In a real Dhan/Zerodha implementation, this would be actual OI.
    const mockOI = 1000000 + (Math.random() * 50000);
    const mockOIChange = (Math.random() * 10) - 2; // -2% to +8%

    // Calculate Support/Resistance via Volume Profile
    // Find price levels with highest volume clusters
    const bins: Record<string, number> = {};
    candles.forEach(c => {
        const bin = Math.round(c.close / 5) * 5; // Group by 5 INR intervals
        bins[bin] = (bins[bin] || 0) + c.volume;
    });

    const sortedBins = Object.entries(bins).sort((a, b) => b[1] - a[1]);
    const resistance = parseFloat(sortedBins[0]?.[0]) || last.close * 1.02;
    const support = parseFloat(sortedBins[1]?.[0]) || last.close * 0.98;

    // VWAP Mock (Average Price weighted by Volume)
    const vwap = candles.reduce((acc, c) => acc + (c.close * c.volume), 0) / candles.reduce((acc, c) => acc + c.volume, 0);

    const activeSignals: string[] = [];
    let score = 0;

    // 1. Price vs VWAP
    if (last.close > vwap) {
        score += 30;
        activeSignals.push("Above VWAP");
    }

    // 2. OI Spike Confirmation
    if (mockOIChange > 3) {
        score += 40;
        activeSignals.push(`OI Spike ${mockOIChange.toFixed(1)}%`);
    }

    // 3. Volume Confirmation
    const avgVol = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    if (last.volume > avgVol * 1.5) {
        score += 30;
        activeSignals.push("Volume Burst");
    }

    // 4. Resistance Breakout
    if (last.close > resistance) {
        score += 20;
        activeSignals.push("Resist Breakout");
    }

    return {
        rsi: 50,
        macd: { macd: 0, signal: 0, histogram: 0 },
        atr: (resistance - support) / 2 || last.close * 0.01,
        vwap,
        score,
        activeSignals,
        support,
        resistance,
        volumeProfile: sortedBins.slice(0, 5).map(b => ({ price: parseFloat(b[0]), volume: b[1] })),
        oiProfile: { current: mockOI, changePercent: mockOIChange }
    };
};
