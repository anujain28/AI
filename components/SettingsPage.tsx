import React, { useState } from 'react';
import { AppSettings, MarketSettings } from '../types';
import { Save, Settings, Wallet, LayoutGrid, Building2, Bell, TrendingUp, Cpu, Globe, DollarSign, Key, Send, Check, Trash2, ArrowLeft, Zap } from 'lucide-react';

interface SettingsPageProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onBack: () => void;
}

type TabType = 'GENERAL' | 'MARKETS' | 'BROKERS' | 'NOTIFICATIONS';

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onSave, onBack }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<TabType>('GENERAL');

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

  const handleSave = () => {
      onSave(formData);
  };

  const tabs: {id: TabType, label: string, icon: React.ReactNode}[] = [
      { id: 'GENERAL', label: 'Capital & Bots', icon: <Wallet size={16}/> },
      { id: 'MARKETS', label: 'Markets', icon: <LayoutGrid size={16}/> },
      { id: 'BROKERS', label: 'Broker Connections', icon: <Building2 size={16}/> },
      { id: 'NOTIFICATIONS', label: 'Notifications', icon: <Bell size={16}/> },
  ];

  return (
    <div className="flex flex-col md:flex-row h-full bg-background animate-fade-in">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 bg-slate-900/50 border-b md:border-b-0 md:border-r border-slate-700 p-4 flex flex-col flex-shrink-0">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft size={18} />
                <span className="text-sm font-bold">Back to Dashboard</span>
            </button>
            
            <div className="flex items-center gap-2 mb-6 px-2">
                <div className="p-2 bg-blue-600 rounded-lg"><Settings size={20} className="text-white"/></div>
                <h2 className="text-lg font-bold text-white">Configuration</h2>
            </div>
            
            <div className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible no-scrollbar pb-2 md:pb-0">
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="mt-auto hidden md:block pt-6 border-t border-slate-800 space-y-3">
                <button onClick={handleSave} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all">
                    <Save size={18}/> Save Changes
                </button>
                <button onClick={handleReset} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-900/20 transition-all">
                    <Trash2 size={16}/> Reset App
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pb-24 md:pb-8">
            <div className="max-w-3xl mx-auto space-y-6">
                
                {/* Header for Mobile */}
                <div className="md:hidden flex justify-between items-center mb-4">
                     <h2 className="text-xl font-bold text-white">{tabs.find(t=>t.id===activeTab)?.label}</h2>
                     <button onClick={handleSave} className="p-2 bg-blue-600 rounded-full text-white shadow-lg"><Save size={20}/></button>
                </div>

                {/* === GENERAL TAB === */}
                {activeTab === 'GENERAL' && (
                    <div className="space-y-8 animate-slide-up">
                        <section>
                            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Wallet size={16}/> Paper Trading Capital</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-surface p-4 rounded-xl border border-slate-700">
                                    <label className="block text-xs text-slate-400 mb-2 font-bold">Equity (INR)</label>
                                    <div className="relative">
                                        <TrendingUp size={14} className="absolute left-3 top-3 text-slate-500"/>
                                        <input type="number" value={formData.initialFunds.stock} onChange={(e) => setFormData({...formData, initialFunds: {...formData.initialFunds, stock: parseFloat(e.target.value)}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-9 pr-4 text-white focus:border-blue-500 outline-none text-sm font-mono"/>
                                    </div>
                                </div>
                                <div className="bg-surface p-4 rounded-xl border border-slate-700">
                                    <label className="block text-xs text-slate-400 mb-2 font-bold">Crypto (INR)</label>
                                    <div className="relative">
                                        <Cpu size={14} className="absolute left-3 top-3 text-slate-500"/>
                                        <input type="number" value={formData.initialFunds.crypto || 500000} onChange={(e) => setFormData({...formData, initialFunds: {...formData.initialFunds, crypto: parseFloat(e.target.value)}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-9 pr-4 text-white focus:border-purple-500 outline-none text-sm font-mono"/>
                                    </div>
                                </div>
                                <div className="bg-surface p-4 rounded-xl border border-slate-700">
                                    <label className="block text-xs text-slate-400 mb-2 font-bold">MCX Commodities (INR)</label>
                                    <div className="relative">
                                        <Globe size={14} className="absolute left-3 top-3 text-slate-500"/>
                                        <input type="number" value={formData.initialFunds.mcx} onChange={(e) => setFormData({...formData, initialFunds: {...formData.initialFunds, mcx: parseFloat(e.target.value)}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-9 pr-4 text-white focus:border-yellow-500 outline-none text-sm font-mono"/>
                                    </div>
                                </div>
                                <div className="bg-surface p-4 rounded-xl border border-slate-700">
                                    <label className="block text-xs text-slate-400 mb-2 font-bold">Forex (INR)</label>
                                    <div className="relative">
                                        <DollarSign size={14} className="absolute left-3 top-3 text-slate-500"/>
                                        <input type="number" value={formData.initialFunds.forex} onChange={(e) => setFormData({...formData, initialFunds: {...formData.initialFunds, forex: parseFloat(e.target.value)}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-9 pr-4 text-white focus:border-green-500 outline-none text-sm font-mono"/>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="pt-6 border-t border-slate-700">
                            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Zap size={16}/> Auto-Trade Bot Config</h3>
                            <div className="bg-surface p-6 rounded-xl border border-slate-700">
                                <label className="block text-xs text-slate-400 mb-3 font-bold">Trade Sizing Strategy</label>
                                <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-4">
                                    <label className="flex items-center gap-2 text-sm text-white cursor-pointer hover:text-blue-400 p-2 bg-slate-900 rounded-lg border border-slate-800 flex-1">
                                        <input type="radio" name="tradeMode" checked={formData.autoTradeConfig?.mode === 'PERCENTAGE'} onChange={() => setFormData({...formData, autoTradeConfig: { mode: 'PERCENTAGE', value: 5 }})} className="accent-blue-500 w-4 h-4" /> 
                                        Percentage of Fund (%)
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-white cursor-pointer hover:text-blue-400 p-2 bg-slate-900 rounded-lg border border-slate-800 flex-1">
                                        <input type="radio" name="tradeMode" checked={formData.autoTradeConfig?.mode === 'FIXED'} onChange={() => setFormData({...formData, autoTradeConfig: { mode: 'FIXED', value: 10000 }})} className="accent-blue-500 w-4 h-4" /> 
                                        Fixed Amount (INR)
                                    </label>
                                </div>
                                
                                <div className="relative">
                                    <input type="number" value={formData.autoTradeConfig?.value || 0} onChange={(e) => setFormData({...formData, autoTradeConfig: { ...formData.autoTradeConfig, value: parseFloat(e.target.value) }})} className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white focus:border-blue-500 outline-none text-lg font-mono"/>
                                    <span className="absolute right-4 top-3 text-slate-500 font-mono">
                                        {formData.autoTradeConfig?.mode === 'PERCENTAGE' ? '%' : 'INR'}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2">
                                    {formData.autoTradeConfig?.mode === 'PERCENTAGE' 
                                        ? "Bot will use this % of available funds per trade." 
                                        : "Bot will use this fixed INR amount per trade."}
                                </p>
                            </div>
                        </section>
                    </div>
                )}

                {/* === MARKETS TAB === */}
                {activeTab === 'MARKETS' && (
                    <div className="space-y-6 animate-slide-up">
                        <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Globe size={16}/> Enabled Asset Classes</h3>
                        <p className="text-xs text-slate-400 mb-6">Select which markets you want to track and trade. Disabling a market will hide it from the dashboard.</p>
                        
                        <div className="grid grid-cols-1 gap-4">
                            {[
                                { id: 'stocks', label: 'Indian Stocks (NSE)', icon: <TrendingUp size={24} className="text-blue-400"/>, desc: 'Equity Market' },
                                { id: 'mcx', label: 'MCX Commodities', icon: <Globe size={24} className="text-yellow-400"/>, desc: 'Gold, Silver, Crude' },
                                { id: 'forex', label: 'Forex Trading', icon: <DollarSign size={24} className="text-green-400"/>, desc: 'USD/INR, EUR/USD' },
                                { id: 'crypto', label: 'Cryptocurrencies', icon: <Cpu size={24} className="text-purple-400"/>, desc: 'Bitcoin, Ethereum' }
                            ].map((m) => (
                                <button 
                                    key={m.id} 
                                    onClick={() => toggleMarket(m.id as keyof MarketSettings)}
                                    className={`relative p-5 rounded-xl border text-left transition-all flex items-center justify-between group ${formData.enabledMarkets[m.id as keyof MarketSettings] ? 'bg-surface border-blue-500/50 shadow-lg shadow-blue-500/10' : 'bg-surface/50 border-slate-700 opacity-60 hover:opacity-100'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-lg ${formData.enabledMarkets[m.id as keyof MarketSettings] ? 'bg-slate-900' : 'bg-slate-800'}`}>{m.icon}</div>
                                        <div>
                                            <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors">{m.label}</h4>
                                            <p className="text-xs text-slate-500">{m.desc}</p>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${formData.enabledMarkets[m.id as keyof MarketSettings] ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-600'}`}>
                                        {formData.enabledMarkets[m.id as keyof MarketSettings] && <Check size={14}/>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* === BROKERS TAB === */}
                {activeTab === 'BROKERS' && (
                    <div className="space-y-8 animate-slide-up">
                        <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                            <Key size={18} className="text-blue-400 flex-shrink-0 mt-0.5"/>
                            <p className="text-xs text-blue-200">
                                <strong>Secure Connection:</strong> API Keys and credentials are stored strictly in your browser's local storage. They are never sent to our servers.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {/* PAPER TRADING */}
                            <div className={`p-5 rounded-xl border transition-all ${formData.activeBrokers.includes('PAPER') ? 'bg-surface border-green-500/50' : 'bg-surface/50 border-slate-700'}`}>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-500/20 rounded-lg text-green-400"><Wallet size={20}/></div>
                                        <div>
                                            <h4 className="font-bold text-white">Paper Trading</h4>
                                            <p className="text-xs text-slate-500">Virtual simulation (Default)</p>
                                        </div>
                                    </div>
                                    <button onClick={() => toggleBroker('PAPER')} className={`w-12 h-6 rounded-full transition-colors relative ${formData.activeBrokers.includes('PAPER') ? 'bg-green-500' : 'bg-slate-700'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.activeBrokers.includes('PAPER') ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                            </div>

                            {/* DHAN */}
                            <div className={`p-5 rounded-xl border transition-all ${formData.activeBrokers.includes('DHAN') ? 'bg-surface border-purple-500/50' : 'bg-surface/50 border-slate-700'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400"><Building2 size={20}/></div>
                                        <div><h4 className="font-bold text-white">Dhan</h4><p className="text-xs text-slate-500">Stock Broker</p></div>
                                    </div>
                                    <button onClick={() => toggleBroker('DHAN')} className={`w-12 h-6 rounded-full transition-colors relative ${formData.activeBrokers.includes('DHAN') ? 'bg-purple-500' : 'bg-slate-700'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.activeBrokers.includes('DHAN') ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                                {formData.activeBrokers.includes('DHAN') && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
                                        <div><label className="text-[10px] text-slate-400 font-bold">Client ID</label><input type="text" value={formData.dhanClientId || ''} onChange={e => setFormData({...formData, dhanClientId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" placeholder="Enter Client ID" /></div>
                                        <div><label className="text-[10px] text-slate-400 font-bold">Access Token</label><input type="password" value={formData.dhanAccessToken || ''} onChange={e => setFormData({...formData, dhanAccessToken: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" placeholder="Enter Access Token" /></div>
                                    </div>
                                )}
                            </div>

                            {/* SHOONYA */}
                            <div className={`p-5 rounded-xl border transition-all ${formData.activeBrokers.includes('SHOONYA') ? 'bg-surface border-orange-500/50' : 'bg-surface/50 border-slate-700'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400"><Building2 size={20}/></div>
                                        <div><h4 className="font-bold text-white">Shoonya (Finvasia)</h4><p className="text-xs text-slate-500">Stock Broker</p></div>
                                    </div>
                                    <button onClick={() => toggleBroker('SHOONYA')} className={`w-12 h-6 rounded-full transition-colors relative ${formData.activeBrokers.includes('SHOONYA') ? 'bg-orange-500' : 'bg-slate-700'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.activeBrokers.includes('SHOONYA') ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                                {formData.activeBrokers.includes('SHOONYA') && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
                                        <div><label className="text-[10px] text-slate-400 font-bold">User ID</label><input type="text" value={formData.shoonyaUserId || ''} onChange={e => setFormData({...formData, shoonyaUserId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" placeholder="Enter User ID" /></div>
                                        <div><label className="text-[10px] text-slate-400 font-bold">Password</label><input type="password" value={formData.shoonyaPassword || ''} onChange={e => setFormData({...formData, shoonyaPassword: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" placeholder="Enter Password" /></div>
                                    </div>
                                )}
                            </div>

                            {/* BINANCE */}
                            <div className={`p-5 rounded-xl border transition-all ${formData.activeBrokers.includes('BINANCE') ? 'bg-surface border-yellow-500/50' : 'bg-surface/50 border-slate-700'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-yellow-500/20 rounded-lg text-yellow-400"><Cpu size={20}/></div>
                                        <div><h4 className="font-bold text-white">Binance</h4><p className="text-xs text-slate-500">Crypto Exchange</p></div>
                                    </div>
                                    <button onClick={() => toggleBroker('BINANCE')} className={`w-12 h-6 rounded-full transition-colors relative ${formData.activeBrokers.includes('BINANCE') ? 'bg-yellow-500' : 'bg-slate-700'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.activeBrokers.includes('BINANCE') ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                                {formData.activeBrokers.includes('BINANCE') && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
                                        <div><label className="text-[10px] text-slate-400 font-bold">API Key</label><input type="text" value={formData.binanceApiKey || ''} onChange={e => setFormData({...formData, binanceApiKey: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" placeholder="Binance API Key" /></div>
                                        <div><label className="text-[10px] text-slate-400 font-bold">Secret Key</label><input type="password" value={formData.binanceSecret || ''} onChange={e => setFormData({...formData, binanceSecret: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" placeholder="Binance Secret" /></div>
                                    </div>
                                )}
                            </div>

                             {/* COINDCX */}
                             <div className={`p-5 rounded-xl border transition-all ${formData.activeBrokers.includes('COINDCX') ? 'bg-surface border-blue-500/50' : 'bg-surface/50 border-slate-700'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Cpu size={20}/></div>
                                        <div><h4 className="font-bold text-white">CoinDCX</h4><p className="text-xs text-slate-500">Crypto Exchange</p></div>
                                    </div>
                                    <button onClick={() => toggleBroker('COINDCX')} className={`w-12 h-6 rounded-full transition-colors relative ${formData.activeBrokers.includes('COINDCX') ? 'bg-blue-500' : 'bg-slate-700'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.activeBrokers.includes('COINDCX') ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                                {formData.activeBrokers.includes('COINDCX') && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
                                        <div><label className="text-[10px] text-slate-400 font-bold">API Key</label><input type="text" value={formData.coindcxApiKey || ''} onChange={e => setFormData({...formData, coindcxApiKey: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" placeholder="CoinDCX API Key" /></div>
                                        <div><label className="text-[10px] text-slate-400 font-bold">Secret Key</label><input type="password" value={formData.coindcxSecret || ''} onChange={e => setFormData({...formData, coindcxSecret: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" placeholder="CoinDCX Secret" /></div>
                                    </div>
                                )}
                            </div>

                             {/* COINSWITCH */}
                             <div className={`p-5 rounded-xl border transition-all ${formData.activeBrokers.includes('COINSWITCH') ? 'bg-surface border-teal-500/50' : 'bg-surface/50 border-slate-700'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-teal-500/20 rounded-lg text-teal-400"><Cpu size={20}/></div>
                                        <div><h4 className="font-bold text-white">CoinSwitch</h4><p className="text-xs text-slate-500">Crypto Exchange</p></div>
                                    </div>
                                    <button onClick={() => toggleBroker('COINSWITCH')} className={`w-12 h-6 rounded-full transition-colors relative ${formData.activeBrokers.includes('COINSWITCH') ? 'bg-teal-500' : 'bg-slate-700'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.activeBrokers.includes('COINSWITCH') ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                                {formData.activeBrokers.includes('COINSWITCH') && (
                                    <div className="grid grid-cols-1 gap-4 animate-slide-up">
                                        <div><label className="text-[10px] text-slate-400 font-bold">API Key</label><input type="text" value={formData.coinswitchApiKey || ''} onChange={e => setFormData({...formData, coinswitchApiKey: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white" placeholder="CoinSwitch API Key" /></div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                )}

                {/* === NOTIFICATIONS TAB === */}
                {activeTab === 'NOTIFICATIONS' && (
                    <div className="space-y-6 animate-slide-up">
                        <div className="bg-surface p-6 rounded-xl border border-slate-700 text-center">
                            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Send size={32} className="text-blue-400"/>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Telegram Alerts</h3>
                            <p className="text-sm text-slate-400 mb-6">Receive real-time P&L reports and trade execution alerts directly to your Telegram.</p>
                            
                            <div className="space-y-4 text-left max-w-md mx-auto">
                                <div>
                                    <label className="block text-xs text-slate-400 mb-2 font-bold">Bot Token</label>
                                    <input type="text" value={formData.telegramBotToken} onChange={(e) => setFormData({...formData, telegramBotToken: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white text-sm focus:border-blue-500 outline-none" placeholder="e.g. 123456789:ABCdef..." />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-2 font-bold">Chat ID</label>
                                    <input type="text" value={formData.telegramChatId} onChange={(e) => setFormData({...formData, telegramChatId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white text-sm focus:border-blue-500 outline-none" placeholder="e.g. -100123456789" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
            
            {/* Mobile Save Button Area (Extra Space) */}
            <div className="h-24 md:hidden"></div>
        </div>
    </div>
  );
};