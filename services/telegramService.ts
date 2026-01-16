
import { PortfolioItem, Funds } from "../types";

export const generatePNLReport = (
  portfolio: PortfolioItem[],
  currentFunds: Funds,
  initialFunds: Funds,
  marketData: any
): string => {
  const portfolioValue = portfolio.reduce((acc, item) => {
    const price = marketData[item.symbol]?.price || item.avgCost;
    return acc + (price * item.quantity);
  }, 0);

  // Updated to include crypto in total cash calculation
  const totalCurrentCash = currentFunds.stock + currentFunds.mcx + currentFunds.forex + (currentFunds.crypto || 0);
  const totalInitial = initialFunds.stock + initialFunds.mcx + initialFunds.forex + (initialFunds.crypto || 0);

  const totalEquity = totalCurrentCash + portfolioValue;
  const totalPNL = totalEquity - totalInitial;
  const pnlPercent = totalInitial > 0 ? (totalPNL / totalInitial) * 100 : 0;
  const date = new Date().toLocaleString();

  let report = `📊 *AI-Trade Pro PNL Report*\n📅 ${date}\n\n`;
  report += `💰 *Total Equity:* ₹${totalEquity.toFixed(2)}\n`;
  report += `💵 *Total Cash:* ₹${totalCurrentCash.toFixed(2)}\n`;
  report += `   • Equity: ₹${currentFunds.stock.toFixed(0)}\n`;
  report += `   • MCX: ₹${currentFunds.mcx.toFixed(0)}\n`;
  report += `   • Forex: ₹${currentFunds.forex.toFixed(0)}\n`;
  report += `   • Crypto: ₹${(currentFunds.crypto || 0).toFixed(0)}\n`;
  report += `📈 *Total PNL:* ₹${totalPNL.toFixed(2)} (${pnlPercent.toFixed(2)}%)\n\n`;
  
  if (portfolio.length > 0) {
    report += `*Open Positions:*\n`;
    portfolio.forEach(p => {
        const price = marketData[p.symbol]?.price || p.avgCost;
        const val = price * p.quantity;
        const itemPnl = val - p.totalCost;
        report += `• ${p.symbol} (${p.type}): ₹${itemPnl.toFixed(2)} (${((itemPnl/p.totalCost)*100).toFixed(1)}%)\n`;
    });
  } else {
    report += `_No open positions._`;
  }

  return report;
};

export const sendTelegramMessage = async (token: string, chatId: string, message: string): Promise<boolean> => {
  if (!token || !chatId) return false;
  
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });
    return response.ok;
  } catch (error) {
    console.error("Telegram send failed", error);
    return false;
  }
};
