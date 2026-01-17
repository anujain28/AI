
import React, { useState } from 'react';
import { Terminal, Zap, Activity, Clock, Sliders } from 'lucide-react';
import { StrategyRules } from '../types';

interface PageStrategyLogProps {
  rules: StrategyRules;
  onUpdateRules: (rules: StrategyRules) => void;
}

export const PageStrategyLog: React.FC<PageStrategyLogProps> = ({ rules, onUpdateRules }) => {
  const [localRules, setLocalRules] = useState(rules);

  const handleSave = () => onUpdateRules(localRules);

  return (
    <div className="p-4 pb-24 animate-fade-in space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-blue-600/20 rounded-xl text-blue-400 border border-blue-500/30"><Terminal size={24} /></div>
        <div>
          <h1 className="text-2xl font-bold text-white uppercase italic">OI Profile Engine</h1>
          <p className="text-xs text-slate-400 font-medium tracking-widest uppercase">Intraday Rule Thresholds</p>
        </div>
      </div>

      <div className="bg-surface border border-slate-700 rounded-2xl p-6 space-y-8 shadow-2xl">
          <section>
              <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Activity size={16} /> Scanning Thresholds
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                      <div>
                          <div className="flex justify-between mb-2">
                              <label className="text-xs text-slate-400 font-bold uppercase">OI Spike Trigger (%)</label>
                              <span className="text-xs font-mono text-blue-400">+{localRules.oiSpikeThreshold}%</span>
                          </div>
                          <input type="range" min="1" max="15" step="0.5" value={localRules.oiSpikeThreshold} onChange={e => setLocalRules({...localRules, oiSpikeThreshold: parseFloat(e.target.value)})} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                      </div>
                      <div>
                          <div className="flex justify-between mb-2">
                              <label className="text-xs text-slate-400 font-bold uppercase">Volume Multiplier</label>
                              <span className="text-xs font-mono text-blue-400">{localRules.volMultiplier}x Avg</span>
                          </div>
                          <input type="range" min="1" max="5" step="0.1" value={localRules.volMultiplier} onChange={e => setLocalRules({...localRules, volMultiplier: parseFloat(e.target.value)})} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                      </div>
                  </div>
                  
                  <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Start Time</label>
                              <input type="time" value={localRules.minTime} onChange={e => setLocalRules({...localRules, minTime: e.target.value})} className="bg-slate-900 border border-slate-700 text-white p-2 rounded w-full text-xs font-mono outline-none focus:border-blue-500" />
                          </div>
                          <div>
                              <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">End Time</label>
                              <input type="time" value={localRules.maxTime} onChange={e => setLocalRules({...localRules, maxTime: e.target.value})} className="bg-slate-900 border border-slate-700 text-white p-2 rounded w-full text-xs font-mono outline-none focus:border-blue-500" />
                          </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                          <label className="text-xs text-slate-400 font-bold uppercase">Price > VWAP Filter</label>
                          <button 
                            onClick={() => setLocalRules({...localRules, vwapConfirm: !localRules.vwapConfirm})}
                            className={`w-10 h-5 rounded-full relative transition-colors ${localRules.vwapConfirm ? 'bg-blue-600' : 'bg-slate-700'}`}
                          >
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${localRules.vwapConfirm ? 'left-5.5' : 'left-0.5'}`} />
                          </button>
                      </div>
                  </div>
              </div>
          </section>

          <button onClick={handleSave} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
              <Zap size={18} /> Apply Engine Rules
          </button>
      </div>
    </div>
  );
};
