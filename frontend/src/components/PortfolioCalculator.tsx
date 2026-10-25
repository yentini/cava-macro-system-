import React, { useState, useMemo } from 'react';
import { MarketRegimeType } from '../types';

interface PortfolioCalculatorProps {
  regime: MarketRegimeType;
  confluenceIndex?: number;
  scoreConviction?: number;
  embedded?: boolean;
}

export interface AllocationBreakdown {
  equitiesPct: number;
  goldPct: number;
  btcPct: number;
  cashPct: number;
  strategyTitle: string;
  strategyAdvice: string;
  actionTag: string;
  tagColor: string;
}

export const REGIME_ALLOCATIONS: Record<MarketRegimeType, AllocationBreakdown> = {
  EXPANSION_PLENA: {
    equitiesPct: 70,
    goldPct: 15,
    btcPct: 5,
    cashPct: 10,
    strategyTitle: 'Expansión Máxima · Acompañar la Tendencia',
    strategyAdvice: 'Aportaciones periódicas al S&P 500. Mantener 15% de oro y 5% en Bitcoin como cobertura contra la degradación monetaria, y 10% en monetarios.',
    actionTag: 'COMPRA PERIÓDICA ACTIVA',
    tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  },
  OPORTUNIDAD_ASIMETRICA: {
    equitiesPct: 55,
    goldPct: 20,
    btcPct: 5,
    cashPct: 20,
    strategyTitle: 'Oportunidad Asimétrica · Despliegue Táctico',
    strategyAdvice: 'Sobreventa puntual en activo sano (RSI ≤ 40). Disparar compras con stop ceñido bajo el mínimo semanal en bolsa y acumular activos escasos.',
    actionTag: 'DESPLIEGUE ASIMÉTRICO',
    tagColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  },
  TRANSICION_NEUTRA: {
    equitiesPct: 40,
    goldPct: 25,
    btcPct: 5,
    cashPct: 30,
    strategyTitle: 'Transición · Prudencia y Paciencia',
    strategyAdvice: 'No perseguir precios ni aumentar riesgo. Mantener 30% en fondos monetarios rindiendo sin riesgo y stops de protección en cartera.',
    actionTag: 'MANTENER Y VIGILAR',
    tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
  },
  DIVERGENCIA_BAJISTA: {
    equitiesPct: 20,
    goldPct: 25,
    btcPct: 0,
    cashPct: 55,
    strategyTitle: 'Divergencia / Trampa · Defensa Anticipada',
    strategyAdvice: 'El crédito corporativo (HYG) cae mientras la bolsa sube. Las manos fuertes no compran. Ceñir stops al milímetro, pausar compras de riesgo y elevar liquidez al 55%.',
    actionTag: 'CEÑIR STOPS / ALERTA',
    tagColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30'
  },
  REGIMEN_DEFENSIVO: {
    equitiesPct: 0,
    goldPct: 25,
    btcPct: 0,
    cashPct: 75,
    strategyTitle: 'Régimen Defensivo · Preservación Total',
    strategyAdvice: 'Veto de liquidez o tendencia semanal rota. Fuera de bolsa y cripto al 100%. Capital refugiado en monetarios al 3%+ y oro físico.',
    actionTag: '100% FUERA DE RIESGO',
    tagColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30'
  }
};

const CAPITAL_PRESETS = [5000, 10000, 25000, 50000, 100000];

