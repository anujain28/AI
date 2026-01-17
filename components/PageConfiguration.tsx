
import React, { useState, useEffect } from 'react';
import { AppSettings, Transaction } from '../types';
import { Save, Building2, Bell, List, Key, Check, Trash2, FileText, Plus, X, Search } from 'lucide-react';
import { checkAndRefreshStockList, addToWatchlist, removeFromWatchlist } from '../services/stockListService';

interface PageConfigurationProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  transactions: Transaction[]; 
  activeBots: Record<string, boolean>;
  onToggleBot: (broker: string) => void;
}

type TabType = 'PAPER' | 'STOCK_BROKERS' | 'WATCHLIST';

export const PageConfiguration: React.FC<PageConfigurationProps> = ({ settings, onSave, transactions, activeBots, onToggleBot }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [activeSubTab, setActiveSubTab] = useState<TabType>('WATCHLIST');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [newSymbol, setNewSymbol] = useState('');

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    const list = await checkAndRefreshStockList();
    setWatchlist(list);
  };

  const handleAddSymbol = () => {
    if (!newSymbol.trim()) return;
    const updated = addToWatchlist(newSymbol.trim());
    setWatchlist(updated);
    setNewSymbol('');
  };

  const handleRemoveSymbol = (sym: string) => {
    const updated = removeFromWatchlist(sym);
    setWatchlist(updated);
  };

  const toggleBroker = (broker: any) => {
    setFormData(prev => {
      const isActive = prev.activeBrokers.includes(broker);
      const newBrokers = isActive 
        ? prev.activeBrokers.filter(b => b !== broker)
        : [...prev.activeBrokers, broker];
      return { ...prev, activeBrokers: newBrokers };
    });
  };

  const handleReset = () => {
    if (confirm("WARNING: This will delete ALL data. This cannot be undone.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const tabs: {id: TabType, label: string, icon: React.ReactNode}[] = [
      { id: 'WATCHLIST', label: 'Watchlist', icon: <List size={16}/> },
      { id: 'PAPER', label: 'Bot Config', icon: <FileText size={16}/> },
      { id: 'STOCK_BROKERS', label: 'Brokers', icon: <Building2 size={16}/> },
  ];

  return (
    <div className="p-4 pb-24 animate-fade-in flex flex-col h-full max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white uppercase italic tracking-tighter">Configuration</h1>
            <button onClick={() => onSave(formData)} className="px-4 py-2 bg-blue-600 rounded-lg text-white text-xs font-bold flex items-center gap-2 shadow-lg hover:bg-blue-500 transition-all">
                <Save size={16}/> Save
            </button>
        </div>
        
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
            {tabs.map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${activeSubTab === tab.id ? 'bg-blue-600 text-white border border-blue-500/30 shadow-lg shadow-blue-500/20' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
                >
                    {tab.icon}
                    {tab.label}
                </button>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
            {activeSubTab === 'WATCHLIST' && (
                <div className="space-y-6 animate-slide-up">
                    <section className="bg-surface p-5 rounded-2xl border border-slate-800">
                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Search size={14}/> Manage Scanned Stocks
                        </h3>
                        
                        <div className="flex gap-2 mb-6">
                            <input 
                                type="text" 
                                value={newSymbol}
                                onChange={(e) => setNewSymbol(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
                                placeholder="Enter Symbol (e.g. RELIANCE)"
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-4 text-sm text-white focus:border-blue-500 outline-none transition-all"
                            />
                            <button 
                                onClick={handleAddSymbol}
                                className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl transition-all shadow-lg"
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {watchlist.map(sym => (
                                <div key={sym} className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 group">
                                    <span className="text-xs font-mono font-bold text-slate-200">{sym}</span>
                                    <button 
                                        onClick={() => handleRemoveSymbol(sym)}
                                        className="text-slate-500 hover:text-red-400 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            {watchlist.length === 0 && (
                                <p className="text-xs text-slate-500 italic p-2">Watchlist is empty. Add stocks to start scanning.</p>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {activeSubTab === 'PAPER' && (
                <div className="space-y-8 animate-slide-up">
                    <section className="bg-surface p-6 rounded-2xl border border-slate-800 space-y-4">
                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Bell size={14}/> Telegram Alerts</h3>
                        <div>
                            <label className="block text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-wider">Bot Token</label>
                            <input type="text" value={formData.telegramBotToken} onChange={(e) => setFormData({...formData, telegramBotToken: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-blue-500 font-mono" placeholder="123456:ABC-..." />
                        </div>
                        <div>
                            <label className="block text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-wider">Chat ID</label>
                            <input type="text" value={formData.telegramChatId} onChange={(e) => setFormData({...formData, telegramChatId: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-blue-500 font-mono" placeholder="-100..." />
                        </div>
                    </section>

                    <button onClick={handleReset} className="w-full py-4 rounded-xl text-xs font-bold text-red-400 bg-red-900/10 border border-red-900/30 flex items-center justify-center gap-2 mt-4 hover:bg-red-900/20 transition-all">
                        <Trash2 size={14}/> Factory Reset App
                    </button>
                </div>
            )}

            {activeSubTab === 'STOCK_BROKERS' && (
                <div className="space-y-4 animate-slide-up">
                    <div className={`p-5 rounded-2xl border transition-all ${formData.activeBrokers.includes('DHAN') ? 'bg-surface border-purple-500/50 shadow-lg' : 'bg-surface/50 border-slate-800'}`}>
                         <div className="flex justify-between items-center">
                             <div className="flex items-center gap-3">
                                 <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400"><Building2 size={20}/></div>
                                 <div>
                                     <h4 className="font-bold text-white text-sm">Dhan Broker</h4>
                                     <p className="text-[10px] text-slate-500">Live API Execution</p>
                                 </div>
                             </div>
                             <button onClick={() => toggleBroker('DHAN')} className={`w-10 h-5 rounded-full relative transition-colors ${formData.activeBrokers.includes('DHAN') ? 'bg-purple-600' : 'bg-slate-700'}`}>
                                 <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${formData.activeBrokers.includes('DHAN') ? 'left-5.5' : 'left-0.5'}`}></div>
                             </button>
                         </div>
                    </div>
                    <div className={`p-5 rounded-2xl border transition-all ${formData.activeBrokers.includes('SHOONYA') ? 'bg-surface border-orange-500/50 shadow-lg' : 'bg-surface/50 border-slate-800'}`}>
                         <div className="flex justify-between items-center">
                             <div className="flex items-center gap-3">
                                 <div className="p-2 bg-orange-500/20 rounded-xl text-orange-400"><Building2 size={20}/></div>
                                 <div>
                                     <h4 className="font-bold text-white text-sm">Shoonya Broker</h4>
                                     <p className="text-[10px] text-slate-500">Zero-Brokerage API</p>
                                 </div>
                             </div>
                             <button onClick={() => toggleBroker('SHOONYA')} className={`w-10 h-5 rounded-full relative transition-colors ${formData.activeBrokers.includes('SHOONYA') ? 'bg-orange-600' : 'bg-slate-700'}`}>
                                 <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${formData.activeBrokers.includes('SHOONYA') ? 'left-5.5' : 'left-0.5'}`}></div>
                             </button>
                         </div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
