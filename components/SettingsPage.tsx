import React, { useState } from 'react';
import { AppSettings, MarketSettings } from '../types';
import { Save, Settings, Wallet, LayoutGrid, Building2, Bell, TrendingUp, Key, Send, Check, Trash2, ArrowLeft, Zap } from 'lucide-react';

interface SettingsPageProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onBack: () => void;
}

type TabType = 'GENERAL' | 'MARKETS' | 'NOTIFICATIONS';

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onSave, onBack }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<TabType>('GENERAL');

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
      { id: 'MARKETS', label: 'Equity Markets', icon: <LayoutGrid size={16}/> },
      { id: 'NOTIFICATIONS', label: 'Telegram Alerts', icon: <Bell size={16}/> },
  ];

  return (
    <div className="flex flex-col md:flex-row h-full bg-background animate-fade-in">
        <div className="w-full md:w-64 bg-slate-900/50 border-b md:border-b-0 md:border-r border-slate-700 p-4 flex flex-col flex-shrink-0">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft size={18} />
                <span className="text-sm font-bold">Back to Dashboard</span>
            </button>
            
            <div className="flex items-center gap-2 mb-6 px-2">
                <div className="p-2 bg-blue-600 rounded-lg"><Settings size={20} className="text-white"/></div>
                <h2 className="text-lg font-bold text-white">Config</h2>
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

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 pb-24 md:pb-8">
            <div className="max-w-3xl mx-auto space-y-6">
                
                {activeTab === 'GENERAL' && (
                    <div className="space-y-8 animate-slide-up">
                        <section>
                            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Wallet size={16}/> Trading Capital</h3>
                            <div className="bg-surface p-4 rounded-xl border border-slate-700">
                                <label className="block text-xs text-slate-400 mb-2 font-bold">Virtual Stock Funds (INR)</label>
                                <input type="number" value={formData.initialFunds.stock} onChange={(e) => setFormData({...formData, initialFunds: {...formData.initialFunds, stock: parseFloat(e.target.value)}})} className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:border-blue-500 outline-none text-sm font-mono"/>
                            </div>
                        </section>

                        <section className="pt-6 border-t border-slate-700">
                            <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Zap size={16}/> Bot Execution</h3>
                            <div className="bg-surface p-6 rounded-xl border border-slate-700">
                                <label className="block text-xs text-slate-400 mb-3 font-bold">Trade Sizing (%)</label>
                                <input type="number" value={formData.autoTradeConfig?.value || 0} onChange={(e) => setFormData({...formData, autoTradeConfig: { mode: 'PERCENTAGE', value: parseFloat(e.target.value) }})} className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white focus:border-blue-500 outline-none text-lg font-mono"/>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'MARKETS' && (
                    <div className="space-y-6 animate-slide-up">
                        <div className="p-5 rounded-xl border border-blue-500/50 bg-surface flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-slate-900 text-blue-400"><TrendingUp size={24}/></div>
                                <div>
                                    <h4 className="font-bold text-white">NSE Equity Market</h4>
                                    <p className="text-xs text-slate-500">Scanning 200+ symbols</p>
                                </div>
                            </div>
                            <Check size={20} className="text-blue-500"/>
                        </div>
                    </div>
                )}

                {activeTab === 'NOTIFICATIONS' && (
                    <div className="bg-surface p-6 rounded-xl border border-slate-700 space-y-4">
                        <h3 className="text-lg font-bold text-white text-center">Telegram Sync</h3>
                        <div>
                            <label className="block text-xs text-slate-400 mb-2 font-bold uppercase">Bot Token</label>
                            <input type="text" value={formData.telegramBotToken} onChange={(e) => setFormData({...formData, telegramBotToken: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white text-sm focus:border-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-2 font-bold uppercase">Chat ID</label>
                            <input type="text" value={formData.telegramChatId} onChange={(e) => setFormData({...formData, telegramChatId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white text-sm focus:border-blue-500 outline-none" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};