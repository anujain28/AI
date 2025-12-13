import { StockRecommendation, MarketSettings, PortfolioItem, HoldingAnalysis, MarketData, AppSettings, AssetType } from "../types";
import { getCompanyName, getUniverseByType, NSE_UNIVERSE } from "./stockListService";
import { fetchRealStockData, fetchMultipleSymbols } from "./marketDataService";

// ✅ Shuffle helper (unchanged)
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// 🚀 PERFECTLY COMPATIBLE fetchTopStockPicks - Enhanced for new systems
export const fetchTopStockPicks = async (
    totalCapital: number, 
    stockUniverse: string[] = [], 
    markets: MarketSettings = { stocks: true, mcx: false, forex: false, crypto: false }
): Promise<StockRecommendation[]> => {
  
    const picks: StockRecommendation[] = [];
    const dummySettings: AppSettings = {
        initialFunds: { stock: 0, mcx: 0, forex: 0, crypto: 0 },
        autoTradeConfig: { mode: 'FIXED', value: 0 },
        activeBrokers: [],
        enabledMarkets: markets,
        telegramBotToken: '',
        telegramChatId: ''
    };

    // 1. STOCKS - Use new universe system [memory:16]
    if (markets.stocks) {
        // Auto-use Nifty 100 if no universe provided
        const universe = stockUniverse.length > 0 ? stockUniverse : NSE_UNIVERSE.slice(0, 100);
        
        // Scan 50 random candidates for best picks
        const candidates = shuffleArray([...universe]).slice(0, 50);
        
        // BATCH FETCH for efficiency (new feature!)
        const batchData = await fetchMultipleSymbols(candidates, dummySettings);
        
        const stockCandidates = Object.entries(batchData)
            .map(([sym, data]) => ({ sym, data }))
            .filter(({ data }) => data && data.technicals?.score && data.technicals.score >= 45);

        stockCandidates.forEach(({ sym, data }) => {
            const { technicals, price } = data;
            
            // ✅ HIGH-PROFIT FILTERS (Updated for new technicals)
            let type: 'INTRADAY' | 'BTST' | 'WEEKLY' | 'MONTHLY' | null = null;
            let reason = "";
            let pattern = "Trend Following";

            // Priority signals (matches new high-profit algo)
            if (technicals.signalStrength === '🚀 STRONG BUY') {
                type = 'BTST';
                reason = `🚀 STRONG BUY (${technicals.profitPotential?.toFixed(1)}% potential)`;
                pattern = "Elite Momentum";
            } 
            else if (technicals.supertrend?.direction === 1 && technicals.adx > 25) {
                type = 'INTRADAY';
                reason = `SuperTrend Bull (ADX ${technicals.adx.toFixed(0)})`;
                pattern = "Trend Breakout";
            }
            else if (technicals.rsi < 35 && technicals.ema.ema9 > technicals.ema.ema21) {
                type = 'MONTHLY';
                reason = `Oversold Reversal (RSI ${technicals.rsi.toFixed(0)})`;
                pattern = "Dip Buy";
            }
            else if (technicals.macd.histogram > 0 && technicals.macd.macd > technicals.macd.signal) {
                type = 'BTST';
                reason = `MACD Bullish (${technicals.activeSignals[0] || ''})`;
                pattern = "Momentum Swing";
            }
            else if (technicals.bollinger.percentB < 0.2) {
                type = 'WEEKLY';
                reason = `BB Support (${technicals.bollinger.percentB.toFixed(1)})`;
                pattern = "Volatility Squeeze";
            }
            else if (technicals.score > 75) {
                type = 'WEEKLY';
                reason = `Strong Score ${technicals.score.toFixed(0)}`;
                pattern = "Technical Strength";
            }

            if (type) {
                // ✅ DYNAMIC TARGETS (ATR + Profit Filter)
                const atr = technicals.atr || (price * 0.02);
                let targetMultiplier = type === 'INTRADAY' ? 1.5 : 2.5;
                const target = price + (atr * targetMultiplier);
                const profitPct = ((target - price) / price) * 100;
                
                // STRICT 3%+ PROFIT FILTER (No small profits!)
                if (profitPct >= 3.0) {
                    picks.push({
                        symbol: sym,
                        name: getCompanyName(sym),
                        type: 'STOCK',
                        sector: 'Equity',
                        currentPrice: parseFloat(price.toFixed(2)),
                        reason,
                        riskLevel: type === 'INTRADAY' ? 'High' : 'Medium',
                        targetPrice: parseFloat(target.toFixed(2)),
                        lotSize: 1,
                        timeframe: type,
                        chartPattern: pattern
                    });
                }
            }
        });

        // Sort stocks by score (highest first)
        picks.sort((a, b) => {
            const dataA = batchData[a.symbol];
            const dataB = batchData[b.symbol];
            return (dataB?.technicals.score || 0) - (dataA?.technicals.score || 0);
        });
    }

    // 2. CRYPTO - Top 6 with profit filter
    if (markets.crypto) {
        const cryptoUniverse = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 'ADA/USDT'];
        const cryptoData = await fetchMultipleSymbols(cryptoUniverse, dummySettings);
        
        Object.entries(cryptoData).forEach(([sym, data]) => {
            if (!data || !data.technicals) return;
            
            const { technicals, price } = data;
            if (technicals.score < 55) return; // Filter weak cryptos
            
            const atr = technicals.atr || (price * 0.05); // Higher crypto vol
            const direction = technicals.signalStrength?.includes('BUY') ? 1 : -1;
            const target = price + (atr * 2 * direction);
            const profitPct = Math.abs((target - price) / price) * 100;
            
            if (profitPct >= 4.0) { // Higher crypto threshold
                picks.push({
                    symbol: sym,
                    name: getCompanyName(sym),
                    type: 'CRYPTO',
                    sector: 'Digital Asset',
                    currentPrice: parseFloat(price.toFixed(2)),
                    reason: `${technicals.signalStrength} - ${technicals.profitPotential?.toFixed(1)}%`,
                    riskLevel: 'Very High',
                    targetPrice: parseFloat(target.toFixed(2)),
                    lotSize: sym === 'BTC/USDT' ? 0.01 : 1,
                    timeframe: 'INTRADAY',
                    chartPattern: technicals.activeSignals?.[0] || "High Volatility"
                });
            }
        });
    }

    // 3. MCX Commodities
    if (markets.mcx) {
        const mcxUniverse = ['GOLD', 'SILVER', 'CRUDEOIL', 'NATURALGAS', 'COPPER'];
        const mcxData = await fetchMultipleSymbols(mcxUniverse, dummySettings);
        
        Object.entries(mcxData).forEach(([sym, data]) => {
            if (!data || !data.technicals?.score || data.technicals.score < 60) return;
            
            const { technicals, price } = data;
            const atr = technicals.atr || (price * 0.015);
            const target = price + (atr * 2.5);
            const profitPct = ((target - price) / price) * 100;
            
            if (profitPct >= 2.5) {
                picks.push({
                    symbol: sym,
                    name: getCompanyName(sym),
                    type: 'MCX',
                    sector: 'Commodity',
                    currentPrice: parseFloat(price.toFixed(2)),
                    reason: `${technicals.signalStrength} Trend`,
                    riskLevel: 'Medium',
                    targetPrice: parseFloat(target.toFixed(2)),
                    lotSize: 1,
                    timeframe: 'WEEKLY',
                    chartPattern: technicals.activeSignals?.[0] || "Commodity Trend"
                });
            }
        });
    }

    // 4. FOREX (Always add top pairs)
    if (markets.forex) {
        const forexUniverse = ['USDINR', 'EURINR', 'GBPINR'];
        const forexData = await fetchMultipleSymbols(forexUniverse, dummySettings);
        
        Object.entries(forexData).forEach(([sym, data]) => {
            if (!data) return;
            
            const { technicals, price } = data;
            const atr = technicals.atr || (price * 0.003);
            const target = price + (atr * 3); // Forex pip targets
            
            picks.push({
                symbol: sym,
                name: getCompanyName(sym),
                type: 'FOREX',
                sector: 'Currency',
                currentPrice: parseFloat(price.toFixed(4)),
                reason: `Score ${technicals.score?.toFixed(0)} - ${technicals.signalStrength}`,
                riskLevel: 'High',
                targetPrice: parseFloat(target.toFixed(4)),
                lotSize: 1000,
                timeframe: 'INTRADAY',
                chartPattern: "Pip Momentum"
            });
        });
    }

    // ✅ Final sort by profit potential + technical score
    return picks.sort((a, b) => {
        const dataA = picks.find(p => p.symbol === a.symbol);
        const dataB = picks.find(p => p.symbol === b.symbol);
        const scoreA = dataA ? (batchData[a.symbol]?.technicals.score || 0) : 0;
        const scoreB = dataB ? (batchData[b.symbol]?.technicals.score || 0) : 0;
        return scoreB - scoreA;
    });
};

