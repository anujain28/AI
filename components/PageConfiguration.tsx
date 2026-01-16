
import React, { useState } from 'react';
import { AppSettings, MarketSettings, Transaction } from '../types';
import { Save, LayoutGrid, Building2, Bell, TrendingUp, Globe, DollarSign, Key, Check, Trash2, FileText } from 'lucide-react';

interface PageConfigurationProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  transactions: Transaction[]; 
  activeBots: Record<string, boolean>;
  onToggleBot: (broker: string) => void;
}

type TabType = 'PAPER' | 'STOCK_BROKERS' | 'MARKETS';

export const PageConfiguration: React.FC<PageConfigurationProps> = ({ settings, onSave, transactions, activeBots, onToggleBot }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [activeSubTab, setActiveSubTab] = useState<TabType>('PAPER');

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
    if (confirm("WARNING: This will delete ALL trades, portfolio history, settings, and login session. This cannot be undone.")) {
      const STORAGE_KEYS = [
        'aitrade_settings_v10',
        'aitrade_portfolio_v4',
        'aitrade_funds_v3', 
        'aitrade_transactions_v2',
        'aitrade_user_profile',
        'aitrade_last_run'
      ];
      STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
      localStorage.clear();
      window.location.reload();
    }
  };

  const tabs: {id: TabType, label: string, icon: React.ReactNode}[] = [
      { id: 'PAPER', label: 'Paper & Bot', icon: <FileText size={16}/> },
      { id: 'STOCK_BROKERS', label: 'Stock Brokers', icon: <Building2 size={16}/> },
      { id: 'MARKETS', label: 'Markets', icon: <LayoutGrid size={16}/> },
  ];

  return (
    <div className="p-4 pb-24 animate-fade-in flex flex-col h-full">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white">Configuration</h1>
            <button onClick={() => onSave(formData)} className="px-4 py-2 bg-blue-600 rounded-lg text-white text-xs font-bold flex items-center gap-2 shadow-lg hover:bg-blue-500">
                <Save size={16}/> Save
            </button>
        </div>
        
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
            
            {activeSubTab === 'PAPER' && (
                <div className="space-y-8 animate-slide-up">
                    <section className="bg-surface p-6 rounded-xl border border-slate-800 space-y-3">
                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Bell size={14}/> Telegram Alerts</h3>
                        <div>
                            <label className="block text-[10px] text-slate-400 mb-1 font-bold">Bot Token</label>
                            <input type="text" value={formData.telegramBotToken} onChange={(e) => setFormData({...formData, telegramBotToken: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none" placeholder="123456:ABC-..." />
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-400 mb-1 font-bold">Chat ID</label>
                            <input type="text" value={formData.telegramChatId} onChange={(e) => setFormData({...formData, telegramChatId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none" placeholder="-100..." />
                        </div>
                    </section>

                    <button onClick={handleReset} className="w-full py-4 rounded-xl text-xs font-bold text-red-400 bg-red-900/10 border border-red-900/30 flex items-center justify-center gap-2 mt-4 hover:bg-red-900/20 transition-all">
                        <Trash2 size={14}/> Factory Reset & Clear Data
                    </button>
                </div>
            )}

            {activeSubTab === 'STOCK_BROKERS' && (
                <div className="space-y-6 animate-slide-up">
                    <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                        <Key size={18} className="text-blue-400 flex-shrink-0 mt-0.5"/>
                        <p className="text-xs text-blue-200">
                            <strong>Local Storage Only:</strong> Credentials are saved securely in your browser.
                        </p>
                    </div>

                    <div className={`p-4 rounded-xl border transition-all ${formData.activeBrokers.includes('DHAN') ? 'bg-surface border-purple-500/50' : 'bg-surface/50 border-slate-800'}`}>
                         <div className="flex justify-between items-center mb-2">
                             <div className="flex items-center gap-2">
                                 <div className="p-1.5 bg-purple-500/20 rounded text-purple-400"><Building2 size={16}/></div>
                                 <h4 className="font-bold text-white text-sm">Dhan</h4>
                             </div>
                             <button onClick={() => toggleBroker('DHAN')} className={`w-8 h-4 rounded-full relative transition-colors ${formData.activeBrokers.includes('DHAN') ? 'bg-green-500' : 'bg-slate-600'}`}>
                                 <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${formData.activeBrokers.includes('DHAN') ? 'left-4.5' : 'left-0.5'}`}></div>
                             </button>
                         </div>
                         {formData.activeBrokers.includes('DHAN') && (
                             <div className="space-y-3 mt-4 animate-fade-in">
                                <div>
                                    <label className="text-[10px] text-slate-400 block mb-1">Client ID</label>
                                    <input type="text" placeholder="Enter Client ID" value={formData.dhanClientId || ''} onChange={(e) => setFormData({...formData, dhanClientId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-purple-500"/>
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-400 block mb-1">Access Token</label>
                                    <input type="password" placeholder="Enter Access Token" value={formData.dhanAccessToken || ''} onChange={(e) => setFormData({...formData, dhanAccessToken: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-purple-500"/>
                                </div>
                             </div>
                         )}
                    </div>

                     <div className={`p-4 rounded-xl border transition-all ${formData.activeBrokers.includes('SHOONYA') ? 'bg-surface border-orange-500/50' : 'bg-surface/50 border-slate-800'}`}>
                         <div className="flex justify-between items-center mb-2">
                             <div className="flex items-center gap-2">
                                 <div className="p-1.5 bg-orange-500/20 rounded text-orange-400"><Building2 size={16}/></div>
                                 <h4 className="font-bold text-white text-sm">Shoonya</h4>
                             </div>
                             <button onClick={() => toggleBroker('SHOONYA')} className={`w-8 h-4 rounded-full relative transition-colors ${formData.activeBrokers.includes('SHOONYA') ? 'bg-green-500' : 'bg-slate-600'}`}>
                                 <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${formData.activeBrokers.includes('SHOONYA') ? 'left-4.5' : 'left-0.5'}`}></div>
                             </button>
                         </div>
                         {formData.activeBrokers.includes('SHOONYA') && (
                             <div className="grid grid-cols-1 gap-3 mt-4 animate-fade-in">
                                <div><label className="text-[10px] text-slate-400 block mb-1">User ID</label><input type="text" value={formData.shoonyaUserId || ''} onChange={(e) => setFormData({...formData, shoonyaUserId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-orange-500"/></div>
                                <div><label className="text-[10px] text-slate-400 block mb-1">Password</label><input type="password" value={formData.shoonyaPassword || ''} onChange={(e) => setFormData({...formData, shoonyaPassword: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-orange-500"/></div>
                                <div><label className="text-[10px] text-slate-400 block mb-1">Vendor Code</label><input type="text" value={formData.shoonyaVendorCode || ''} onChange={(e) => setFormData({...formData, shoonyaVendorCode: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-orange-500"/></div>
                                <div><label className="text-[10px] text-slate-400 block mb-1">API Key</label><input type="password" value={formData.shoonyaApiKey || ''} onChange={(e) => setFormData({...formData, shoonyaApiKey: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-orange-500"/></div>
                             </div>
                         )}
                    </div>
                </div>
            )}

            {activeSubTab === 'MARKETS' && (
                <div className="space-y-4 animate-slide-up">
                    {[
                        { id: 'stocks', label: 'Stocks (NSE)', icon: <TrendingUp size={20} className="text-blue-400"/> },
                        { id: 'mcx', label: 'Commodities', icon: <Globe size={20} className="text-yellow-400"/> },
                        { id: 'forex', label: 'Forex', icon: <DollarSign size={20} className="text-green-400"/> }
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
        </div>
    </div>
  );
};
