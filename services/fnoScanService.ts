
import { StockData, StockRecommendation, AppSettings } from "../types";
import { performRobotAnalysis } from "./recommendationEngine";

export const getFnoTechnicalRecommendations = async (marketSnapshots: Record<string, StockData>): Promise<StockRecommendation[]> => {
  const recommendations: StockRecommendation[] = [];

  Object.entries(marketSnapshots).forEach(([symbol, data]) => {
    const analysis = performRobotAnalysis(data.technicals, data.price);
    
    // F&O Specialized Filter: Require strong trend (ADX > 20) and Volume
    if (analysis.score >= 50 && data.technicals.adx > 20) {
      const atr = data.technicals.atr || (data.price * 0.015);
      const targetPrice = data.price + (atr * 3);
      
      recommendations.push({
        symbol: symbol,
        name: symbol.split('.')[0],
        type: 'STOCK',
        sector: 'F&O Segment',
        currentPrice: data.price,
        reason: analysis.reason,
        riskLevel: analysis.score > 90 ? 'Low' : 'Medium',
        targetPrice,
        profitPercent: ((targetPrice - data.price) / data.price) * 100,
        timeframe: data.technicals.rvol > 2.0 ? 'INTRADAY' : 'BTST',
        score: analysis.score,
        lotSize: 1,
        isTopPick: analysis.score >= 100
      });
    }
  });

  // Return Best 5 recommendations based on quantitative intensity
  return recommendations
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5);
};
