import React from 'react';
import { DecisionResult } from '../types';
import { ShieldCheck, AlertTriangle, AlertCircle, TrendingUp, Sparkles } from 'lucide-react';

interface RegimeBannerProps {
  decision: DecisionResult;
}

export const RegimeBanner: React.FC<RegimeBannerProps> = ({ decision }) => {
  const { regime_title, score_conviction, status_color, action_sp500, action_gold, rationale } = decision;

  const colorConfig = {
    green: {
      border: 'border-emerald-500/40',
      bg: 'from-emerald-950/40 via-emerald-900/10 to-transparent',
      badge: 'bg-emerald-500 text-black',
      glow: 'shadow-emerald-500/20',
      icon: TrendingUp,
      iconColor: 'text-emerald-400'
    },
    yellow: {
      border: 'border-amber-500/40',
      bg: 'from-amber-950/40 via-amber-900/10 to-transparent',
      badge: 'bg-amber-500 text-black',
      glow: 'shadow-amber-500/20',
      icon: AlertTriangle,
      iconColor: 'text-amber-400'
    },
    red: {
      border: 'border-rose-500/40',
      bg: 'from-rose-950/40 via-rose-900/10 to-transparent',
      badge: 'bg-rose-500 text-white',
      glow: 'shadow-rose-500/20',
      icon: AlertCircle,
      iconColor: 'text-rose-400'
    },
    blue: {
      border: 'border-blue-500/40',
      bg: 'from-blue-950/40 via-blue-900/10 to-transparent',
      badge: 'bg-blue-500 text-white',
      glow: 'shadow-blue-500/20',
      icon: ShieldCheck,
      iconColor: 'text-blue-400'
    }
  }[status_color] || {
    border: 'border-gray-500/40',
    bg: 'from-gray-900 to-transparent',
    badge: 'bg-gray-500 text-white',
    glow: '',
    icon: ShieldCheck,
    iconColor: 'text-gray-400'
  };

  const IconComp = colorConfig.icon;

  return (
    <div className={`relative overflow-hidden rounded-3xl border ${colorConfig.border} bg-gradient-to-r ${colorConfig.bg} bg-[#111827] p-6 shadow-2xl ${colorConfig.glow} backdrop-blur-xl`}>
      {/* Background ambient blur */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Title & Conviction */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl bg-gray-900/80 border border-gray-700/60 shadow-inner ${colorConfig.iconColor}`}>
            <IconComp className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Matriz de Reglas Cruzadas
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              {regime_title}
            </h2>
          </div>
        </div>

        {/* Conviction Meter */}
        <div className="flex items-center gap-3 bg-gray-900/90 border border-gray-800 px-4 py-2.5 rounded-2xl self-start md:self-auto">
          <div className="text-right">
            <span className="block text-[10px] uppercase font-bold text-gray-400">Nivel de Convicción</span>
            <span className="text-lg font-mono font-black text-white">{score_conviction}%</span>
          </div>
          <div className="w-20 bg-gray-800 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                score_conviction >= 75 ? 'bg-emerald-500' : score_conviction >= 50 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${score_conviction}%` }}
            />
          </div>
        </div>
      </div>

      {/* Rationale explanation */}
      <div className="py-4">
        <p className="text-sm md:text-base text-gray-300 leading-relaxed font-normal">
          {rationale}
        </p>
      </div>

      {/* Action Cards (What to do today) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        {/* S&P 500 Action */}
        <div className="bg-gray-900/80 border border-gray-800/90 rounded-2xl p-4 hover:border-gray-700 transition">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Decisión S&P 500</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 font-mono font-medium">Bolsa</span>
          </div>
          <p className="text-sm md:text-base font-bold text-white tracking-tight">
            {action_sp500}
          </p>
        </div>

        {/* Gold Action */}
        <div className="bg-gray-900/80 border border-gray-800/90 rounded-2xl p-4 hover:border-gray-700 transition">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Decisión Oro (GLD)</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-mono font-medium">Activo Duro</span>
          </div>
          <p className="text-sm md:text-base font-bold text-white tracking-tight">
            {action_gold}
          </p>
        </div>
      </div>
    </div>
  );
};
