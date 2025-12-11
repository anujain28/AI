import React, { useState } from 'react';
import { AppSettings, MarketSettings, Transaction } from '../types';
import { ActivityFeed } from './ActivityFeed';
import { Save, Wallet, LayoutGrid, Building2, Bell, TrendingUp, Cpu, Globe, DollarSign, Key, Zap, Check, Trash2, Bot, Power } from 'lucide-react';

interface PageConfigurationProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  transactions: Transaction[]; // For Auto Trade Feed
  activeBots: Record<string, boolean>;
  onToggleBot: (broker: string) => void;
}

type TabType = 'GENERAL' | 'MARKETS' | 'BROKERS' | 'AUTO_TRADE' | 'NOTIFICATIONS';

export const PageConfiguration: React.FC<PageConfigurationProps> = ({ settings, onSave, transactions, activeBots, onToggleBot }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [activeSubTab, setActiveSubTab] = useState<TabType>('GENERAL');

  const toggleBroker = (broker: any) => {
    setFormData(prev => {
      const isActive = prev.activeBrokers.includes(broker);
      const newBrokers = isActive 
        ? prev.activeBrokers.filter(b => b !== broker)
        : [...prev.activeBrokers, broker];
      return { ...prev, activeBrokers: newBrokers };
    });
  };

  const toggleMarket = (market: keyof MarketSettings) => {
      setFormData(prev => ({
          ...prev,
          enabledMarkets: {
              ...prev.enabledMarkets,
              [market]: !prev.enabledMarkets[market]
          }
      }));
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all data? This cannot be undone.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const tabs: {id: TabType, label: string, icon: React.ReactNode}[] = [
      { id: 'GENERAL', label: 'General', icon: <Wallet size={16}/> },
      { id: 'AUTO_TRADE', label: 'Auto-Trade', icon: <Bot size={16}/> },
      { id: 'MARKETS', label: 'Markets', icon: <LayoutGrid size={16}/> },
      { id: 'BROKERS', label: 'Brokers', icon: <Building2 size={16}/> },
      { id: 'NOTIFICATIONS', label: 'Alerts', icon: <Bell size={16}/> },
  ];

  return (
    <div className="p-4 pb-24 animate-fade-in flex flex-col h-full">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">Configuration</h1>
            <button onClick={() => onSave(formData)} className="px-4 py-2 bg-blue-600 rounded-lg text-white text-xs font-bold flex items-center gap-2 shadow-lg hover:bg-blue-500">
                <Save size={16}/> Save
            </button>
        </div>
        
        {/* Sub-Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
            {tabs.map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${activeSubTab === tab.id ? 'bg-slate-700 text-white border border-slate-600' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
                >
                    {tab.icon}
                    {tab.label}
                </button>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
            
            {/* === GENERAL TAB === */}
            {activeSubTab === 'GENERAL' && (
                <div className="space-y-6 animate-slide-up">
                    <section>
                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4">Paper Trading Funds</h3>
                        <div className="grid grid-cols-1 gap-3">
                            <div className="bg-surface p-4 rounded-xl border border-slate-800">
                                <label className="block text-xs text-slate-400 mb-2 font-bold">Equity (INR)</label>
                                <div className="relative">
                                    <TrendingUp size={14} className="absolute left-3 top-3 text-slate-500"/>
                                    <input type="number" value={formData.initialFunds.stock} onChange={(e) => setFormData({...formData, initialFunds: {...formData.initialFunds, stock: parseFloat(e.target.value)}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-9 pr-4 text-white focus:border-blue-500 outline-none text-sm font-mono"/>
                                </div>
                            </div>
                            {/* ...other fund inputs... */}
                        </div>
                    </section>
                     <button onClick={handleReset} className="w-full py-4 rounded-xl text-xs font-bold text-red-400 bg-red-900/10 border border-red-900/30 flex items-center justify-center gap-2">
                        <Trash2 size={14}/> Factory Reset App
                    </button>
                </div>
            )}

            {/* === AUTO TRADE TAB === */}
            {activeSubTab === 'AUTO_TRADE' && (
                <div className="space-y-6 animate-slide-up">
                    <section>
                         <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4">Bot Configuration</h3>
                         <div className="bg-surface p-4 rounded-xl border border-slate-800">
                            <label className="block text-xs text-slate-400 mb-3 font-bold">Trade Size</label>
                            <div className="flex gap-4 mb-4">
                                <label className="flex items-center gap-2 text-xs text-white p-2 bg-slate-900 rounded-lg flex-1 justify-center">
                                    <input type="radio" name="tradeMode" checked={formData.autoTradeConfig?.mode === 'PERCENTAGE'} onChange={() => setFormData({...formData, autoTradeConfig: { mode: 'PERCENTAGE', value: 5 }})} className="accent-blue-500" /> 
                                    Percentage
                                </label>
                                <label className="flex items-center gap-2 text-xs text-white p-2 bg-slate-900 rounded-lg flex-1 justify-center">
                                    <input type="radio" name="tradeMode" checked={formData.autoTradeConfig?.mode === 'FIXED'} onChange={() => setFormData({...formData, autoTradeConfig: { mode: 'FIXED', value: 10000 }})} className="accent-blue-500" /> 
                                    Fixed Amt
                                </label>
                            </div>
                            <input type="number" value={formData.autoTradeConfig?.value || 0} onChange={(e) => setFormData({...formData, autoTradeConfig: { ...formData.autoTradeConfig, value: parseFloat(e.target.value) }})} className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white font-mono"/>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4">Active Bots</h3>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {Object.keys(activeBots).map(broker => (
                                <button key={broker} onClick={() => onToggleBot(broker)} className={`p-3 rounded-lg border flex items-center justify-between ${activeBots[broker] ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-900 border-slate-800'}`}>
                                    <span className="text-xs font-bold text-white">{broker}</span>
                                    <Power size={14} className={activeBots[broker] ? 'text-green-400' : 'text-slate-600'} />
                                </button>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4">Activity Log</h3>
                        <div className="h-64">
                             <ActivityFeed transactions={transactions} />
                        </div>
                    </section>
                </div>
            )}

            {/* === MARKETS TAB === */}
            {activeSubTab === 'MARKETS' && (
                <div className="space-y-4 animate-slide-up">
                    {[
                        { id: 'stocks', label: 'Stocks (NSE)', icon: <TrendingUp size={20} className="text-blue-400"/> },
                        { id: 'mcx', label: 'Commodities', icon: <Globe size={20} className="text-yellow-400"/> },
                        { id: 'forex', label: 'Forex', icon: <DollarSign size={20} className="text-green-400"/> },
                        { id: 'crypto', label: 'Crypto', icon: <Cpu size={20} className="text-purple-400"/> }
                    ].map((m) => (
                        <button 
                            key={m.id} 
                            onClick={() => toggleMarket(m.id as keyof MarketSettings)}
                            className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between ${formData.enabledMarkets[m.id as keyof MarketSettings] ? 'bg-surface border-blue-500/50' : 'bg-slate-900/50 border-slate-800 opacity-60'}`}
                        >
                            <div className="flex items-center gap-3">
                                {m.icon}
                                <span className="font-bold text-white text-sm">{m.label}</span>
                            </div>
                            {formData.enabledMarkets[m.id as keyof MarketSettings] && <Check size={16} className="text-blue-500"/>}
                        </button>
                    ))}
                </div>
            )}

            {/* === BROKERS TAB (Expanded List) === */}
            {activeSubTab === 'BROKERS' && (
                <div className="space-y-4 animate-slide-up">
                    {['PAPER', 'DHAN', 'GROWW', 'SHOONYA', 'BINANCE', 'COINDCX', 'COINSWITCH', 'ZEBPAY'].map(broker => (
                         <div key={broker} className={`p-4 rounded-xl border ${formData.activeBrokers.includes(broker as any) ? 'bg-surface border-green-500/30' : 'bg-slate-900/50 border-slate-800'}`}>
                             <div className="flex justify-between items-center mb-2">
                                 <h4 className="font-bold text-white text-sm">{broker}</h4>
                                 <button onClick={() => toggleBroker(broker)} className={`w-8 h-4 rounded-full relative transition-colors ${formData.activeBrokers.includes(broker as any) ? 'bg-green-500' : 'bg-slate-600'}`}>
                                     <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${formData.activeBrokers.includes(broker as any) ? 'left-4.5' : 'left-0.5'}`}></div>
                                 </button>
                             </div>
                             {formData.activeBrokers.includes(broker as any) && broker !== 'PAPER' && (
                                 <input type="password" placeholder="API Key / Token" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white mt-2"/>
                             )}
                         </div>
                    ))}
                </div>
            )}

            {/* === NOTIFICATIONS TAB === */}
            {activeSubTab === 'NOTIFICATIONS' && (
                <div className="space-y-4 animate-slide-up">
                    <div className="bg-surface p-4 rounded-xl border border-slate-800">
                        <h3 className="text-xs font-bold text-white mb-4">Telegram Configuration</h3>
                        <div className="space-y-3">
                            <input type="text" value={formData.telegramBotToken} onChange={(e) => setFormData({...formData, telegramBotToken: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white" placeholder="Bot Token" />
                            <input type="text" value={formData.telegramChatId} onChange={(e) => setFormData({...formData, telegramChatId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white" placeholder="Chat ID" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};