export const PortfolioCalculator: React.FC<PortfolioCalculatorProps> = ({
  regime,
  confluenceIndex = 80,
  scoreConviction = 85,
  embedded = false
}) => {
  const [capital, setCapital] = useState<number>(10000);

  const allocation = useMemo(() => {
    return REGIME_ALLOCATIONS[regime] || REGIME_ALLOCATIONS.TRANSICION_NEUTRA;
  }, [regime]);

  const equitiesAmount = useMemo(() => Math.round((capital * allocation.equitiesPct) / 100), [capital, allocation]);
  const goldAmount = useMemo(() => Math.round((capital * allocation.goldPct) / 100), [capital, allocation]);
  const btcAmount = useMemo(() => Math.round((capital * (allocation.btcPct || 0)) / 100), [capital, allocation]);
  const cashAmount = useMemo(() => Math.round((capital * allocation.cashPct) / 100), [capital, allocation]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
  };

  const bodyContent = (
    <>
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🧮</span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Calculadora Táctica de Asignación de Capital
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Distribución óptima de tu cartera en euros según el régimen macro de José Luis Cava.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-full border border-slate-800">
              Confluencia: <strong className="text-yellow-400">{confluenceIndex}/100</strong> · Convicción: <strong className="text-emerald-400">{scoreConviction}%</strong>
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${allocation.tagColor}`}>
              {allocation.actionTag}
            </span>
          </div>
        </div>
      )}

      {/* Capital Input Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 items-center">
        {/* Input & Slider */}
        <div className="lg:col-span-5 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="capital-input" className="text-xs font-medium text-slate-300">
              Capital Disponible / Cartera Total:
            </label>
            <span className="text-base font-extrabold text-blue-400 font-mono">
              {formatCurrency(capital)}
            </span>
          </div>

          <input
            id="capital-input"
            type="range"
            min={1000}
            max={200000}
            step={1000}
            value={capital}
            onChange={(e) => setCapital(Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
          />

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {CAPITAL_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setCapital(preset)}
                className={`px-2.5 py-1 text-xs rounded-md font-mono transition-colors ${
                  capital === preset
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {preset >= 1000 ? `${preset / 1000}k€` : `${preset}€`}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Allocation Stack Bar */}
        <div className="lg:col-span-7">
          <div className="flex justify-between text-xs font-medium text-slate-400 mb-2">
            <span>Distribución Porcentual</span>
            <span className="font-mono">
              RV {allocation.equitiesPct}% · ORO {allocation.goldPct}% {allocation.btcPct > 0 && `· BTC ${allocation.btcPct}%`} · LIQ {allocation.cashPct}%
            </span>
          </div>

          <div className="w-full h-8 bg-slate-950 rounded-xl overflow-hidden flex shadow-inner border border-slate-800">
            {allocation.equitiesPct > 0 && (
              <div
                style={{ width: `${allocation.equitiesPct}%` }}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-[11px] font-bold text-white tracking-wide transition-all duration-500 relative group"
                title={`Renta Variable: ${allocation.equitiesPct}%`}
              >
                {allocation.equitiesPct >= 15 && `RV ${allocation.equitiesPct}%`}
              </div>
            )}
            {allocation.goldPct > 0 && (
              <div
                style={{ width: `${allocation.goldPct}%` }}
                className="bg-gradient-to-r from-amber-500 to-yellow-600 flex items-center justify-center text-[11px] font-bold text-white tracking-wide transition-all duration-500"
                title={`Oro: ${allocation.goldPct}%`}
              >
                {allocation.goldPct >= 15 && `ORO ${allocation.goldPct}%`}
              </div>
            )}
            {allocation.btcPct > 0 && (
              <div
                style={{ width: `${allocation.btcPct}%` }}
                className="bg-gradient-to-r from-orange-500 to-amber-600 flex items-center justify-center text-[11px] font-bold text-white tracking-wide transition-all duration-500"
                title={`Bitcoin: ${allocation.btcPct}%`}
              >
                {`BTC ${allocation.btcPct}%`}
              </div>
            )}
            {allocation.cashPct > 0 && (
              <div
                style={{ width: `${allocation.cashPct}%` }}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center justify-center text-[11px] font-bold text-white tracking-wide transition-all duration-500"
                title={`Liquidez / Monetarios: ${allocation.cashPct}%`}
              >
                {allocation.cashPct >= 10 && `LIQ ${allocation.cashPct}%`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exact Euro Cards Grid (4 Asset Classes) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4">
        {/* Equities Card */}
        <div className="bg-slate-950/70 border border-blue-900/40 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-blue-400 font-semibold mb-1">
              <span>📈 S&P 500 (RV)</span>
              <span className="font-mono bg-blue-950/80 px-2 py-0.5 rounded text-[11px]">
                {allocation.equitiesPct}%
              </span>
            </div>
            <div className="text-xl md:text-2xl font-black text-white font-mono tracking-tight my-1">
              {formatCurrency(equitiesAmount)}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            {allocation.equitiesPct > 0
              ? 'Indexación a S&P 500 con stop semanal bajo EMA 50W.'
              : 'Posición 100% cerrada / Fuera de bolsa.'}
          </p>
        </div>

        {/* Gold Card */}
        <div className="bg-slate-950/70 border border-amber-900/40 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-amber-400 font-semibold mb-1">
              <span>🪙 ORO FÍSICO / ETC</span>
              <span className="font-mono bg-amber-950/80 px-2 py-0.5 rounded text-[11px]">
                {allocation.goldPct}%
              </span>
            </div>
            <div className="text-xl md:text-2xl font-black text-white font-mono tracking-tight my-1">
              {formatCurrency(goldAmount)}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Reaseguro patrimonial frente a la devaluación del dinero fiduciario.
          </p>
        </div>

        {/* Bitcoin Card */}
        <div className="bg-slate-950/70 border border-orange-900/40 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-orange-400 font-semibold mb-1">
              <span>₿ BITCOIN (BTC)</span>
              <span className="font-mono bg-orange-950/80 px-2 py-0.5 rounded text-[11px]">
                {allocation.btcPct}%
              </span>
            </div>
            <div className="text-xl md:text-2xl font-black text-white font-mono tracking-tight my-1">
              {formatCurrency(btcAmount)}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            {allocation.btcPct > 0
              ? 'Oferta fija (21M). Activo escaso digital anti-degradación.'
              : '0% asignación en regímenes defensivos o divergentes.'}
          </p>
        </div>

        {/* Cash / Liquidity Card */}
        <div className="bg-slate-950/70 border border-emerald-900/40 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mb-1">
              <span>💧 FONDOS MONETARIOS</span>
              <span className="font-mono bg-emerald-950/80 px-2 py-0.5 rounded text-[11px]">
                {allocation.cashPct}%
              </span>
            </div>
            <div className="text-xl md:text-2xl font-black text-white font-mono tracking-tight my-1">
              {formatCurrency(cashAmount)}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Pólvora seca rindiendo al 3%+ sin volatilidad, lista para compras asimétricas.
          </p>
        </div>
      </div>

      {/* Tactical Strategy Guidance Box */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs">
        <div className="flex items-center gap-2 font-semibold text-slate-200 mb-1">
          <span className="text-blue-400">💡</span>
          <span>Estrategia Operativa recomendada: {allocation.strategyTitle}</span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          {allocation.strategyAdvice}
        </p>
      </div>
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{bodyContent}</div>;
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      {bodyContent}
    </div>
  );
};