// ✅ COMPATIBLE analyzeHoldings - Enhanced
export const analyzeHoldings = async (
    holdings: PortfolioItem[], 
    marketData: MarketData
): Promise<HoldingAnalysis[]> => {
    return holdings.map(h => {
        const data = marketData[h.symbol];
        if (!data || !data.technicals) {
            return {
                symbol: h.symbol,
                action: 'HOLD',
                reason: 'No live data',
                targetPrice: h.avgCost || 0,
                dividendYield: '0.00%',
                cagr: 'N/A'
            };
        }

        const { technicals, price } = data;
        const atr = technicals.atr || (price * 0.02);
        
        let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let reason = technicals.signalStrength || 'Neutral';

        // Enhanced logic using new signals
        if (technicals.signalStrength?.includes('STRONG BUY') || technicals.signalStrength === '✅ BUY') {
            action = 'BUY';
            reason = `Add: ${technicals.activeSignals?.[0] || reason}`;
        } 
        else if (technicals.signalStrength?.includes('SELL') || technicals.rsi > 75) {
            action = 'SELL';
            reason = `Exit: ${technicals.activeSignals?.[0] || reason}`;
        }
        else if (price > h.avgCost * 1.10) { // 10% profit
            action = 'SELL';
            reason = 'Take Profits (10%+ gain)';
        }

        const target = action === 'BUY' 
            ? price + (atr * 2) 
            : action === 'SELL' 
            ? price - (atr * 1.5) 
            : h.avgCost;

        return {
            symbol: h.symbol,
            action,
            reason,
            targetPrice: parseFloat(target.toFixed(2)),
            dividendYield: '0.00%',
            cagr: 'N/A'
        };
    });
};
