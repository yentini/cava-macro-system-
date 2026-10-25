import React from 'react';
import { DecisionResult, TechnicalIndicators } from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Wallet,
  Sparkles
} from 'lucide-react';

interface ExecutiveBriefingProps {
  decision: DecisionResult;
  indicators: TechnicalIndicators;
}

export const ExecutiveBriefing: React.FC<ExecutiveBriefingProps> = ({ decision, indicators }) => {
  const isDivergence = decision.regime === 'DIVERGENCIA_BAJISTA';
  const isDefensive = decision.regime === 'REGIMEN_DEFENSIVO';
  const isExpansion = decision.regime === 'EXPANSION_PLENA';
  const isOpportunity = decision.regime === 'OPORTUNIDAD_ASIMETRICA';

  // Human-friendly headline
  const summaryTitle = isDivergence
    ? 'Trampa Alcista en Ciernes: La Bolsa sube pero el Dinero Inteligente se retira'
    : isDefensive
    ? 'Modo Búnker: Riesgo Sistémico o Veto de Liquidez Activo'
    : isOpportunity
    ? 'Ventana de Oportunidad Asimétrica: Compras Tácticas con Descuento'
    : isExpansion
    ? 'Viento a Favor Pleno: La Liquidez y la Tendencia respaldan la Bolsa'
    : 'Mercado en Transición: Esperar Confirmación sin Anticipar Movimientos';

  const summaryExplanation = isDivergence
    ? 'El índice S&P 500 sigue alto, pero los bonos de alto rendimiento (HYG) han perforado su media. Para José Luis Cava, cuando la bolsa sube sin el respaldo del crédito corporativo, el riesgo de corrección súbita es muy elevado.'
    : isDefensive
    ? 'La liquidez se ha secado o la tendencia estructural de la bolsa se ha roto. El objetivo principal es no perder dinero: refugiarse en fondos monetarios y oro.'
    : isOpportunity
    ? 'Ha habido una caída por miedo puntual en un activo con tendencia estructural alcista sana. Es el momento de disparar compras con stop ceñido bajo el mínimo semanal.'
    : isExpansion
    ? 'Tanto el crédito, como los tipos de interés, la liquidez y la amplitud acompañan la subida. Vía libre para compras periódicas y aportaciones indexadas.'
    : 'Existen señales mixtas entre los distintos indicadores. Mantener la calma, no aumentar el riesgo y cobrar rendimientos en fondos monetarios.';

  return (
    <div className="bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-950/95 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-2xl backdrop-blur-md">
      {/* Top Banner with Quick Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                Resumen Ejecutivo · Lectura en 30 Segundos
              </span>
              <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-700/60">
                Para Todos los Públicos
              </span>
            </div>
            <h2 className="text-base md:text-lg font-black text-white tracking-tight mt-0.5">
              ¿Qué está pasando en el mercado y qué debo hacer?
            </h2>
          </div>
        </div>

        {/* Global Risk Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Riesgo Global:</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-black tracking-wide border flex items-center gap-1.5 ${
              isDefensive
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                : isDivergence
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : isExpansion
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
            }`}
          >
            {isDefensive && <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />}
            {isDivergence && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
            {isExpansion && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
            {decision.regime_title}
          </span>
        </div>
      </div>

      {/* Main Plain-Language Explanation */}
      <div className="my-5 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
        <h3 className="text-sm font-extrabold text-amber-300 mb-1 flex items-center gap-2">
          <span>📢</span> {summaryTitle}
        </h3>
        <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-normal">
          {summaryExplanation}
        </p>
      </div>

      {/* 3 Clear Synthesis Pillars (Traffic Lights) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-5">
        {/* Pillar 1: Liquidity & Smart Money */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="text-base">💧</span> 1. Liquidez y Crédito
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                  indicators.hyg_bullish
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {indicators.hyg_bullish ? '🟢 Liquidez Sana' : '🔴 Crédito Roto'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {indicators.hyg_bullish
                ? 'El dinero inteligente valida el riesgo. Las empresas se financian sin problemas y el crédito acompaña.'
                : 'Alerta clave de Cava: el bono de alto rendimiento (HYG) está cayendo. El dinero institucional no acompaña a la bolsa.'}
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
            HYG vs Media: <strong className={indicators.hyg_bullish ? 'text-emerald-400' : 'text-rose-400'}>{indicators.hyg_diff_pct > 0 ? `+${indicators.hyg_diff_pct}%` : `${indicators.hyg_diff_pct}%`}</strong>
          </div>
        </div>

        {/* Pillar 2: Stock Market Trend */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="text-base">📈</span> 2. Tendencia de Fondo
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                  indicators.spy_bullish
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {indicators.spy_bullish ? '🟢 Alcista (EMA 50W)' : '🔴 Tendencia Rota'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {indicators.spy_bullish
                ? 'El S&P 500 cotiza por encima de la media de 50 semanas (Línea Azul). Estructuralmente la tendencia es alcista.'
                : 'La bolsa ha perforado su soporte estructural de 50 semanas. Prohibido abrir posiciones compradoras.'}
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
            S&P vs Media 50W: <strong className="text-emerald-400">{indicators.spy_diff_pct > 0 ? `+${indicators.spy_diff_pct}%` : `${indicators.spy_diff_pct}%`}</strong>
          </div>
        </div>

        {/* Pillar 3: Tactical Opportunity */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="text-base">🎯</span> 3. Gatillo de Entrada
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {indicators.spy_oversold || indicators.gold_oversold ? '🔥 Gatillo Activo' : '⚪ En Espera'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {indicators.spy_oversold
                ? '¡Sobreventa táctica en S&P 500! Momento propicio para comprar con descuento y stop ajustado.'
                : indicators.gold_oversold
                ? '¡Sobreventa táctica en Oro! Momento de compras asimétricas con descuento.'
                : 'No hay sobreventa extrema hoy (RSI en rango medio). Paciencia: no comprar en subidas verticales sin descuento.'}
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
            RSI S&P: <strong className="text-slate-200">{indicators.spy_rsi14 ?? 60}</strong> · RSI Oro: <strong className="text-slate-200">{indicators.gold_rsi14}</strong>
          </div>
        </div>
      </div>

      {/* Action Guidance Footnote */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 text-xs gap-3">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-amber-200 font-medium">
            <strong>Plan Operativo Inmediato:</strong> {decision.action_sp500} · {decision.action_gold}
          </span>
        </div>
        <span className="text-amber-400 font-bold shrink-0 text-[11px]">
          Despliega los apartados inferiores para ver el desglose técnico detallado ↓
        </span>
      </div>
    </div>
  );
};
