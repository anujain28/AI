
import React, { useState } from 'react';
import { AppSettings, MarketSettings, Transaction } from '../types';
import { Save, Wallet, LayoutGrid, Building2, Bell, TrendingUp, Cpu, Globe, DollarSign, Key, Zap, Check, Trash2, Bot, Power, FileText } from 'lucide-react';

interface PageConfigurationProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  transactions: Transaction[]; // For Auto Trade Feed
  activeBots: Record<string, boolean>;
  onToggleBot: (broker: string) => void;
}

type TabType = 'PAPER' | 'STOCK_BROKERS' | 'CRYPTO_BROKERS' | 'MARKETS';

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
      // Explicitly clear all known keys
      const STORAGE_KEYS = [
        'aitrade_settings_v10',
        'aitrade_portfolio_v4',
        'aitrade_funds_v3', 
        'aitrade_transactions_v2',
        'aitrade_user_profile',
        'aitrade_last_run'
      ];
      STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
      
      // Clear everything else just in case
      localStorage.clear();
      
      // Force reload to clear memory state
      window.location.reload();
    }
  };

  const tabs: {id: TabType, label: string, icon: React.ReactNode}[] = [
      { id: 'PAPER', label: 'Paper & Bot', icon: <FileText size={16}/> },
      { id: 'STOCK_BROKERS', label: 'Stock Brokers', icon: <Building2 size={16}/> },
      { id: 'CRYPTO_BROKERS', label: 'Crypto Brokers', icon: <Cpu size={16}/> },
      { id: 'MARKETS', label: 'Markets', icon: <LayoutGrid size={16}/> },
  ];

  return (
    <div className="p-4 pb-24 animate-fade-in flex flex-col h-full">
        {/* Header and Save Button */}
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
            
            {/* === PAPER TAB === */}
            {activeSubTab === 'PAPER' && (
                <div className="space-y-8 animate-slide-up">
                    
                    {/* Auto Trade */}
                    <section className="bg-surface p-6 rounded-xl border border-slate-800">
                         <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Bot size={14}/> Auto-Trade Engine</h3>
                         
                         <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="font-bold text-white text-sm">Paper Bot Status</h4>
                                <p className="text-[10px] text-slate-500">AI Managed Portfolio</p>
                            </div>
                            <button onClick={() => onToggleBot('PAPER')} className={`p-2 rounded-lg border transition-colors ${activeBots['PAPER'] ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                                <Power size={18} />
                            </button>
                        </div>

                         <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                             <div className="flex items-start gap-3">
                                 <Zap size={16} className="text-yellow-400 flex-shrink-0 mt-0.5"/>
                                 <div>
                                     <h5 className="text-xs font-bold text-white mb-1">AI Smart Allocation</h5>
                                     <p className="text-[10px] text-slate-400 leading-relaxed">
                                         The bot automatically determines the optimal trade size based on the technical confidence score of each asset. 
                                         <br/><br/>
                                         <span className="text-slate-500">High Confidence (Score > 80):</span> <span className="text-green-400">Max Allocation</span><br/>
                                         <span className="text-slate-500">Medium Confidence:</span> <span className="text-yellow-400">Standard Allocation</span>
                                     </p>
                                 </div>
                             </div>
                         </div>
                    </section>
                    
                    {/* Telegram */}
                    <section className="pt-6 border-t border-slate-800">
                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Bell size={14}/> Telegram Alerts</h3>
                        <div className="bg-surface p-4 rounded-xl border border-slate-800 space-y-3">
                            <div>
                                <label className="block text-[10px] text-slate-400 mb-1 font-bold">Bot Token</label>
                                <input type="text" value={formData.telegramBotToken} onChange={(e) => setFormData({...formData, telegramBotToken: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none" placeholder="123456:ABC-..." />
                            </div>
                            <div>
                                <label className="block text-[10px] text-slate-400 mb-1 font-bold">Chat ID</label>
                                <input type="text" value={formData.telegramChatId} onChange={(e) => setFormData({...formData, telegramChatId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none" placeholder="-100..." />
                            </div>
                        </div>
                    </section>

                    <button onClick={handleReset} className="w-full py-4 rounded-xl text-xs font-bold text-red-400 bg-red-900/10 border border-red-900/30 flex items-center justify-center gap-2 mt-4 hover:bg-red-900/20 transition-all">
                        <Trash2 size={14}/> Factory Reset & Clear Data
                    </button>
                </div>
            )}

            {/* === STOCK BROKERS TAB === */}
            {activeSubTab === 'STOCK_BROKERS' && (
                <div className="space-y-6 animate-slide-up">
                    <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                        <Key size={18} className="text-blue-400 flex-shrink-0 mt-0.5"/>
                        <p className="text-xs text-blue-200">
                            <strong>Local Storage Only:</strong> Credentials are saved securely in your browser.
                        </p>
                    </div>

                    {/* DHAN */}
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

                    {/* SHOONYA */}
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

            {/* === CRYPTO BROKERS TAB === */}
            {activeSubTab === 'CRYPTO_BROKERS' && (
                <div className="space-y-6 animate-slide-up">
                    <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                        <Key size={18} className="text-blue-400 flex-shrink-0 mt-0.5"/>
                        <p className="text-xs text-blue-200">
                            <strong>Security:</strong> Crypto API keys often require IP whitelisting. Ensure your IP is allowed in exchange settings.
                        </p>
                    </div>

                    {/* COINDCX */}
                    <div className={`p-4 rounded-xl border transition-all ${formData.activeBrokers.includes('COINDCX') ? 'bg-surface border-blue-500/50' : 'bg-surface/50 border-slate-800'}`}>
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-500/20 rounded text-blue-400"><Cpu size={16}/></div>
                                <h4 className="font-bold text-white text-sm">CoinDCX</h4>
                            </div>
                            <button onClick={() => toggleBroker('COINDCX')} className={`w-8 h-4 rounded-full relative transition-colors ${formData.activeBrokers.includes('COINDCX') ? 'bg-green-500' : 'bg-slate-600'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${formData.activeBrokers.includes('COINDCX') ? 'left-4.5' : 'left-0.5'}`}></div>
                            </button>
                        </div>
                        {formData.activeBrokers.includes('COINDCX') && (
                            <div className="grid grid-cols-1 gap-3 mt-4 animate-fade-in">
                                <div><label className="text-[10px] text-slate-400 block mb-1">API Key</label><input type="text" value={formData.coindcxApiKey || ''} onChange={e => setFormData({...formData, coindcxApiKey: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-blue-500"/></div>
                                <div><label className="text-[10px] text-slate-400 block mb-1">Secret Key</label><input type="password" value={formData.coindcxSecret || ''} onChange={e => setFormData({...formData, coindcxSecret: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-blue-500"/></div>
                            </div>
                        )}
                    </div>

                    {/* BINANCE */}
                    <div className={`p-4 rounded-xl border transition-all ${formData.activeBrokers.includes('BINANCE') ? 'bg-surface border-yellow-500/50' : 'bg-surface/50 border-slate-800'}`}>
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-yellow-500/20 rounded text-yellow-400"><Cpu size={16}/></div>
                                <h4 className="font-bold text-white text-sm">Binance</h4>
                            </div>
                            <button onClick={() => toggleBroker('BINANCE')} className={`w-8 h-4 rounded-full relative transition-colors ${formData.activeBrokers.includes('BINANCE') ? 'bg-green-500' : 'bg-slate-600'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${formData.activeBrokers.includes('BINANCE') ? 'left-4.5' : 'left-0.5'}`}></div>
                            </button>
                        </div>
                        {formData.activeBrokers.includes('BINANCE') && (
                            <div className="grid grid-cols-1 gap-3 mt-4 animate-fade-in">
                                <div><label className="text-[10px] text-slate-400 block mb-1">API Key</label><input type="text" value={formData.binanceApiKey || ''} onChange={e => setFormData({...formData, binanceApiKey: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-yellow-500"/></div>
                                <div><label className="text-[10px] text-slate-400 block mb-1">Secret Key</label><input type="password" value={formData.binanceSecret || ''} onChange={e => setFormData({...formData, binanceSecret: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-yellow-500"/></div>
                            </div>
                        )}
                    </div>

                    {/* ZEBPAY */}
                    <div className={`p-4 rounded-xl border transition-all ${formData.activeBrokers.includes('ZEBPAY') ? 'bg-surface border-sky-500/50' : 'bg-surface/50 border-slate-800'}`}>
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-sky-500/20 rounded text-sky-400"><Cpu size={16}/></div>
                                <h4 className="font-bold text-white text-sm">Zebpay</h4>
                            </div>
                            <button onClick={() => toggleBroker('ZEBPAY')} className={`w-8 h-4 rounded-full relative transition-colors ${formData.activeBrokers.includes('ZEBPAY') ? 'bg-green-500' : 'bg-slate-600'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${formData.activeBrokers.includes('ZEBPAY') ? 'left-4.5' : 'left-0.5'}`}></div>
                            </button>
                        </div>
                        {formData.activeBrokers.includes('ZEBPAY') && (
                            <div className="mt-4 animate-fade-in">
                                <div><label className="text-[10px] text-slate-400 block mb-1">API Key</label><input type="text" value={formData.zebpayApiKey || ''} onChange={e => setFormData({...formData, zebpayApiKey: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-sky-500"/></div>
                            </div>
                        )}
                    </div>

                    {/* COINSWITCH */}
                    <div className={`p-4 rounded-xl border transition-all ${formData.activeBrokers.includes('COINSWITCH') ? 'bg-surface border-teal-500/50' : 'bg-surface/50 border-slate-800'}`}>
                        <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-teal-500/20 rounded text-teal-400"><Cpu size={16}/></div>
                                <h4 className="font-bold text-white text-sm">CoinSwitch</h4>
                            </div>
                            <button onClick={() => toggleBroker('COINSWITCH')} className={`w-8 h-4 rounded-full relative transition-colors ${formData.activeBrokers.includes('COINSWITCH') ? 'bg-green-500' : 'bg-slate-600'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${formData.activeBrokers.includes('COINSWITCH') ? 'left-4.5' : 'left-0.5'}`}></div>
                            </button>
                        </div>
                        {formData.activeBrokers.includes('COINSWITCH') && (
                            <div className="mt-4 animate-fade-in">
                                <div><label className="text-[10px] text-slate-400 block mb-1">API Key</label><input type="text" value={formData.coinswitchApiKey || ''} onChange={e => setFormData({...formData, coinswitchApiKey: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white outline-none focus:border-teal-500"/></div>
                            </div>
                        )}
                    </div>
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
        </div>
    </div>
  );
};
