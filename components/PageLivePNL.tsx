// app/page.tsx (or wherever Live PNL tab is rendered)
import { LivePnl } from '@/components/LivePnl';

export default function LivePnlPage() {
  const brokerCash = [
    { name: 'DHAN', amount: 0 },
    { name: 'GROWW', amount: 120000 },
    { name: 'SHOONYA', amount: 0 },
    { name: 'BINANCE', amount: 0 },
    { name: 'COINDCX', amount: 0 },
    { name: 'COINSWITCH', amount: 0 },
    { name: 'ZEBPAY', amount: 0 },
  ];

  const positions = [
    {
      symbol: 'TATASTEEL',
      type: 'EQ',
      broker: 'DHAN',
      qty: 150,
      avgCost: 142.5,
      current: 171.89,
      pnl: 4408.5,
      pnlPct: 20.62,
      aiInsight: 'Trend intact; trail SL near recent swing low.',
    },
    {
      symbol: 'GOLD',
      type: 'FUT',
      broker: 'DHAN',
      qty: 1,
      avgCost: 71500,
      current: 4371.2,
      pnl: -67128.8,
      pnlPct: -93.89,
      aiInsight: 'Deep drawdown; evaluate exit or hedge.',
    },
    {
      symbol: 'ZOMATO',
      type: 'EQ',
      broker: 'GROWW',
      qty: 500,
      avgCost: 160,
      current: 160.23,
      pnl: 115.74,
      pnlPct: 0.14,
      aiInsight: 'Sideways; wait for stronger signal.',
    },
  ];

  return (
    <LivePnl
      livePnl={-62605}
      livePnlPct={-36.21}
      totalInvested={172875}
      currentValue={110270}
      brokerCash={brokerCash}
      positions={positions}
    />
  );
}
