
import React from 'react';
import { TrendingUp, Bot, Briefcase, Settings, Cpu, Filter, Zap, Building2 } from 'lucide-react';

interface BottomNavProps {
  activeTab: number;
  onChange: (index: number) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChange }) => {
  const tabs = [
    { id: 0, label: 'Ideas', icon: TrendingUp },
    { id: 1, label: 'Scalp', icon: Zap },
    { id: 2, label: 'Scan', icon: Filter },
    { id: 3, label: 'Strategy', icon: Cpu },
    { id: 5, label: 'Paper', icon: Bot },
    { id: 4, label: 'Broker', icon: Building2 },
    { id: 6, label: 'Config', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-xl border-t border-white/5 pb-safe z-50 animate-slide-up shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.5)]">
      <div className="flex justify-between px-2 items-center h-16 max-w-lg mx-auto md:max-w-7xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex flex-col items-center gap-1 w-full h-full justify-center transition-all duration-300 min-w-[50px] relative group`}
            >
              {isActive && (
                  <div className="absolute top-0 w-8 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-b-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
              )}
              
              <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400 -translate-y-1' : 'text-slate-500 group-hover:text-slate-300'}`}>
                <Icon size={20} className={isActive ? 'drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]' : ''} />
              </div>
              <span className={`text-[9px] font-bold transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
