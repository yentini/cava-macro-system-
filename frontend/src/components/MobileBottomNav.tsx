import React from 'react';
import { Compass, Gauge, Layers, LineChart } from 'lucide-react';

export type MobileTab = 'decision' | 'gauges' | 'matrix' | 'charts';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  setActiveTab: (tab: MobileTab) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'decision' as MobileTab, label: 'Decisión', icon: Compass },
    { id: 'gauges' as MobileTab, label: 'Tacómetros', icon: Gauge },
    { id: 'matrix' as MobileTab, label: 'Confluencia', icon: Layers },
    { id: 'charts' as MobileTab, label: 'Gráficos', icon: LineChart },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0b0f19]/95 backdrop-blur-lg border-t border-gray-800/90 px-2 py-1.5 flex justify-around items-center">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
              isActive
                ? 'text-yellow-400 font-bold'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-yellow-400 scale-110' : ''}`} />
            <span className="text-[10px] tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
