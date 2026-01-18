
import { Candle, StrategyRules, BacktestResult, BacktestTrade, AppSettings } from "../types";
import { fetchRealStockData } from "./marketDataService";
import { analyzeStockTechnical } from "./technicalAnalysis";

const INITIAL_CAPITAL = 100000;
const FLAT_BROKERAGE = 20;

export const runBacktest = async (
    symbols: string[],
    rules: StrategyRules,
    settings: AppSettings,
    interval: string = "5m",
    range: string = "5d",
    onProgress?: (progress: number) => void
): Promise<BacktestResult> => {
    let currentCapital = INITIAL_CAPITAL;
    const trades: BacktestTrade[] = [];
    const equityCurve: { time: string; value: number }[] = [];
    
    let processed = 0;
    for (const symbol of symbols) {
        const data = await fetchRealStockData(symbol, settings, interval, range);
        if (!data || data.history.length < 50) {
            processed++;
            continue;
        }

        const candles = data.history;
        let position: { entryPrice: number; entryTime: number; quantity: number } | null = null;

        for (let i = 30; i < candles.length; i++) {
            const historySlice = candles.slice(0, i + 1);
            const currentCandle = candles[i];
            const tech = analyzeStockTechnical(historySlice);
            
            if (position) {
                const pnlPercent = ((currentCandle.close - position.entryPrice) / position.entryPrice) * 100;
                const atr = tech.atr || (currentCandle.close * 0.02);
                
                let shouldExit = false;
                let exitReason = "";

                // ATR-Based Trailing stop
                const stopPrice = position.entryPrice - (atr * rules.atrStopMult);
                const targetPrice = position.entryPrice + (atr * rules.atrTargetMult);

                if (currentCandle.close < stopPrice) {
                    shouldExit = true;
                    exitReason = "Stop Loss (ATR)";
                } else if (currentCandle.close > targetPrice) {
                    shouldExit = true;
                    exitReason = "Take Profit (ATR)";
                } else if (i === candles.length - 1) {
                    shouldExit = true;
                    exitReason = "End of Backtest";
                }

                if (shouldExit) {
                    const proceeds = (currentCandle.close * position.quantity) - FLAT_BROKERAGE;
                    const pnl = proceeds - ((position.entryPrice * position.quantity) + FLAT_BROKERAGE);
                    
                    trades.push({
                        symbol,
                        entryTime: position.entryTime,
                        exitTime: currentCandle.time,
                        entryPrice: position.entryPrice,
                        exitPrice: currentCandle.close,
                        quantity: position.quantity,
                        pnl,
                        pnlPercent: (pnl / (position.entryPrice * position.quantity)) * 100,
                        exitReason
                    });
                    
                    currentCapital += pnl;
                    position = null;
                }
            } 
            else {
                // Entry logic matching the Idea Engine (Score > 40, ADX > Threshold)
                const isStrong = tech.score >= 40;
                const hasTrend = tech.adx > rules.rsiBuyZone;
                
                // Aligning with the 1% hurdle logic implicitly via ATR check
                const atr = tech.atr || (currentCandle.close * 0.012);
                const projectedROI = (atr * 3.5) / currentCandle.close * 100;

                if (isStrong && hasTrend && projectedROI >= 1.0) {
                    const budget = currentCapital * 0.1;
                    const qty = Math.floor(budget / currentCandle.close);
                    
                    if (qty > 0) {
                        position = {
                            entryPrice: currentCandle.close,
                            entryTime: currentCandle.time,
                            quantity: qty
                        };
                    }
                }
            }

            if (i % 20 === 0 || i === candles.length - 1) {
                equityCurve.push({
                    time: new Date(currentCandle.time).toLocaleDateString(),
                    value: currentCapital
                });
            }
        }
        
        processed++;
        if (onProgress) onProgress(Math.round((processed / symbols.length) * 100));
    }

    const wins = trades.filter(t => t.pnl > 0).length;
    const totalTrades = trades.length;
    
    let peak = INITIAL_CAPITAL;
    let maxDD = 0;
    equityCurve.forEach(p => {
        if (p.value > peak) peak = p.value;
        const dd = peak > 0 ? (peak - p.value) / peak : 0;
        if (dd > maxDD) maxDD = dd;
    });

    return {
        totalPnl: currentCapital - INITIAL_CAPITAL,
        winRate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
        totalTrades,
        maxDrawdown: maxDD * 100,
        trades: trades.sort((a,b) => b.exitTime - a.exitTime),
        equityCurve
    };
};
