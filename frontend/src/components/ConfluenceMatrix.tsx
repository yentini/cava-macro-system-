import React, { useState } from 'react';
import { LayerEvaluation, DecisionResult } from '../types';
import {
  Layers,
  CheckCircle2,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  Calculator,
  Compass
} from 'lucide-react';

interface ConfluenceMatrixProps {
  layers: LayerEvaluation[];
  decision?: DecisionResult;
}

export const ConfluenceMatrix: React.FC<ConfluenceMatrixProps> = ({ layers, decision }) => {
  const [activeTab, setActiveTab] = useState<'layers' | 'cross_rules' | 'steps'>('layers');
  const [expandedLayer, setExpandedLayer] = useState<number | null>(null);

  const confluenceIndex = decision?.confluence_index ?? 75;
  const conviction = decision?.score_conviction ?? 80;
  const baseScore = decision?.base_score ?? 75;
  const crossAdj = decision?.cross_adjustment ?? 0;
  const crossRules = decision?.cross_rules ?? [];
  const activeCrossRulesCount = crossRules.filter((r) => r.is_active).length;

  // Mini speedometer geometry for the Cross Rules Confluence
  const minVal = 0;
  const maxVal = 100;
  const clampedVal = Math.min(Math.max(confluenceIndex, minVal), maxVal);
  const ratio = (clampedVal - minVal) / (maxVal - minVal);
  const needleAngle = -90 + ratio * 180;

  const cx = 90;
  const cy = 80;
  const r = 60;
  const strokeWidth = 10;

  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  const indexColor =
    confluenceIndex >= 65 ? '#10b981' : confluenceIndex >= 35 ? '#f59e0b' : '#ef4444';

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-3xl p-5 md:p-6 shadow-2xl space-y-6">
      {/* ======================================================== */}
      {/* 1. Header con Velocímetro de Reglas Cruzadas             */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-5 pb-5 border-b border-gray-800">
        <div className="space-y-1.5 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-2">
            <div className="p-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400 block">
                Filosofía José Luis Cava
              </span>
              <h3 className="text-lg md:text-xl font-black text-white tracking-tight">
                Matriz de Confluencia & Reglas Cruzadas
              </h3>
            </div>
          </div>
          <p className="text-xs text-gray-400 max-w-md">
            Ponderación cuantitativa continua: 9 indicadores sumando hasta 100 puntos en 3 capas,
            ajustados por combinaciones críticas de mercado (Reglas R1 a R6).
          </p>
        </div>

        {/* Speedometer card */}
        <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-3 flex items-center gap-4 shrink-0 shadow-lg">
          {/* SVG Half-Moon */}
          <div className="relative flex justify-center items-center">
            <svg viewBox="0 0 180 95" className="w-32 h-auto overflow-visible">
              {/* Background Arc */}
              <path
                d={describeArc(cx, cy, r, -90, 90)}
                fill="none"
                stroke="#1f2937"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              {/* Zone: Defensivo (0-35) */}
              <path
                d={describeArc(cx, cy, r, -90, -90 + (35 / 100) * 180)}
                fill="none"
                stroke="#ef4444"
                strokeWidth={strokeWidth}
                className="opacity-80"
              />
              {/* Zone: Transición (35-65) */}
              <path
                d={describeArc(cx, cy, r, -90 + (35 / 100) * 180, -90 + (65 / 100) * 180)}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={strokeWidth}
                className="opacity-80"
              />
              {/* Zone: Expansión (65-100) */}
              <path
                d={describeArc(cx, cy, r, -90 + (65 / 100) * 180, 90)}
                fill="none"
                stroke="#10b981"
                strokeWidth={strokeWidth}
                className="opacity-80"
              />
              {/* Needle */}
              <g
                style={{
                  transform: `rotate(${needleAngle}deg)`,
                  transformOrigin: `${cx}px ${cy}px`,
                  transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
              >
                <line
                  x1={cx}
                  y1={cy}
                  x2={cx}
                  y2={cy - r + 6}
                  stroke="#f3f4f6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx={cx} cy={cy - r + 6} r="2.5" fill="#f59e0b" />
              </g>
              <circle cx={cx} cy={cy} r="6" fill="#1f2937" stroke="#374151" strokeWidth="1.5" />
              <circle cx={cx} cy={cy} r="3" fill="#f59e0b" />
            </svg>
          </div>

          {/* Readout */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Índice Confluencia
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black font-mono tracking-tight" style={{ color: indexColor }}>
                {confluenceIndex}
              </span>
              <span className="text-xs text-gray-400 font-mono">/100</span>
            </div>
            <span className="text-[10px] font-semibold text-gray-300">
              {confluenceIndex >= 65 ? '🟢 Expansión' : confluenceIndex >= 35 ? '🟡 Transición' : '🔴 Defensivo'}
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. Resumen Matemático: De dónde sale cada número         */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-gray-900/60 p-3.5 rounded-2xl border border-gray-800/80">
        <div className="flex items-start gap-2">
          <Calculator className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-gray-200 block mb-0.5">
              Origen del Índice de Confluencia ({confluenceIndex}/100):
            </span>
            <p className="text-gray-400 leading-snug font-mono text-[11px]">
              {decision?.index_explanation ||
                `Base: ${baseScore} pts + Ajuste Reglas Cruzadas: ${crossAdj >= 0 ? `+${crossAdj}` : crossAdj} pts.`}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Compass className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-gray-200 block mb-0.5">
              Origen de la Convicción ({conviction}%):
            </span>
            <p className="text-gray-400 leading-snug font-mono text-[11px]">
              {decision?.conviction_explanation ||
                'Calculada midiendo cuántos de los 9 indicadores confirman la dirección del régimen activo.'}
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. Navegación por Pestañas                               */}
      {/* ======================================================== */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('layers')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'layers'
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
              : 'text-gray-400 hover:text-white bg-gray-900/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> 3 Capas & 9 Indicadores
        </button>

        <button
          onClick={() => setActiveTab('cross_rules')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'cross_rules'
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
              : 'text-gray-400 hover:text-white bg-gray-900/60'
          }`}
        >
          <Zap className="w-3.5 h-3.5" /> Reglas Cruzadas R1-R6
          {activeCrossRulesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-yellow-400 text-black text-[10px] font-extrabold">
              {activeCrossRulesCount}
            </span>
          )}
        </button>

        {decision?.regime_steps && decision.regime_steps.length > 0 && (
          <button
            onClick={() => setActiveTab('steps')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'steps'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                : 'text-gray-400 hover:text-white bg-gray-900/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Pasos de Decisión
          </button>
        )}
      </div>

      {/* ======================================================== */}
      {/* 4. Pestaña A: 3 Capas & 9 Indicadores                    */}
      {/* ======================================================== */}
      {activeTab === 'layers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {layers.map((layer) => {
            const isOk = layer.is_healthy;
            const score = layer.score ?? 0;
            const maxScore = layer.max_score ?? (layer.layer_num === 3 ? 20 : 40);
            const pct = Math.round((score / maxScore) * 100);
            const isExpanded = expandedLayer === layer.layer_num;

            return (
              <div
                key={layer.layer_num}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isOk
                    ? 'bg-emerald-950/15 border-emerald-500/30'
                    : 'bg-gray-900/70 border-gray-800 hover:border-gray-700'
                }`}
              >
                <div>
                  {/* Layer Header */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Capa {layer.layer_num}
                    </span>
                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isOk
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-gray-800 text-gray-300 border border-gray-700'
                      }`}
                    >
                      {score}/{maxScore} pts ({pct}%)
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-gray-100 mb-1">{layer.name}</h4>
                  <p className="text-xs text-gray-400 mb-3 leading-relaxed">{layer.summary}</p>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Rationale for weight */}
                  {layer.weight_rationale && (
                    <span className="text-[10px] text-gray-400 italic block mb-3">
                      ⚖️ {layer.weight_rationale}
                    </span>
                  )}

                  {/* Indicators List */}
                  <div className="space-y-2 pt-2 border-t border-gray-800/80">
                    {layer.rules && layer.rules.length > 0 ? (
                      layer.rules.map((rule) => {
                        const sigColor =
                          rule.signal === 'bullish'
                            ? 'text-emerald-400'
                            : rule.signal === 'bearish'
                            ? 'text-rose-400'
                            : 'text-blue-400';

                        return (
                          <div
                            key={rule.id}
                            className="bg-black/30 p-2 rounded-xl border border-gray-800/60 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-200">{rule.indicator}</span>
                              <span className="font-mono font-bold text-yellow-400">
                                +{rule.points}/{rule.max_points} pts
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-gray-400">
                              <span className="font-mono">{rule.value_text}</span>
                              <span className={`font-semibold ${sigColor}`}>{rule.condition}</span>
                            </div>
                            {isExpanded && (
                              <p className="text-[10px] text-gray-400 pt-1 border-t border-gray-800 leading-snug">
                                {rule.explanation}
                              </p>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      layer.details.map((detail, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-xs text-gray-300">
                          <span className="text-yellow-400 font-bold mt-0.5">•</span>
                          <span>{detail}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Toggle details */}
                {layer.rules && layer.rules.length > 0 && (
                  <button
                    onClick={() => setExpandedLayer(isExpanded ? null : layer.layer_num)}
                    className="mt-3 pt-2 border-t border-gray-800/80 text-[11px] font-semibold text-gray-400 hover:text-yellow-400 flex items-center justify-center gap-1 transition"
                  >
                    {isExpanded ? (
                      <>
                        Ocultar explicaciones <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        Ver por qué según Cava <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. Pestaña B: Reglas Cruzadas Institucionales (R1 a R6)   */}
      {/* ======================================================== */}
      {activeTab === 'cross_rules' && (
        <div className="space-y-3">
          <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-2xl text-xs text-yellow-200 flex items-start gap-2">
            <Info className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
            <p leading-relaxed>
              <strong>¿Qué son las reglas cruzadas?</strong> Ningún indicador se analiza aislado.
              Las reglas cruzadas evalúan combinaciones asimétricas: cuando la liquidez falla pero
              el precio sube (trampa), cuando hay miedo puntual en activos alcistas (home run), o
              cuando el crédito institucional activa un veto de riesgo sistémico.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {crossRules.map((rule) => {
              const activeBorder = rule.is_active
                ? rule.direction === 'bullish'
                  ? 'border-emerald-500/50 bg-emerald-950/20'
                  : 'border-rose-500/50 bg-rose-950/20'
                : 'border-gray-800/70 bg-gray-900/60 opacity-80';

              return (
                <div key={rule.id} className={`p-4 rounded-2xl border ${activeBorder} space-y-2 transition`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black font-mono px-2 py-0.5 rounded-lg bg-gray-800 text-yellow-400 border border-gray-700">
                      {rule.id}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        rule.is_active
                          ? rule.direction === 'bullish'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                          : 'bg-gray-800 text-gray-500 border-gray-700'
                      }`}
                    >
                      {rule.is_active ? '🔥 REGLA ACTIVA HOY' : '⚪ Inactiva'}
                    </span>
                  </div>

                  <h5 className="text-sm font-bold text-gray-100">{rule.name}</h5>
                  <p className="text-xs text-gray-400 font-mono bg-black/40 p-2 rounded-xl border border-gray-800">
                    Condición: {rule.condition}
                  </p>
                  <p className="text-xs text-gray-300 leading-relaxed">{rule.explanation}</p>

                  <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
                    <span className="font-bold text-yellow-400 font-mono">{rule.effect}</span>
                    <span className="text-[11px] text-gray-400 italic max-w-[60%] text-right truncate">
                      {rule.cava_action}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. Pestaña C: Pasos de Decisión (Árbol Lógico)           */}
      {/* ======================================================== */}
      {activeTab === 'steps' && decision?.regime_steps && (
        <div className="space-y-3">
          <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-2xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 block mb-1">
              Árbol de Decisión Ejecutado por el Motor:
            </span>
            <div className="space-y-2">
              {decision.regime_steps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-black/40 border border-gray-800/80 font-mono text-xs text-gray-200 flex items-center gap-2"
                >
                  <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. Filosofía Footnote                                    */}
      {/* ======================================================== */}
      <div className="pt-3 border-t border-gray-800/80 flex items-center gap-2 text-xs text-gray-400">
        <Info className="w-4 h-4 text-gray-500 shrink-0" />
        <span>
          <strong>Ley Cava de Confluencia:</strong> La liquidez manda. Si la Capa 1 falla, las subidas en la Capa 2
          son trampas alcistas. Las compras asimétricas solo se ejecutan cuando la estructura macro y el crédito
          confirman la oportunidad.
        </span>
      </div>
    </div>
  );
};
