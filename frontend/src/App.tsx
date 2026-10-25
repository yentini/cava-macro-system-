import React, { useEffect, useState, useMemo } from 'react';
import { fetchSystemStatus, refreshSystemStatus } from './services/api';
import { MacroSystemResponse } from './types';
import { Header } from './components/Header';
import { RegimeBanner } from './components/RegimeBanner';
import { ExecutiveBriefing } from './components/ExecutiveBriefing';
import { CollapsibleSection } from './components/CollapsibleSection';
import { PortfolioCalculator, REGIME_ALLOCATIONS } from './components/PortfolioCalculator';
import { GaugeChart } from './components/GaugeChart';
import { ConfluenceMatrix } from './components/ConfluenceMatrix';
import { TechnicalCharts } from './components/TechnicalCharts';
import { CavaTheoryView } from './components/CavaTheoryView';
import { MobileBottomNav, MobileTab } from './components/MobileBottomNav';
import {
  Compass,
  Gauge,
  Calculator,
  Layers,
  LineChart,
  Eye,
  EyeOff,
  SlidersHorizontal
} from 'lucide-react';

export const App: React.FC = () => {
  const [data, setData] = useState<MacroSystemResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'auto' | 'mobile' | 'desktop'>('auto');
  const [activeView, setActiveView] = useState<'dashboard' | 'theory'>('dashboard');
  const [mobileTab, setMobileTab] = useState<MobileTab>('decision');
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  // Collapsible sections state (all folded by default as requested to avoid cognitive overload)
  const [openSections, setOpenSections] = useState<{
    calculator: boolean;
    gauges: boolean;
    matrix: boolean;
    charts: boolean;
  }>({
    calculator: false,
    gauges: false,
    matrix: false,
    charts: false,
  });

  // Detect screen size
  useEffect(() => {
    const checkScreen = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const isMobileView = viewMode === 'mobile' || (viewMode === 'auto' && isMobileScreen);

  // Initial data load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const res = await fetchSystemStatus();
      setData(res);
      setIsLoading(false);
    };
    load();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const res = await refreshSystemStatus();
    setData(res);
    setIsRefreshing(false);
  };

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allSectionsOpen = Object.values(openSections).every(Boolean);

  const toggleAllSections = (open: boolean) => {
    setOpenSections({
      calculator: open,
      gauges: open,
      matrix: open,
      charts: open,
    });
  };

  // Helper stats for summary badges
  const gaugeSummary = useMemo(() => {
    if (!data) return { red: 0, amber: 0, green: 0, total: 0 };
    const red = data.gauges.filter((g) => g.status_color === 'red').length;
    const amber = data.gauges.filter((g) => g.status_color === 'yellow' || g.status_color === 'blue').length;
    const green = data.gauges.filter((g) => g.status_color === 'green').length;
    return { red, amber, green, total: data.gauges.length };
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center animate-bounce mb-4">
          <Compass className="w-6 h-6 text-yellow-400" />
        </div>
        <h2 className="text-lg font-bold text-white tracking-tight">Cargando Sistema Cava Macro...</h2>
        <p className="text-xs text-gray-400 mt-1">Conectando con mercados y analizando confluencia macro</p>
      </div>
    );
  }

  const allocation = REGIME_ALLOCATIONS[data.decision.regime];

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col selection:bg-yellow-500/20">
      {/* Universal Top Header */}
      <Header
        updatedAt={data.updated_at}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeView={activeView}
        setActiveView={(view) => {
          setActiveView(view);
          if (view === 'theory' && isMobileView) {
            setMobileTab('theory');
          } else if (view === 'dashboard' && isMobileView && mobileTab === 'theory') {
            setMobileTab('decision');
          }
        }}
      />

      {/* Main Content Area */}
      <main className={`flex-1 ${isMobileView ? 'pb-20 p-3 max-w-lg mx-auto w-full' : 'p-6 max-w-7xl mx-auto w-full'}`}>
        {isMobileView ? (
          /* ======================================================== */
          /* MÓVIL (PWA APP-LIKE VIEW)                                */
          /* ======================================================== */
          <div className="space-y-4 animate-fade-in">
            {mobileTab === 'theory' && (
              <CavaTheoryView />
            )}

            {mobileTab === 'decision' && (
              <div className="space-y-4">
                <RegimeBanner decision={data.decision} />

                {/* Executive Briefing in Plain Spanish */}
                <ExecutiveBriefing decision={data.decision} indicators={data.indicators} />

                {/* Foldable Tactical Calculator in Mobile View */}
                <CollapsibleSection
                  id="mobile-calculator"
                  title="Calculadora Táctica de Cartera"
                  subtitle="Distribución recomendada según régimen y capital disponible"
                  icon={<Calculator className="w-4 h-4" />}
                  summaryBadge={
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-amber-300">
                      RV {allocation.equitiesPct}% · ORO {allocation.goldPct}% · LIQ {allocation.cashPct}%
                    </span>
                  }
                  isOpen={openSections.calculator}
                  onToggle={() => toggleSection('calculator')}
                >
                  <PortfolioCalculator
                    regime={data.decision.regime}
                    confluenceIndex={data.decision.confluence_index}
                    scoreConviction={data.decision.score_conviction}
                    embedded={true}
                  />
                </CollapsibleSection>

                {/* Quick Tacómetros summary card */}
                <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-yellow-400" /> Veredicto de Tacómetros ({data.gauges.length})
                    </h3>
                    <button
                      onClick={() => setMobileTab('gauges')}
                      className="text-[11px] font-semibold text-yellow-400 hover:underline"
                    >
                      Ver todos →
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {data.gauges.slice(0, 6).map((g) => (
                      <button
                        key={g.id}
                        onClick={() => setMobileTab('gauges')}
                        className="bg-gray-900/80 hover:bg-gray-800/80 p-2.5 rounded-xl border border-gray-800 text-left transition"
                      >
                        <span className="text-[10px] text-gray-400 block truncate font-medium">{g.name}</span>
                        <span className="text-sm font-mono font-bold text-white">{g.display_value}</span>
                        <span className={`block text-[10px] font-semibold mt-0.5 ${
                          g.status_color === 'green' ? 'text-emerald-400' : g.status_color === 'red' ? 'text-rose-400' : 'text-amber-400'
                        }`}>
                          {g.status_label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {mobileTab === 'gauges' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-yellow-400" /> Tacómetros de Medición
                  </h2>
                  <span className="text-xs text-gray-400 font-mono">{data.gauges.length} Tacómetros</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {data.gauges.map((gauge) => (
                    <GaugeChart key={gauge.id} metric={gauge} />
                  ))}
                </div>
              </div>
            )}

            {mobileTab === 'matrix' && (
              <div className="space-y-4">
                <ConfluenceMatrix layers={data.decision.layers} decision={data.decision} />
              </div>
            )}

            {mobileTab === 'charts' && (
              <div className="space-y-4">
                <TechnicalCharts
                  spyData={data.charts.spy}
                  goldData={data.charts.gold}
                  hygData={data.charts.hyg}
                  btcData={data.charts.btc}
                />
              </div>
            )}
          </div>
        ) : activeView === 'theory' ? (
          /* ======================================================== */
          /* ESCRITORIO: VISTA TEORÍA DE CAVA                         */
          /* ======================================================== */
          <CavaTheoryView />
        ) : (
          /* ======================================================== */
          /* ESCRITORIO: DASHBOARD TÁCTICO                           */
          /* ======================================================== */
          <div className="space-y-6 animate-fade-in">
            {/* Top Section: Master Decision Banner */}
            <RegimeBanner decision={data.decision} />

            {/* 1. Executive Briefing in Plain Spanish (Always visible first for maximum clarity) */}
            <ExecutiveBriefing decision={data.decision} indicators={data.indicators} />

            {/* Global Sections Toolbar: Global Expand/Collapse & Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-yellow-400" />
                  Módulos de Análisis Detallado (Plegados para evitar saturación):
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleAllSections(!allSectionsOpen)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {allSectionsOpen ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                      Plegar todos los apartados
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-yellow-400" />
                      Desplegar todos los apartados
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 2. Tactical Capital Allocation Calculator (Collapsible) */}
            <CollapsibleSection
              id="desktop-calculator"
              title="Calculadora Táctica de Cartera"
              subtitle="Distribución porcentual y asignación monetaria de capital según régimen de mercado"
              icon={<Calculator className="w-5 h-5" />}
              summaryBadge={
                <div className="flex items-center gap-2">
                  <span className="hidden md:inline text-xs text-slate-400">Distribución Sugerida:</span>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-amber-300">
                    RV {allocation.equitiesPct}% · ORO {allocation.goldPct}% · LIQ {allocation.cashPct}%
                  </span>
                  <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${allocation.tagColor}`}>
                    {allocation.actionTag}
                  </span>
                </div>
              }
              isOpen={openSections.calculator}
              onToggle={() => toggleSection('calculator')}
            >
              <PortfolioCalculator
                regime={data.decision.regime}
                confluenceIndex={data.decision.confluence_index}
                scoreConviction={data.decision.score_conviction}
                embedded={true}
              />
            </CollapsibleSection>

            {/* 3. Tacómetros (Half-Moon Gauges Grid - Collapsible) */}
            <CollapsibleSection
              id="desktop-gauges"
              title="Cuadro de Tacómetros Tácticos (Media Luna con Aguja)"
              subtitle={`${data.gauges.length} métricas semanales, sentimiento y flujos institucionales con zonas roja/amarilla/verde`}
              icon={<Gauge className="w-5 h-5" />}
              summaryBadge={
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {gaugeSummary.total} Tacómetros
                  </span>
                  {gaugeSummary.red > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      🔴 {gaugeSummary.red} Crítico
                    </span>
                  )}
                  {gaugeSummary.amber > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      🟡 {gaugeSummary.amber} Vigilancia
                    </span>
                  )}
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    🟢 {gaugeSummary.green} Sanos
                  </span>
                </div>
              }
              isOpen={openSections.gauges}
              onToggle={() => toggleSection('gauges')}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.gauges.map((gauge) => (
                  <GaugeChart key={gauge.id} metric={gauge} />
                ))}
              </div>
            </CollapsibleSection>

            {/* 4. Confluence Matrix Section (Collapsible) */}
            <CollapsibleSection
              id="desktop-matrix"
              title="Matriz de Confluencia y Reglas Cruzadas"
              subtitle="Evaluación de las 3 Capas de Cava (Liquidez, Tendencia Estructural, Gatillo de Entrada) y Reglas R1 a R8"
              icon={<Layers className="w-5 h-5" />}
              summaryBadge={
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 hidden sm:inline">Índice de Confluencia:</span>
                  <span className={`text-xs font-mono font-black px-2.5 py-1 rounded-lg border ${
                    (data.decision.confluence_index ?? 0) >= 60
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : (data.decision.confluence_index ?? 0) >= 40
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}>
                    {data.decision.confluence_index ?? 0} / 100
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    8 Reglas Cruzadas
                  </span>
                </div>
              }
              isOpen={openSections.matrix}
              onToggle={() => toggleSection('matrix')}
            >
              <ConfluenceMatrix layers={data.decision.layers} decision={data.decision} />
            </CollapsibleSection>

            {/* 5. Technical Charts Section (Collapsible) */}
            <CollapsibleSection
              id="desktop-charts"
              title="Gráficos Técnicos Interactivos"
              subtitle="S&P 500 (SPY), Oro (GLD) y Bonos Alto Rendimiento (HYG) con soporte de Velas Japonesas y Zoom Dinámico"
              icon={<LineChart className="w-5 h-5" />}
              summaryBadge={
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-300 hidden md:inline">
                    SPY: <strong className="text-emerald-400">${data.indicators.spy_price}</strong> · Oro: <strong className="text-amber-400">${data.indicators.gold_price}</strong>
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-yellow-300 border border-slate-700">
                    Línea vs Velas
                  </span>
                </div>
              }
              isOpen={openSections.charts}
              onToggle={() => toggleSection('charts')}
            >
              <TechnicalCharts
                spyData={data.charts.spy}
                goldData={data.charts.gold}
                hygData={data.charts.hyg}
                btcData={data.charts.btc}
              />
            </CollapsibleSection>
          </div>
        )}
      </main>

      {/* Mobile Bottom Fixed Navigation Bar */}
      {isMobileView && (
        <MobileBottomNav
          activeTab={mobileTab}
          setActiveTab={(tab) => {
            setMobileTab(tab);
            if (tab === 'theory') {
              setActiveView('theory');
            } else {
              setActiveView('dashboard');
            }
          }}
        />
      )}
    </div>
  );
};

