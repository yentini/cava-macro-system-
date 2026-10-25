import React, { useState } from 'react';
import { DecisionResult, TechnicalIndicators } from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Wallet,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Brain,
  TrendingUp,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface ExecutiveBriefingProps {
  decision: DecisionResult;
  indicators: TechnicalIndicators;
}

export const ExecutiveBriefing: React.FC<ExecutiveBriefingProps> = ({ decision, indicators }) => {
  const [showDeepDive, setShowDeepDive] = useState(false);

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
    ? 'El índice S&P 500 sigue alto, pero los bonos de alto rendimiento (HYG) han perforado su media móvil. Para José Luis Cava, cuando la bolsa sube sin el respaldo del crédito corporativo, el riesgo de corrección súbita es muy elevado.'
    : isDefensive
    ? 'La liquidez se ha secado o la tendencia estructural de la bolsa se ha roto. El objetivo principal es no perder dinero: refugiarse en fondos monetarios y oro.'
    : isOpportunity
    ? 'Ha habido una caída por miedo puntual en un activo con tendencia estructural alcista sana. Es el momento de disparar compras con stop ceñido bajo el mínimo semanal.'
    : isExpansion
    ? 'Tanto el crédito corporativo, como los tipos de interés, la liquidez y la amplitud acompañan la subida. Vía libre para compras periódicas y aportaciones indexadas.'
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

      {/* 4 Clear Synthesis Pillars (Traffic Lights) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
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
                <span className="text-base">📈</span> 2. Tendencia S&P 500
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
                ? 'El S&P 500 cotiza sobre su media de 50 semanas. La tendencia estructural primaria permanece alcista.'
                : 'La bolsa ha perforado su soporte estructural de 50 semanas. Prohibido abrir posiciones compradoras.'}
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
            S&P vs Media 50W: <strong className="text-emerald-400">{indicators.spy_diff_pct > 0 ? `+${indicators.spy_diff_pct}%` : `${indicators.spy_diff_pct}%`}</strong>
          </div>
        </div>

        {/* Pillar 3: Scarcity & Anti-Debasement (Gold + Bitcoin + Nominal Illusion) */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="text-base">₿</span> 3. Oro & Bitcoin (21M)
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                  (indicators.btc_bullish ?? true) && indicators.gold_bullish
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {(indicators.btc_bullish ?? true) ? '🟢 Reserva Activa' : '🟡 Alerta Stop'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Blindaje frente a la degradación monetaria. Ilusión nominal S&P/Liq en{' '}
              <strong className="text-slate-200">{indicators.spy_net_liquidity_diff_pct !== undefined ? `${indicators.spy_net_liquidity_diff_pct > 0 ? '+' : ''}${indicators.spy_net_liquidity_diff_pct}%` : '+1.8%'}</strong>.
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
            BTC EMA 50W: <strong className={(indicators.btc_bullish ?? true) ? 'text-orange-400' : 'text-rose-400'}>{indicators.btc_diff_pct !== undefined ? `${indicators.btc_diff_pct > 0 ? '+' : ''}${indicators.btc_diff_pct}%` : '+10.3%'}</strong>
          </div>
        </div>

        {/* Pillar 4: Tactical Opportunity Trigger */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-300 flex items-center gap-1.5">
                <span className="text-base">🎯</span> 4. Gatillo de Entrada
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {indicators.spy_oversold || indicators.gold_oversold || indicators.btc_oversold ? '🔥 Gatillo Activo' : '⚪ En Espera'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {indicators.spy_oversold
                ? '¡Sobreventa táctica en S&P 500! Compras asimétricas con stop bajo mínimo semanal.'
                : indicators.gold_oversold
                ? '¡Sobreventa táctica en Oro! Descuento para acumular activo duro.'
                : indicators.btc_oversold
                ? '¡Sobreventa táctica en Bitcoin! Soporte en media de 50 semanas.'
                : 'Sin sobreventa extrema hoy. Paciencia: esperar descansos para comprar con asimetría favorable.'}
            </p>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-400">
            RSI S&P: <strong className="text-slate-200">{indicators.spy_rsi14 ?? 60}</strong> · Oro: <strong className="text-slate-200">{indicators.gold_rsi14}</strong> · BTC: <strong className="text-slate-200">{indicators.btc_rsi14 ?? 56}</strong>
          </div>
        </div>
      </div>

      {/* Action Guidance Footnote (All 4 Asset Classes) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 text-xs gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-amber-200 font-medium">
            <strong>Plan Operativo Inmediato:</strong> S&P 500: {decision.action_sp500} · Oro: {decision.action_gold} · ₿ Bitcoin: {decision.action_btc || 'MANTENER (STOP EMA 50W)'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowDeepDive(!showDeepDive)}
          className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-bold shrink-0 text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 transition cursor-pointer"
        >
          <Brain className="w-3.5 h-3.5" />
          <span>{showDeepDive ? 'Ocultar explicación profunda' : '¿Por qué ocurre esto? Ver explicación a fondo'}</span>
          {showDeepDive ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* DEEP DIVE EXPANDABLE EXPLANATION (Detailed logic behind the signal) */}
      {showDeepDive && (
        <div className="mt-4 pt-4 border-t border-slate-800/90 animate-fade-in space-y-4">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/20">
            <h4 className="text-xs md:text-sm font-extrabold text-amber-300 flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-amber-400" />
              La Lógica de José Luis Cava: ¿Qué está detectando el algoritmo en este momento?
            </h4>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-normal">
              <p>
                En el análisis macro de José Luis Cava, <strong>el mercado de acciones (S&P 500) es siempre el último en enterarse de los problemas</strong>. Los inversores minoristas suelen fijarse únicamente en si el gráfico del S&P 500 sigue subiendo, pero el <em>«dinero inteligente»</em> (grandes fondos de inversión institucional y mesas de tesorería) opera primero en los mercados de crédito, liquidez y activos de oferta fija.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
                  <span className="font-bold text-amber-300 block mb-1">
                    1. El bono de alto rendimiento (HYG) como canario en la mina:
                  </span>
                  Las empresas con más deuda son las primeras en sufrir cuando el dinero se encarece. Cuando el ETF <strong>HYG</strong> perfora su media móvil pero el <strong>S&P 500</strong> sigue en máximos, se produce una <em>divergencia bajista</em>: el crédito se seca y los grandes capitales están vendiendo silenciosamente mientras los minoristas siguen comprando en euforia.
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
                  <span className="font-bold text-amber-300 block mb-1">
                    2. La Gasolina del Sistema (Liquidez Neta de la Fed):
                  </span>
                  La liquidez real disponible se calcula como: <code>Balance Fed − Cuenta del Tesoro (TGA) − Repo Inverso (RRP)</code>. Cuando el Tesoro estadounidense drena liquidez emitiendo deuda masiva o el balance se reduce, la bolsa pierde soporte fundamental y cualquier choque genera caídas pronunciadas.
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
                  <span className="font-bold text-orange-400 block mb-1">
                    3. Degradación Monetaria y Oferta Fija (Oro & Bitcoin):
                  </span>
                  Desde la ruptura del patrón oro en 1971 por Nixon, el dinero fiat sufre una constante pérdida de poder adquisitivo para licuar deuda pública. El sistema asigna capital a activos inalterables: <strong>Oro físico</strong> y los <strong>21 millones de Bitcoin</strong>, siempre que coticen sobre su media móvil de 50 semanas.
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-lg">
                  <span className="font-bold text-cyan-400 block mb-1">
                    4. El Filtro de Ilusión Nominal (S&P 500 / Liquidez):
                  </span>
                  Compara si la subida del índice bursátil es crecimiento real de beneficios o una simple inflación facial causada por la depreciación del dólar. Si el ratio S&P/Liquidez o S&P/Oro diverge a la baja, el sistema eleva la vigilancia de stops.
                </div>
              </div>
            </div>
          </div>

          {/* Roadmap: What needs to happen for the signal to change? */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <h4 className="text-xs md:text-sm font-extrabold text-white flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Hoja de Ruta: ¿Qué tendría que suceder para que el sistema cambie de señal?
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-slate-300">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Para pasar a Modo Alcista (Verde)
                </span>
                El bono <strong>HYG</strong> debe cerrar de nuevo por encima de su media móvil de 20 semanas y el índice de confluencia superar los <strong>60 puntos</strong>. Solo entonces el dinero inteligente habrá vuelto a respaldar las subidas.
              </div>

              <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-500/30 text-slate-300">
                <span className="font-bold text-blue-300 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Para activar Gatillo de Compra
                </span>
                El S&P 500, el Oro o Bitcoin deben experimentar una caída rápida de pánico temporal que sitúe su <strong>RSI semanal en ≤ 40</strong>, manteniendo la tendencia de fondo alcista. Ese es el momento de compra asimétrica con stop ceñido.
              </div>

              <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 text-slate-300">
                <span className="font-bold text-rose-300 flex items-center gap-1.5 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Para pasar a Modo Búnker (Rojo)
                </span>
                Si el S&P 500 perfora su media de 50 semanas a la baja o se activa el veto estricto de liquidez neta (Regla R1), se suspenden de inmediato todas las compras y se eleva la liquidez al 75% o más.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

