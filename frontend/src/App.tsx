import React, { useEffect, useState } from 'react';
import { fetchSystemStatus, refreshSystemStatus } from './services/api';
import { MacroSystemResponse } from './types';
import { Header } from './components/Header';
import { RegimeBanner } from './components/RegimeBanner';
import { GaugeChart } from './components/GaugeChart';
import { ConfluenceMatrix } from './components/ConfluenceMatrix';
import { TechnicalCharts } from './components/TechnicalCharts';
import { MobileBottomNav, MobileTab } from './components/MobileBottomNav';
import { Compass, Gauge } from 'lucide-react';

export const App: React.FC = () => {
  const [data, setData] = useState<MacroSystemResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'auto' | 'mobile' | 'desktop'>('auto');
  const [mobileTab, setMobileTab] = useState<MobileTab>('decision');
  const [isMobileScreen, setIsMobileScreen] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col selection:bg-yellow-500/20">
      {/* Universal Top Header */}
      <Header
        updatedAt={data.updated_at}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Main Content Area */}
      <main className={`flex-1 ${isMobileView ? 'pb-20 p-3 max-w-lg mx-auto w-full' : 'p-6 max-w-7xl mx-auto w-full'}`}>
        {isMobileView ? (
          /* ======================================================== */
          /* MÓVIL (PWA APP-LIKE VIEW)                                */
          /* ======================================================== */
          <div className="space-y-4 animate-fade-in">
            {mobileTab === 'decision' && (
              <div className="space-y-4">
                <RegimeBanner decision={data.decision} />
                <div className="bg-[#111827] border border-gray-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-yellow-400" /> Veredicto de los 5 Tacómetros
                    </h3>
                    <button
                      onClick={() => setMobileTab('gauges')}
                      className="text-[11px] font-semibold text-yellow-400 hover:underline"
                    >
                      Ver tacómetros y guías →
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {data.gauges.map((g) => (
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
                  <span className="text-xs text-gray-400">Media Luna & Aguja</span>
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
                />
              </div>
            )}
          </div>
        ) : (
          /* ======================================================== */
          /* ESCRITORIO (FULL-SCREEN EXPANSIVE DESKTOP VIEW)         */
          /* ======================================================== */
          <div className="space-y-6 animate-fade-in">
            {/* Top Section: Master Decision Banner */}
            <RegimeBanner decision={data.decision} />

            {/* Tacómetros (Half-Moon Gauges Grid) */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2 tracking-tight">
                  <Gauge className="w-5 h-5 text-yellow-400" />
                  Cuadro de Tacómetros Tácticos (Media Luna con Aguja)
                </h3>
                <span className="text-xs text-gray-400 font-mono">
                  {data.gauges.length} Métricas Semanales &amp; Flujos Institucionales
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.gauges.map((gauge) => (
                  <GaugeChart key={gauge.id} metric={gauge} />
                ))}
              </div>
            </section>

            {/* Confluence Matrix Section (Full-Width for 3-Layer Clarity) */}
            <section>
              <ConfluenceMatrix layers={data.decision.layers} decision={data.decision} />
            </section>

            {/* Technical Charts Section */}
            <section>
              <TechnicalCharts
                spyData={data.charts.spy}
                goldData={data.charts.gold}
                hygData={data.charts.hyg}
              />
            </section>
          </div>
        )}
      </main>

      {/* Mobile Bottom Fixed Navigation Bar */}
      {isMobileView && (
        <MobileBottomNav activeTab={mobileTab} setActiveTab={setMobileTab} />
      )}
    </div>
  );
};
