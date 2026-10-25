import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Shield,
  TrendingUp,
  AlertTriangle,
  Flame,
  Layers,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  PieChart,
  Scale
} from 'lucide-react';

interface GlossaryTerm {
  id: string;
  term: string;
  tag: 'Liquidez' | 'Crédito' | 'Tendencia' | 'Técnico' | 'Estrategia' | 'Psicología';
  shortDesc: string;
  detailedDesc: string;
  cavaRule: string;
  practicalExample: string;
}

const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: 'hyg',
    term: 'HYG (Bono de Alto Rendimiento / "El Canario en la Mina")',
    tag: 'Crédito',
    shortDesc: 'ETF que replica la deuda corporativa de alto rendimiento (bonos basura).',
    detailedDesc: 'Para José Luis Cava, el mercado de crédito corporativo es el indicador adelantado número uno de la bolsa. Las empresas más apalancadas y vulnerables son las primeras en sufrir cuando el dinero se encarece. Cuando HYG cotiza por encima de su media de 20 semanas, el crédito fluye y la bolsa está respaldada. Cuando HYG perfora su media pero el S&P 500 sigue subiendo, estamos ante una trampa alcista.',
    cavaRule: 'Si el S&P 500 sube pero HYG cae por debajo de su EMA 20W, se prohíbe abrir posiciones compradoras y se ciñen stops al milímetro.',
    practicalExample: 'En los techos de mercado de 2007 y finales de 2021, HYG comenzó a caer semanas y meses antes de que el S&P 500 hiciera su pico definitivo.'
  },
  {
    id: 'net-liquidity',
    term: 'Liquidez Neta de la Fed (Fed Net Liquidity)',
    tag: 'Liquidez',
    shortDesc: 'La cantidad real de dinero líquido que la Reserva Federal inyecta o drena del sistema bancario.',
    detailedDesc: 'No basta con mirar el balance total de la Fed. La liquidez real disponible para comprar activos financieros se rige por la fórmula: Balance Total de la Fed − Cuenta General del Tesoro (TGA) − Facilidad de Repo Inverso (RRP). Cuando el Tesoro gasta dinero de su cuenta, la liquidez sube e impulsa la bolsa. Cuando el Tesoro emite deuda masiva para rellenar la TGA, succiona liquidez y la bolsa sufre.',
    cavaRule: 'La liquidez neta es la gasolina del mercado. Sin liquidez creciente, las subidas bursátiles son meros rebotes técnicos vulnerables.',
    practicalExample: 'Fórmula: Liquidez Neta = Balance Fed ($6.8T) − TGA ($950B) − RRP ($100B) ≈ $5.75T.'
  },
  {
    id: 'tga',
    term: 'TGA (Treasury General Account / Cuenta del Tesoro)',
    tag: 'Liquidez',
    shortDesc: 'La cuenta corriente que el gobierno de EE.UU. mantiene en la Reserva Federal.',
    detailedDesc: 'Cuando el Tesoro de EE.UU. recauda impuestos o emite bonos, el dinero se acumula en la TGA, retirando reservas del sistema bancario privado (drena liquidez). Cuando el gobierno gasta ese dinero en subsidios, obras o gastos públicos, el dinero vuelve al sistema bancario (inyecta liquidez).',
    cavaRule: 'Un aumento rápido de la TGA drena liquidez de Wall Street. Una reducción de la TGA riega de liquidez a los mercados.',
    practicalExample: 'Tras acuerdos de techo de deuda, el Tesoro suele rellenar la TGA con cientos de miles de millones de dólares, generando vientos en contra para el S&P 500.'
  },
  {
    id: 'rrp',
    term: 'Repo Inverso (Reverse Repo Facility - RRP)',
    tag: 'Liquidez',
    shortDesc: 'Mecanismo donde los fondos del mercado monetario aparcan efectivo ocioso en la Fed a cambio de interés.',
    detailedDesc: 'El dinero en el RRP está congelado, fuera de la circulación activa. Cuando el RRP disminuye (los fondos sacan el dinero para comprar Letras del Tesoro o activos), ese dinero se desbloquea y entra en el circuito financiero, actuando como un estímulo cuantitativo encubierto.',
    cavaRule: 'El vaciado del Repo Inverso actuó como el gran amortiguador alcista entre 2023 y 2024.',
    practicalExample: 'Cuando el RRP cayó de 2.2 billones a menos de 300.000 millones, liberó casi 2 billones de dólares directamente al sistema financiero.'
  },
  {
    id: 'ema50w',
    term: 'Media Móvil Exponencial de 50 Semanas (EMA 50W)',
    tag: 'Tendencia',
    shortDesc: 'La línea de tendencia estructural que separa un mercado alcista de uno bajista.',
    detailedDesc: 'Es el promedio ponderado de los precios de cierre de las últimas 50 semanas (aproximadamente un año de cotización). Para Cava, mientras el precio del S&P 500 o del Oro se mantenga por encima de esta línea, cualquier corrección es simplemente un descanso dentro de una tendencia alcista estructural primaria.',
    cavaRule: 'Por encima de la EMA 50W solo se buscan compras y descansos. Si el precio perfora la EMA 50W con confirmación semanal, se pasa de inmediato a Régimen Defensivo.',
    practicalExample: 'En el gráfico interactivo del sistema, la EMA 50W se dibuja como la Línea Azul continua.'
  },
  {
    id: 'rsi14',
    term: 'RSI de 14 períodos (Gatillo Táctico de Sobreventa)',
    tag: 'Técnico',
    shortDesc: 'Índice de Fuerza Relativa que mide la velocidad y el cambio de los movimientos de precio.',
    detailedDesc: 'En la metodología de Cava, el RSI semanal se utiliza como un disparador o gatillo de precisión. No se compra cuando el RSI está en 70 (sobrecompra o euforia). Se espera pacientemente a que se produzca una corrección que lleve el RSI a niveles de ≤ 40 en el S&P 500 o ≤ 42 en el Oro, siempre que la tendencia de fondo siga alcista.',
    cavaRule: 'RSI ≤ 40 con precio por encima de la EMA 50W = Oportunidad Asimétrica ("Home Run"). Stop ceñido bajo el mínimo semanal.',
    practicalExample: 'Comprar en un RSI de 35 en un activo con tendencia alcista sana ofrece el mejor ratio rentabilidad/riesgo del mercado.'
  },
  {
    id: 'asymmetric-trade',
    term: 'Operación Asimétrica ("Home Run")',
    tag: 'Estrategia',
    shortDesc: 'Operación donde el riesgo de pérdida está estrictamente acotado y el potencial de ganancia es desproporcionadamente mayor.',
    detailedDesc: 'Un inversor inteligente nunca arriesga 1 € para ganar 1 €. Cava busca momentos donde el pánico puntual abarata un activo de calidad con tendencia sana. Si se compra en ese punto con un stop loss a un 2-3% de distancia, y el rebote potencial es del 15-25%, la asimetría matemática es de 1:5 o superior.',
    cavaRule: 'Nunca entres en una operación si la relación beneficio/riesgo no es de al menos 3 a 1 con stop definido de antemano.',
    practicalExample: 'Comprar S&P 500 tras un susto geopolítico en RSI 38, arriesgando un 2% con stop loss, buscando un objetivo de retorno del +12%.'
  },
  {
    id: 'smart-money',
    term: 'Dinero Inteligente vs Manos Débiles',
    tag: 'Psicología',
    shortDesc: 'Diferenciación entre inversores institucionales con acceso a liquidez y el público minorista emocional.',
    detailedDesc: 'Las "manos fuertes" acumulan activos discretamente durante las fases de pánico y sobreventa, y distribuyen (venden) sus posiciones en las fases de euforia cuando las noticias en televisión son radiantes. Las "manos débiles" hacen exactamente lo contrario: compran en máximos llevadas por el FOMO (miedo a quedarse fuera) y venden en pánico en los mínimos.',
    cavaRule: 'Sigue siempre las huellas del dinero inteligente (el crédito HYG y los flujos monetarios), nunca la opinión de las masas.',
    practicalExample: 'Cuando las noticias anuncian el fin del mundo pero el RSI está en 32 y las manos fuertes dejan de vender, es momento de acumular.'
  },
  {
    id: 'us10y',
    term: 'Rendimiento del Bono a 10 Años (US10Y) vs PIB Nominal',
    tag: 'Crédito',
    shortDesc: 'El tipo de interés libre de riesgo de referencia global frente al crecimiento económico de EE.UU.',
    detailedDesc: 'El bono a 10 años marca el coste de capital para hipotecas, préstamos corporativos y modelos de descuento de flujos de caja de las acciones. Si el rendimiento del bono supera la tasa de crecimiento del PIB nominal (actualmente en torno al 6.0% - 6.5%), los intereses asfixian la inversión productiva y reducen los múltiplos de valoración bursátil.',
    cavaRule: 'Tipos a 10 años por debajo del PIB nominal = Entorno fértil para la renta variable. Si se aproximan o superan el PIB nominal = Alerta de contracción.',
    practicalExample: 'Con un US10Y al 4.25% y un PIB nominal al 6.5%, el diferencial de +2.25% sigue siendo seguro para la bolsa.'
  },
  {
    id: 'dxy',
    term: 'Índice Dólar (DXY)',
    tag: 'Liquidez',
    shortDesc: 'Fuerza del dólar estadounidense frente a una cesta de principales divisas globales (Euro, Yen, Libra, etc.).',
    detailedDesc: 'El dólar es la moneda de reserva y de deuda global. Cuando el dólar se dispara al alza con fuerza, se produce una contracción de la liquidez mundial: encarece la deuda denominada en dólares para empresas extranjeras y penaliza los beneficios de las multinacionales del S&P 500 al repatriar ingresos.',
    cavaRule: 'Un Dólar débil o estable es viento de cola para la bolsa y el oro. Un Dólar disparándose al alza es viento de cara (Regla R8).',
    practicalExample: 'DXY > 105 suele generar turbulencias en activos de riesgo; DXY cayendo hacia 100 relaja las condiciones financieras.'
  },
  {
    id: 'opex',
    term: 'Vencimiento de Opciones / Cuádruple Hora Bruja (OpEx)',
    tag: 'Técnico',
    shortDesc: 'Fechas clave en las que vencen contratos de futuros y opciones sobre índices y acciones.',
    detailedDesc: 'Ocurre el tercer viernes de cada mes, y con especial fuerza en los meses trimestrales (marzo, junio, septiembre y diciembre). Durante la semana previa al vencimiento, los creadores de mercado (market makers) mueven y clavan los precios en zonas donde expiran la mayor cantidad de opciones sin valor (máximo dolor o gamma pinning).',
    cavaRule: 'En la semana previa a la cuádruple hora bruja, los movimientos del mercado suelen estar manipulados por coberturas de derivados. No tomes rupturas técnicas en falso.',
    practicalExample: 'El sistema CAVA monitoriza los días restantes hasta el próximo OpEx para alertar de ventanas de volatilidad artificial.'
  },
  {
    id: 'gold-cava',
    term: 'El Papel Estratégico del Oro (GLD)',
    tag: 'Estrategia',
    shortDesc: 'Activo de reserva fiduciaria no emitible por ningún banco central.',
    detailedDesc: 'Para José Luis Cava, el oro no es una inversión para hacerse rico de la noche a la mañana, sino el gran reaseguro de la cartera frente a la pérdida de poder adquisitivo del dinero fiduciario provocada por el gasto público descontrolado y los déficits fiscales crónicos de los gobiernos.',
    cavaRule: 'Mantener siempre entre un 15% y un 25% de la cartera en oro físico o ETCs respaldados en oro físico.',
    practicalExample: 'Durante las grandes crisis inflacionarias o caídas de divisas, el oro preserva el poder de compra real mientras el dinero en cuenta se devalúa.'
  }
];

