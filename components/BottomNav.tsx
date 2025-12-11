import React from 'react';
import { TrendingUp, Cpu, FileText, Activity, Settings } from 'lucide-react';

interface BottomNavProps {
  activeTab: number;
  onChange: (index: number) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChange }) => {
  const tabs = [
    { id: 0, label: 'Market', icon: TrendingUp },
    { id: 1, label: 'Crypto', icon: Cpu },
    { id: 2, label: 'Paper PNL', icon: FileText },
    { id: 3, label: 'Live PNL', icon: Activity },
    { id: 4, label: 'Config', icon: Settings },
  ];

  return (
    <div className="flex-none bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-safe z-50 animate-slide-up">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex flex-col items-center gap-1 w-full h-full justify-center transition-colors ${
                isActive ? 'text-blue-400' : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-blue-500/10' : ''}`}>
                <Icon size={20} className={isActive ? 'fill-current' : ''} />
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};