export const CavaTheoryView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('Todos');
  const [openCardId, setOpenCardId] = useState<string | null>('hyg');
  const [activeTab, setActiveTab] = useState<'regimes' | 'layers' | 'glossary' | 'commandments'>('regimes');

  const filteredGlossary = useMemo(() => {
    return GLOSSARY_TERMS.filter((term) => {
      const matchesSearch =
        term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.detailedDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.cavaRule.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = selectedTag === 'Todos' || term.tag === selectedTag;
      return matchesSearch && matchesTag;
    });
  }, [searchQuery, selectedTag]);

  return (
    <div className="space-y-8 animate-fade-in text-slate-100 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <BookOpen className="w-5 h-5" />
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                Manual Técnico y Metodología Oficial
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                José Luis Cava
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Enciclopedia del Sistema Cava Macro
            </h1>
            <p className="text-sm md:text-base text-slate-300 mt-2 leading-relaxed">
              Descubre la lógica, indicadores y reglas de decisión que hacen que este sistema
              proteja tu capital en los techos de mercado y dispare compras con descuento en los suelos de pánico.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 md:p-5 shrink-0 min-w-[240px]">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
              La Regla de Oro de Cava
            </span>
            <blockquote className="text-xs italic text-amber-300 font-medium border-l-2 border-amber-400 pl-3 my-1">
              «En bolsa, la primera regla es no perder dinero. La rentabilidad viene sola cuando el dinero inteligente acompaña.»
            </blockquote>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('regimes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'regimes'
                ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20 font-black'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <PieChart className="w-4 h-4" /> Los 4 Regímenes y Cartera
          </button>
          <button
            onClick={() => setActiveTab('layers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'layers'
                ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20 font-black'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" /> Las 3 Capas y Reglas R1-R8
          </button>
          <button
            onClick={() => setActiveTab('glossary')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'glossary'
                ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20 font-black'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Glosario de Términos (A a Z)
          </button>
          <button
            onClick={() => setActiveTab('commandments')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'commandments'
                ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20 font-black'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4" /> El Decálogo del Inversor
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: LOS 4 REGÍMENES DE MERCADO                            */}
      {/* ============================================================ */}
      {activeTab === 'regimes' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <PieChart className="w-5 h-5 text-yellow-400" />
              Los 4 Regímenes de Mercado y Asignación Táctica de Capital
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              El sistema CAVA nunca invierte al 100% en renta variable a ciegas. Clasifica el entorno en 4 estados dinámicos
              y rebalancea la proporción entre Renta Variable (S&P 500), Oro (GLD) y Fondos Monetarios (Liquidez al 3%+).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Régimen 1: Expansión Plena */}
            <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-5 relative overflow-hidden shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> 1. EXPANSIÓN PLENA (Risk-On Total)
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">Confluencia ≥ 60/100</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Viento a favor en todos los motores macro</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                El crédito corporativo (HYG) acompaña, la bolsa cotiza por encima de su media de 50 semanas y la liquidez neta se expande.
                No hay riesgos asfixiantes de tipos ni cuádruples horas brujas hostiles.
              </p>
              <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 mb-3">
                <span className="text-[11px] font-bold text-emerald-400 block mb-1">Distribución Táctica de Cartera:</span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono font-bold">
                  <div className="bg-emerald-950/30 border border-emerald-500/30 p-2 rounded-lg text-emerald-300">
                    S&P 500: 75%
                  </div>
                  <div className="bg-amber-950/30 border border-amber-500/30 p-2 rounded-lg text-amber-300">
                    Oro: 15%
                  </div>
                  <div className="bg-blue-950/30 border border-blue-500/30 p-2 rounded-lg text-blue-300">
                    Liquidez: 10%
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 italic">
                <strong>Estrategia Cava:</strong> Aportaciones periódicas sistemáticas, dejar correr las ganancias y no dejarse asustar por titulares catastrofistas.
              </p>
            </div>

            {/* Régimen 2: Oportunidad Asimétrica */}
            <div className="bg-slate-900/90 border border-blue-500/30 rounded-2xl p-5 relative overflow-hidden shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" /> 2. OPORTUNIDAD ASIMÉTRICA (Dip de Pánico / Home Run)
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">Gatillo RSI ≤ 40</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Pánico temporal en un activo estructuralmente alcista</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                La bolsa o el oro sufren una corrección rápida por un susto de noticias, pero los cimientos macro y la liquidez siguen completamente sanos.
                Es el momento de comprar con descuento cuando el resto del mercado está asustado.
              </p>
              <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 mb-3">
                <span className="text-[11px] font-bold text-blue-400 block mb-1">Distribución Táctica de Cartera:</span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono font-bold">
                  <div className="bg-blue-950/30 border border-blue-500/30 p-2 rounded-lg text-blue-300">
                    S&P 500: 60%
                  </div>
                  <div className="bg-amber-950/30 border border-amber-500/30 p-2 rounded-lg text-amber-300">
                    Oro: 20%
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700 p-2 rounded-lg text-slate-300">
                    Liquidez: 20%
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 italic">
                <strong>Estrategia Cava:</strong> Disparar compras con stop loss ceñido milimétricamente bajo el mínimo semanal. Si rebota, se gana mucho; si rompe, se pierde muy poco.
              </p>
            </div>

            {/* Régimen 3: Divergencia Bajista */}
            <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 relative overflow-hidden shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> 3. DIVERGENCIA BAJISTA (Alerta de Trampa)
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">Regla R2 Activa</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">La bolsa sube pero el dinero inteligente se retira</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                El S&P 500 sigue marcando máximos o manteniéndose arriba, pero el crédito corporativo (HYG) ha roto a la baja o la liquidez neta drena con fuerza.
                Las manos fuertes están vendiendo silenciosamente a los minoristas.
              </p>
              <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 mb-3">
                <span className="text-[11px] font-bold text-amber-400 block mb-1">Distribución Táctica de Cartera:</span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono font-bold">
                  <div className="bg-amber-950/30 border border-amber-500/30 p-2 rounded-lg text-amber-300">
                    S&P 500: 20% (Stops)
                  </div>
                  <div className="bg-amber-950/30 border border-amber-500/30 p-2 rounded-lg text-amber-300">
                    Oro: 25%
                  </div>
                  <div className="bg-blue-950/30 border border-blue-500/30 p-2 rounded-lg text-blue-300">
                    Liquidez: 55%
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 italic">
                <strong>Estrategia Cava:</strong> Prohibido abrir nuevas compras. Ceñir stops al milímetro en la renta variable restante y resguardar el 55% en fondos monetarios.
              </p>
            </div>

            {/* Régimen 4: Régimen Defensivo */}
            <div className="bg-slate-900/90 border border-rose-500/30 rounded-2xl p-5 relative overflow-hidden shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> 4. RÉGIMEN DEFENSIVO (Modo Búnker)
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">Regla R1 Veto / Confluencia &lt; 40</span>
              </div>
              <h3 className="text-base font-bold text-white mb-2">Riesgo sistémico o ruptura de la tendencia estructural</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                La liquidez se ha secado por completo o el S&P 500 ha perforado su media móvil de 50 semanas.
                El mercado entra en fase de capitulación o mercado bajista prolongado.
              </p>
              <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 mb-3">
                <span className="text-[11px] font-bold text-rose-400 block mb-1">Distribución Táctica de Cartera:</span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono font-bold">
                  <div className="bg-rose-950/30 border border-rose-500/30 p-2 rounded-lg text-rose-300">
                    S&P 500: 0%
                  </div>
                  <div className="bg-amber-950/30 border border-amber-500/30 p-2 rounded-lg text-amber-300">
                    Oro: 25%
                  </div>
                  <div className="bg-blue-950/30 border border-blue-500/30 p-2 rounded-lg text-blue-300">
                    Liquidez: 75%
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 italic">
                <strong>Estrategia Cava:</strong> 0% en bolsa. Todo el capital protegido en fondos monetarios y oro. Dormir tranquilo mientras el mercado cae y esperar la reconstrucción de la liquidez.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: LAS 3 CAPAS Y REGLAS R1 A R8                          */}
      {/* ============================================================ */}
      {activeTab === 'layers' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-yellow-400" />
              La Arquitectura de 3 Capas y las 8 Reglas Cruzadas
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Cava no toma decisiones con un único indicador aislado. Utiliza una matriz jerárquica de confluencia:
              la Capa 1 manda sobre la Capa 2, y la Capa 2 manda sobre la Capa 3.
            </p>
          </div>

          <div className="space-y-4">
            {/* Layer 1 */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 font-black flex items-center justify-center border border-blue-500/30 text-sm">
                  L1
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Capa 1: Liquidez y Crédito (Los Cimientos)</h3>
                  <span className="text-xs text-blue-400 font-mono">Peso Máximo: 40 puntos</span>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Evalúa si hay dinero disponible en el sistema bancario e institucional para sostener compras de bolsa.
                Si esta capa falla, cualquier subida en las otras dos capas es un espejismo.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <strong className="text-slate-200 block mb-0.5">HYG vs Media 20W</strong>
                  <span className="text-slate-400">¿El bono corporativo de alto riesgo acompaña la subida de las acciones?</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <strong className="text-slate-200 block mb-0.5">Liquidez Neta Fed</strong>
                  <span className="text-slate-400">Balance Fed − TGA − RRP. La gasolina real del sistema financiero.</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <strong className="text-slate-200 block mb-0.5">US10Y vs PIB Nominal</strong>
                  <span className="text-slate-400">Garantiza que el coste del dinero no estrangule los márgenes empresariales.</span>
                </div>
              </div>
            </div>

            {/* Layer 2 */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center border border-emerald-500/30 text-sm">
                  L2
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Capa 2: Tendencia Estructural (El Sentido de la Marcha)</h3>
                  <span className="text-xs text-emerald-400 font-mono">Peso Máximo: 35 puntos</span>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Determina la dirección estructural a medio/largo plazo. Filtra el ruido del corto plazo mediante medias de 50 semanas
                y la amplitud del mercado (no basta con que suban 5 gigantes tecnológicas, debe subir la economía general).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <strong className="text-slate-200 block mb-0.5">S&P 500 vs EMA 50W</strong>
                  <span className="text-slate-400">Línea divisoria estructural. Por encima = mercado alcista.</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <strong className="text-slate-200 block mb-0.5">Oro vs EMA 50W</strong>
                  <span className="text-slate-400">Verifica la salud de la reserva de valor frente a la devaluación monetaria.</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <strong className="text-slate-200 block mb-0.5">Amplitud IWM / SPY</strong>
                  <span className="text-slate-400">Compara las pequeñas empresas (Russell 2000) con las megacaps.</span>
                </div>
              </div>
            </div>

            {/* Layer 3 */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 font-black flex items-center justify-center border border-amber-500/30 text-sm">
                  L3
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Capa 3: Gatillo Táctico de Entrada (Timing y Opciones)</h3>
                  <span className="text-xs text-amber-400 font-mono">Peso Máximo: 25 puntos</span>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                Es el gatillo fino del francotirador. No se compra en subidas verticales. Se espera a que el RSI de 14 semanas
                caiga a niveles de sobreventa o a que se despejen las trampas de vencimiento de opciones (OpEx).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <strong className="text-slate-200 block mb-0.5">RSI 14 Semanal ≤ 40</strong>
                  <span className="text-slate-400">Detecta los suelos de pánico momentáneo para compras asimétricas.</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <strong className="text-slate-200 block mb-0.5">Estructura VIX / VIX3M</strong>
                  <span className="text-slate-400">Contango (&lt;1.0) = Calma institucional. Backwardation (&gt;1.0) = Pánico.</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <strong className="text-slate-200 block mb-0.5">Ventana de Opciones (OpEx)</strong>
                  <span className="text-slate-400">Alerta de manipulación de precios previa al tercer viernes de mes.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cross Rules (R1 - R8) Summary */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-base font-bold text-white mb-3">Las 8 Reglas Cruzadas de Cava (De R1 a R8)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="font-bold text-rose-400 block mb-1">R1: Veto Estricto de Liquidez</span>
                Si HYG y la liquidez se rompen simultáneamente, se anula la puntuación y se fuerza el Régimen Defensivo (techo de 35 puntos).
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="font-bold text-amber-400 block mb-1">R2: Trampa Alcista (Bull Trap)</span>
                S&P 500 alcista pero HYG bajista. El dinero inteligente no acompaña la subida de las acciones.
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-300 block mb-1">R3: Presión por Tipos Elevados</span>
                US10Y supera el 5.0%, endureciendo el crédito y amenazando los múltiplos de valoración PER.
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="font-bold text-slate-300 block mb-1">R4: Riesgo de Euforia / Complacencia</span>
                VIX &lt; 14 con S&P 500 en máximos. El mercado no percibe ningún riesgo; momento de prudencia.
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="font-bold text-blue-400 block mb-1">R5: Compra Asimétrica S&P 500</span>
                S&P 500 sobrevendido (RSI ≤ 40) en tendencia estructural sana. Gatillo de entrada óptimo.
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="font-bold text-amber-300 block mb-1">R6: Compra Asimétrica en Oro</span>
                Oro sobrevendido (RSI ≤ 42) en tendencia estructural alcista.
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="font-bold text-rose-300 block mb-1">R7: Drenaje de Liquidez Neta Fed</span>
                Contracción semanal acelerada de la liquidez disponible bancaria.
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="font-bold text-amber-400 block mb-1">R8: Viento en Contra por Dólar (DXY)</span>
                Dólar fuerte (DXY &gt; 104) drenando liquidez de los mercados emergentes e internacionales.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: GLOSARIO DE TÉRMINOS (A A Z)                          */}
      {/* ============================================================ */}
      {activeTab === 'glossary' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar término, indicador o concepto Cava (ej. HYG, Liquidez, RSI, OpEx)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-400/60 transition"
                />
              </div>

              {/* Tag filters */}
              <div className="flex flex-wrap gap-1.5">
                {['Todos', 'Crédito', 'Liquidez', 'Tendencia', 'Técnico', 'Estrategia', 'Psicología'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                      selectedTag === tag
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              Mostrando {filteredGlossary.length} de {GLOSSARY_TERMS.length} términos explicados
            </div>
          </div>

          {/* Terms Accordion */}
          <div className="space-y-3">
            {filteredGlossary.map((term) => {
              const isOpen = openCardId === term.id;
              return (
                <div
                  key={term.id}
                  className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition"
                >
                  <button
                    type="button"
                    onClick={() => setOpenCardId(isOpen ? null : term.id)}
                    className="w-full p-4 md:p-5 text-left flex items-start justify-between gap-4 hover:bg-slate-800/40 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-800 text-yellow-400 border border-slate-700">
                          {term.tag}
                        </span>
                        <h3 className="text-sm md:text-base font-bold text-white tracking-tight">
                          {term.term}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400">{term.shortDesc}</p>
                    </div>

                    <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400 shrink-0 mt-1">
                      {isOpen ? <ChevronUp className="w-4 h-4 text-yellow-400" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="p-4 md:p-6 pt-2 border-t border-slate-800/70 bg-slate-950/60 space-y-4 animate-fade-in text-xs">
                      <div>
                        <strong className="text-slate-200 block mb-1 font-semibold">Explicación Detallada:</strong>
                        <p className="text-slate-300 leading-relaxed">{term.detailedDesc}</p>
                      </div>

                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                        <strong className="text-amber-300 block mb-0.5 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> La Regla Práctica de Cava:
                        </strong>
                        <p className="text-amber-200/90 leading-relaxed">{term.cavaRule}</p>
                      </div>

                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-slate-400">
                        <strong className="text-slate-300 block mb-0.5 font-semibold">Ejemplo en el Mercado Real:</strong>
                        <p>{term.practicalExample}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: EL DECÁLOGO DEL INVERSOR DE CAVA                      */}
      {/* ============================================================ */}
      {activeTab === 'commandments' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-yellow-400" />
              El Decálogo de Oro de José Luis Cava
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              10 principios irrenunciables para no arruinarse en los mercados financieros y construir riqueza a largo plazo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                num: '01',
                title: 'La primera regla es no perder dinero',
                desc: 'La segunda regla es recordar siempre la primera. Perder un 50% requiere ganar un 100% solo para recuperar el punto de partida.'
              },
              {
                num: '02',
                title: 'El dinero inteligente nunca compra en euforia',
                desc: 'Cuando el taxista, el barbero y los telediarios te recomienden comprar acciones, las manos fuertes ya están vendiendo y repartiendo papel.'
              },
              {
                num: '03',
                title: 'El crédito corporativo (HYG) manda sobre la bolsa',
                desc: 'Las acciones pueden mentir y rebotar por inercia; el mercado de bonos nunca miente. Si el crédito se rompe, la bolsa caerá detrás.'
              },
              {
                num: '04',
                title: 'Sin liquidez no hay fiesta',
                desc: 'La bolsa no sube por los beneficios futuros ni por la geopolítica; sube cuando hay exceso de reservas bancarias en el sistema financiero.'
              },
              {
                num: '05',
                title: 'El Stop Loss no se negocia: salva vidas financieras',
                desc: 'Un buen inversor asume pérdidas pequeñas con naturalidad. Quien no corta una pérdida del 3% terminará atrapado en una del 40%.'
              },
              {
                num: '06',
                title: 'El Oro es tu seguro contra los políticos y los bancos centrales',
                desc: 'Los gobiernos gastan más de lo que ingresan y devalúan la moneda fiduciaria. El oro físico preserva el poder adquisitivo intergeneracional.'
              },
              {
                num: '07',
                title: 'Pólvora Seca: La liquidez también es una posición',
                desc: 'Tener efectivo en fondos monetarios rindiendo sin riesgo no es perder el tiempo: es tener munición lista para el día del pánico.'
              },
              {
                num: '08',
                title: 'Busca siempre la Asimetría ("Home Run")',
                desc: 'Arriesga solo cuando el potencial de subida sea al menos tres veces superior al riesgo acotado del stop loss.'
              },
              {
                num: '09',
                title: 'El mercado es reactivo, no predictivo',
                desc: 'No intentes adivinar lo que hará la Fed o qué pasará el mes que viene. Reacciona a los hechos objetivos que marcan los tacómetros hoy.'
              },
              {
                num: '10',
                title: 'Humildad y Paciencia',
                desc: 'El mercado es una máquina de transferir dinero de los impacientes a los pacientes. Si no hay señal clara, quédate quieto.'
              }
            ].map((rule) => (
              <div
                key={rule.num}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 md:p-5 flex gap-4 items-start shadow-md"
              >
                <span className="text-xl font-black text-amber-400 font-mono bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl shrink-0">
                  {rule.num}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">{rule.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
