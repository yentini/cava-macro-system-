import React, { useState, useEffect, useRef } from 'react';
import { ChartDataPoint } from '../types';
import { fetchChartHistory } from '../services/api';
import {
  LineChart,
  Calendar,
  Clock,
  Sparkles,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Info
} from 'lucide-react';

interface TechnicalChartsProps {
  spyData: ChartDataPoint[];
  goldData: ChartDataPoint[];
  hygData: ChartDataPoint[];
}

type AssetType = 'spy' | 'gold' | 'hyg';
type PeriodType = '6mo' | '1y' | '5y';
type IntervalType = '1d' | '1wk' | '1mo';

const ASSET_CONFIG: Record<
  AssetType,
  {
    ticker: string;
    name: string;
    assetLabel: string;
    emaLabel: string;
    priceColor: string;
    emaColor: string;
    subtitle: string;
  }
> = {
  spy: {
    ticker: 'SPY',
    name: 'S&P 500 (SPY)',
    assetLabel: 'Bolsa USA',
    emaLabel: 'Media 50 (Línea Azul de Cava)',
    priceColor: '#10b981',
    emaColor: '#3b82f6',
    subtitle: 'Vigilar cierres respecto a la media móvil semanal para filtrar el ruido diario.'
  },
  gold: {
    ticker: 'GLD',
    name: 'Oro Físico (GLD)',
    assetLabel: 'Activo Duro',
    emaLabel: 'Media 50 Semanal',
    priceColor: '#eab308',
    emaColor: '#9ca3af',
    subtitle: 'Protección contra la devaluación monetaria. RSI ≤ 42 activa compras asimétricas.'
  },
  hyg: {
    ticker: 'HYG',
    name: 'Bonos Basura (HYG)',
    assetLabel: 'Crédito High Yield',
    emaLabel: 'Media 20 (Alerta de Crédito)',
    priceColor: '#06b6d4',
    emaColor: '#f59e0b',
    subtitle: 'Barómetro de liquidez institucional: el crédito lidera los giros de mercado.'
  }
};

export const TechnicalCharts: React.FC<TechnicalChartsProps> = ({
  spyData,
  goldData,
  hygData
}) => {
  const [activeAsset, setActiveAsset] = useState<AssetType>('spy');
  const [period, setPeriod] = useState<PeriodType>('1y');
  const [interval, setInterval] = useState<IntervalType>('1wk');
  const [chartData, setChartData] = useState<ChartDataPoint[]>(spyData);
  const [chartType, setChartType] = useState<'line' | 'candle'>('line');
  const [isLoading, setIsLoading] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync props and fetch fresh history
  useEffect(() => {
    setHoverIndex(null);
    let isCancelled = false;

    // Fast optimistic preview if standard 1y/1wk
    if (period === '1y' && interval === '1wk') {
      const initial =
        activeAsset === 'spy' ? spyData : activeAsset === 'gold' ? goldData : hygData;
      if (initial && initial.length > 0) {
        setChartData(initial);
      }
    }

    const loadData = async () => {
      setIsLoading(true);
      const ticker = ASSET_CONFIG[activeAsset].ticker;
      try {
        const points = await fetchChartHistory(ticker, period, interval);
        if (!isCancelled && points && points.length > 0) {
          setChartData(points);
        }
      } catch (err) {
        console.error('Failed to load chart points:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [activeAsset, period, interval, spyData, goldData, hygData]);

  const config = ASSET_CONFIG[activeAsset];
  const activePoint =
    hoverIndex !== null && chartData[hoverIndex]
      ? chartData[hoverIndex]
      : chartData[chartData.length - 1];

  const activePrice = activePoint?.price ?? 0;
  const activeEma = activePoint?.ema ?? activePrice;
  const activeDiff = activeEma > 0 ? ((activePrice - activeEma) / activeEma) * 100 : 0;
  const isAboveEma = activeDiff >= 0;

  // Chart Geometry
  const width = 800;
  const height = 260;
  const padLeft = 65;
  const padRight = 75;
  const padTop = 30;
  const padBottom = 40;

  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;

  const prices = chartData.map((d) => d.price);
  const emas = chartData.map((d) => d.ema || d.price);
  const highs = chartData.map((d) => d.high ?? Math.max(d.price, d.open ?? d.price));
  const lows = chartData.map((d) => d.low ?? Math.min(d.price, d.open ?? d.price));
  const minVal = Math.min(...prices, ...emas, ...lows) * 0.985;
  const maxVal = Math.max(...prices, ...emas, ...highs) * 1.015;
  const valRange = maxVal - minVal || 1;

  const getX = (idx: number) => {
    if (chartData.length <= 1) return padLeft + innerWidth / 2;
    return padLeft + (idx / (chartData.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    return padTop + innerHeight - ((val - minVal) / valRange) * innerHeight;
  };

  const pricePoints = chartData.map((d, i) => `${getX(i)},${getY(d.price)}`).join(' ');
  const emaPoints = chartData.map((d, i) => `${getX(i)},${getY(d.ema || d.price)}`).join(' ');

  // Horizontal Grid Lines (5 levels)
  const gridLevels = [0.0, 0.25, 0.5, 0.75, 1.0];

  // X-Axis Date Ticks (5 to 6 evenly distributed)
  const dateTickIndices: number[] = [];
  if (chartData.length > 0) {
    const tickCount = Math.min(6, chartData.length);
    for (let i = 0; i < tickCount; i++) {
      const idx = Math.round((i / (tickCount - 1)) * (chartData.length - 1));
      if (!dateTickIndices.includes(idx)) dateTickIndices.push(idx);
    }
  }

  // Format date nicely for ticks
  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parts[2];
      const monthNum = parseInt(parts[1], 10);
      const year = parts[0].slice(2);
      const months = [
        'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
      ];
      if (period === '5y') {
        return `${months[monthNum - 1]} '${year}`;
      }
      return `${day} ${months[monthNum - 1]}`;
    }
    return dateStr;
  };

  // Detailed human format for reference week/day in telemetry
  const getFormattedReferenceDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parts[2];
      const monthNum = parseInt(parts[1], 10);
      const year = parts[0];
      const months = [
        'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
        'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
      ];
      const monthName = months[monthNum - 1] || '';
      if (interval === '1wk') {
        return `Semana del ${day} ${monthName} ${year}`;
      } else if (interval === '1mo') {
        return `Mes de ${monthName} ${year}`;
      }
      return `Día ${day} ${monthName} ${year}`;
    }
    return dateStr;
  };

  // Exact coordinate transformation from Screen Pixels to SVG ViewBox using native CTM matrix
  const updateHoverCoordinates = (svg: SVGSVGElement, clientX: number, clientY: number) => {
    if (chartData.length === 0) return;
    let svgX: number;
    try {
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        svgX = pt.matrixTransform(ctm.inverse()).x;
      } else {
        const rect = svg.getBoundingClientRect();
        svgX = ((clientX - rect.left) / rect.width) * width;
      }
    } catch {
      const rect = svg.getBoundingClientRect();
      svgX = ((clientX - rect.left) / rect.width) * width;
    }

    // Clamp within active inner chart area
    const clampedSvgX = Math.max(padLeft, Math.min(width - padRight, svgX));
    const ratioX = (clampedSvgX - padLeft) / innerWidth;
    const closestIdx = Math.round(ratioX * (chartData.length - 1));
    setHoverIndex(Math.max(0, Math.min(chartData.length - 1, closestIdx)));
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    updateHoverCoordinates(e.currentTarget, e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length > 0) {
      updateHoverCoordinates(e.currentTarget, e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  // RSI Subchart Geometry
  const rsiHeight = 85;
  const rsiPadTop = 15;
  const rsiPadBottom = 20;
  const rsiInnerHeight = rsiHeight - rsiPadTop - rsiPadBottom;
  const getRsiY = (val: number) => {
    const clamped = Math.max(15, Math.min(85, val));
    return rsiPadTop + rsiInnerHeight - ((clamped - 15) / 70) * rsiInnerHeight;
  };

  const hasRsi = chartData.some((d) => d.rsi !== null && d.rsi !== undefined);
  const rsiPoints = hasRsi
    ? chartData.map((d, i) => `${getX(i)},${getRsiY(d.rsi ?? 50)}`).join(' ')
    : '';

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-3xl p-5 md:p-6 shadow-2xl space-y-5" ref={containerRef}>
      {/* ======================================================== */}
      {/* 1. Header con Selectores de Activo                       */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
            <LineChart className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Gráficos Interactivos de Tendencia
              </span>
            </div>
            <h3 className="text-lg md:text-xl font-black text-white tracking-tight">
              {config.name}
            </h3>
            <p className="text-xs text-gray-400">{config.subtitle}</p>
          </div>
        </div>

        {/* Asset Selector Tabs */}
        <div className="flex items-center gap-1.5 bg-gray-900/90 p-1.5 rounded-2xl border border-gray-800 self-start lg:self-auto shadow-inner">
          <button
            onClick={() => setActiveAsset('spy')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
              activeAsset === 'spy'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            S&P 500 (SPY)
          </button>
          <button
            onClick={() => setActiveAsset('gold')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
              activeAsset === 'gold'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Oro (GLD)
          </button>
          <button
            onClick={() => setActiveAsset('hyg')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
              activeAsset === 'hyg'
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Bonos Basura (HYG)
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. Sub-Barra de Configuración: Rango & Temporalidad     */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-900/60 p-3 rounded-2xl border border-gray-800/80 text-xs">
        {/* Rango Temporal (Zoom) */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-yellow-400" /> Rango:
          </span>
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-gray-800">
            {(['6mo', '1y', '5y'] as PeriodType[]).map((p) => {
              const label = p === '6mo' ? '6 Meses' : p === '1y' ? '1 Año' : '5 Años';
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 rounded-lg font-mono font-bold transition text-[11px] ${
                    period === p
                      ? 'bg-yellow-500 text-black shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Frecuencia / Vela */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-yellow-400" /> Vela:
          </span>
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-gray-800">
            {(['1d', '1wk', '1mo'] as IntervalType[]).map((intv) => {
              const label =
                intv === '1d' ? 'Diario (1D)' : intv === '1wk' ? 'Semanal (1W) ⭐' : 'Mensual (1M)';
              return (
                <button
                  key={intv}
                  onClick={() => setInterval(intv)}
                  className={`px-2.5 py-1 rounded-lg font-mono font-bold transition text-[11px] ${
                    interval === intv
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title={intv === '1wk' ? 'Metodología principal Cava con EMA 50W' : ''}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tipo de Gráfico (Línea vs Velas Japonesas) */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
            Vista:
          </span>
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-gray-800">
            <button
              onClick={() => setChartType('line')}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] flex items-center gap-1 ${
                chartType === 'line'
                  ? 'bg-amber-500 text-black shadow font-extrabold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📈 Línea
            </button>
            <button
              onClick={() => setChartType('candle')}
              className={`px-2.5 py-1 rounded-lg font-bold transition text-[11px] flex items-center gap-1 ${
                chartType === 'candle'
                  ? 'bg-amber-500 text-black shadow font-extrabold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🕯️ Velas
            </button>
          </div>
        </div>

        {/* Refresh / Loader indicator */}
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="text-[11px] text-yellow-400 flex items-center gap-1.5 font-mono animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Cargando velas...
            </span>
          ) : (
            <span className="text-[11px] text-gray-500 font-mono">
              {chartData.length} puntos graficados
            </span>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. Panel de Lectura Dinámica del Cursor (Crosshair Info) */}
      {/* ======================================================== */}
      <div className="bg-black/50 border border-gray-800/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-bold uppercase text-[10px]">
            {interval === '1wk' ? 'Semana de Ref:' : interval === '1mo' ? 'Mes de Ref:' : 'Día de Ref:'}
          </span>
          <span className="text-amber-300 font-mono font-bold text-sm bg-gray-900 px-2.5 py-0.5 rounded-lg border border-amber-500/40 shadow-sm flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            {getFormattedReferenceDate(activePoint?.date)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-bold uppercase text-[10px]">Cotización:</span>
          <span
            className="font-mono font-black text-sm px-2 py-0.5 rounded-lg"
            style={{ color: config.priceColor, backgroundColor: `${config.priceColor}15` }}
          >
            ${activePrice.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-bold uppercase text-[10px]">{config.emaLabel}:</span>
          <span className="font-mono font-bold text-sm text-gray-200 bg-gray-900 px-2 py-0.5 rounded-lg border border-gray-800">
            ${activeEma.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-bold uppercase text-[10px]">Distancia vs Media:</span>
          <span
            className={`font-mono font-extrabold text-sm px-2 py-0.5 rounded-lg flex items-center gap-1 ${
              isAboveEma
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
            }`}
          >
            {isAboveEma ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {activeDiff >= 0 ? `+${activeDiff.toFixed(2)}%` : `${activeDiff.toFixed(2)}%`}
          </span>
        </div>

        {activePoint?.rsi !== undefined && activePoint.rsi !== null && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-bold uppercase text-[10px]">RSI(14):</span>
            <span className="font-mono font-bold text-sm text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/30">
              {activePoint.rsi.toFixed(1)}
            </span>
          </div>
        )}

        {/* OHLC metrics when hovering in candle or detailed mode */}
        {activePoint?.open !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-bold uppercase text-[10px]">OHLC:</span>
            <span className="font-mono text-xs text-gray-300 bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-800 flex gap-2">
              <span>A: <strong className="text-gray-100">${activePoint.open.toFixed(2)}</strong></span>
              <span>M: <strong className="text-emerald-400">${(activePoint.high ?? activePoint.price).toFixed(2)}</strong></span>
              <span>m: <strong className="text-rose-400">${(activePoint.low ?? activePoint.price).toFixed(2)}</strong></span>
              <span>C: <strong style={{ color: config.priceColor }}>${activePoint.price.toFixed(2)}</strong></span>
            </span>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 4. Gráfico SVG Principal con Ejes X e Y Completos       */}
      {/* ======================================================== */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[360px] overflow-visible select-none cursor-crosshair block"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setHoverIndex(null)}
        >
          {/* Defs for gradients and shadow */}
          <defs>
            <filter id="glow-badge" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Background area fill */}
          <rect
            x={padLeft}
            y={padTop}
            width={innerWidth}
            height={innerHeight}
            fill="#0f172a"
            rx="12"
            opacity="0.4"
          />

          {/* Horizontal Grid Lines & Y-Axis Labels */}
          {gridLevels.map((pct, i) => {
            const y = padTop + pct * innerHeight;
            const val = maxVal - pct * valRange;
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#1f2937"
                  strokeWidth="1"
                  strokeDasharray={i === 0 || i === gridLevels.length - 1 ? 'none' : '3 3'}
                />
                {/* Left Y-Axis Label */}
                <text
                  x={padLeft - 10}
                  y={y + 3.5}
                  fill="#9ca3af"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  ${val.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Vertical Grid Lines & X-Axis Date Labels */}
          {dateTickIndices.map((idx, i) => {
            const x = getX(idx);
            const pt = chartData[idx];
            if (!pt) return null;
            return (
              <g key={i}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + innerHeight}
                  stroke="#1f2937"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                  opacity="0.7"
                />
                {/* Date Tick Label on Bottom X-Axis */}
                <text
                  x={x}
                  y={padTop + innerHeight + 18}
                  fill="#9ca3af"
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="monospace"
                  fontWeight="500"
                >
                  {formatDateLabel(pt.date)}
                </text>
              </g>
            );
          })}

          {/* EMA Polyline */}
          <polyline
            fill="none"
            stroke={config.emaColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={emaPoints}
            opacity="0.9"
          />

          {/* Line Chart View */}
          {chartType === 'line' && (
            <polyline
              fill="none"
              stroke={config.priceColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pricePoints}
            />
          )}

          {/* Candlestick Chart View */}
          {chartType === 'candle' && (
            <g className="candlesticks">
              {chartData.map((d, i) => {
                const o = d.open ?? d.price;
                const c = d.price;
                const h = d.high ?? Math.max(o, c);
                const l = d.low ?? Math.min(o, c);
                const isGreen = c >= o;
                const candleColor = isGreen ? '#10b981' : '#ef4444';
                const wickX = getX(i);
                const topBody = getY(Math.max(o, c));
                const btmBody = getY(Math.min(o, c));
                const bodyHeight = Math.max(2, btmBody - topBody);
                const candleW = Math.max(3, Math.min(10, (innerWidth / chartData.length) * 0.65));

                return (
                  <g key={i}>
                    {/* Upper and Lower Wick */}
                    <line
                      x1={wickX}
                      y1={getY(h)}
                      x2={wickX}
                      y2={getY(l)}
                      stroke={candleColor}
                      strokeWidth="1.2"
                      opacity="0.85"
                    />
                    {/* Candle Real Body */}
                    <rect
                      x={wickX - candleW / 2}
                      y={topBody}
                      width={candleW}
                      height={bodyHeight}
                      fill={candleColor}
                      stroke={candleColor}
                      strokeWidth="0.5"
                      rx="1"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Interactive Hover Crosshair */}
          {hoverIndex !== null && chartData[hoverIndex] && (
            <g>
              {/* Vertical Crosshair Line */}
              <line
                x1={getX(hoverIndex)}
                y1={padTop}
                x2={getX(hoverIndex)}
                y2={padTop + innerHeight}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />

              {/* Floating highlighted X-axis reference badge under crosshair */}
              {(() => {
                const hoverX = getX(hoverIndex);
                const clampedX = Math.max(padLeft + 48, Math.min(width - padRight - 48, hoverX));
                const badgeLabel =
                  interval === '1wk'
                    ? `Sem: ${formatDateLabel(chartData[hoverIndex].date)}`
                    : interval === '1mo'
                    ? formatDateLabel(chartData[hoverIndex].date)
                    : `Día: ${formatDateLabel(chartData[hoverIndex].date)}`;
                return (
                  <g transform={`translate(${clampedX}, ${padTop + innerHeight + 17})`}>
                    <rect
                      x="-46"
                      y="-11"
                      width="92"
                      height="20"
                      rx="6"
                      fill="#f59e0b"
                      filter="url(#glow-badge)"
                    />
                    <text
                      x="0"
                      y="3.5"
                      fill="#000000"
                      fontSize="10"
                      fontWeight="800"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {badgeLabel}
                    </text>
                  </g>
                );
              })()}

              {/* Hover Point on EMA */}
              <circle
                cx={getX(hoverIndex)}
                cy={getY(chartData[hoverIndex].ema || chartData[hoverIndex].price)}
                r="4.5"
                fill={config.emaColor}
                stroke="#111827"
                strokeWidth="2"
              />

              {/* Hover Point on Price */}
              <circle
                cx={getX(hoverIndex)}
                cy={getY(chartData[hoverIndex].price)}
                r="6"
                fill={config.priceColor}
                stroke="#ffffff"
                strokeWidth="2"
              />

              {/* Floating Tooltip Box directly beside cursor */}
              {(() => {
                const hoverX = getX(hoverIndex);
                const hoverY = getY(chartData[hoverIndex].price);
                const isRightHalf = hoverX > padLeft + innerWidth / 2;
                const tooltipX = isRightHalf ? hoverX - 165 : hoverX + 15;
                const tooltipY = Math.max(padTop + 8, Math.min(padTop + innerHeight - 70, hoverY - 35));
                const pt = chartData[hoverIndex];
                const ptDiff = pt.ema ? ((pt.price - pt.ema) / pt.ema) * 100 : 0;
                const headerText =
                  interval === '1wk'
                    ? `SEMANA: ${formatDateLabel(pt.date)}`
                    : interval === '1mo'
                    ? `MES: ${formatDateLabel(pt.date)}`
                    : `DÍA: ${formatDateLabel(pt.date)}`;

                return (
                  <g transform={`translate(${tooltipX}, ${tooltipY})`}>
                    <rect
                      x="0"
                      y="0"
                      width="150"
                      height="64"
                      rx="8"
                      fill="#0b0f19"
                      stroke="#374151"
                      strokeWidth="1.5"
                      filter="url(#glow-badge)"
                      opacity="0.95"
                    />
                    {/* Header: Date / Week */}
                    <text x="10" y="17" fill="#f59e0b" fontSize="9.5" fontWeight="700" fontFamily="monospace">
                      {headerText}
                    </text>
                    {/* Price */}
                    <text x="10" y="35" fill="#ffffff" fontSize="13" fontWeight="800" fontFamily="monospace">
                      ${pt.price.toFixed(2)}
                    </text>
                    {/* EMA & Diff */}
                    <text x="10" y="52" fill="#9ca3af" fontSize="9.5" fontFamily="monospace">
                      EMA: ${pt.ema ? pt.ema.toFixed(1) : '—'} ({ptDiff >= 0 ? `+${ptDiff.toFixed(1)}%` : `${ptDiff.toFixed(1)}%`})
                    </text>
                  </g>
                );
              })()}
            </g>
          )}

          {/* Current Right Y-Axis Badge (Last Price) */}
          {chartData.length > 0 && (
            <g transform={`translate(${width - padRight + 6}, ${getY(chartData[chartData.length - 1].price) - 10})`}>
              <rect
                x="0"
                y="0"
                width="64"
                height="20"
                rx="6"
                fill={config.priceColor}
                filter="url(#glow-badge)"
              />
              <text
                x="32"
                y="13.5"
                fill="#000000"
                fontSize="10"
                fontWeight="900"
                textAnchor="middle"
                fontFamily="monospace"
              >
                ${chartData[chartData.length - 1].price.toFixed(1)}
              </text>
            </g>
          )}

          {/* Transparent interaction capture overlay covering the full inner area */}
          <rect
            x={padLeft}
            y={padTop}
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            className="cursor-crosshair pointer-events-auto"
          />
        </svg>
      </div>

      {/* ======================================================== */}
      {/* 5. Sub-Gráfico RSI(14) (Para Oro y SPY)                 */}
      {/* ======================================================== */}
      {hasRsi && (
        <div className="pt-3 border-t border-gray-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-300 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              Oscilador RSI(14) {interval === '1wk' ? 'Semanal' : interval === '1d' ? 'Diario' : 'Mensual'}
            </span>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="text-amber-400 font-bold">Euforia &gt; 70</span>
              <span className="text-emerald-400 font-bold">Gatillo Compra &le; {activeAsset === 'gold' ? '42' : '40'}</span>
            </div>
          </div>

          <svg
            viewBox={`0 0 ${width} ${rsiHeight}`}
            className="w-full h-auto max-h-[110px] overflow-visible select-none cursor-crosshair block"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverIndex(null)}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => setHoverIndex(null)}
          >
            {/* Background area fill */}
            <rect
              x={padLeft}
              y={rsiPadTop}
              width={innerWidth}
              height={rsiInnerHeight}
              fill="#0f172a"
              rx="8"
              opacity="0.4"
            />

            {/* Overbought Level 70 */}
            <line
              x1={padLeft}
              y1={getRsiY(70)}
              x2={width - padRight}
              y2={getRsiY(70)}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              opacity="0.7"
            />
            <text x={padLeft - 8} y={getRsiY(70) + 3} fill="#f59e0b" fontSize="9" textAnchor="end" fontFamily="monospace">
              70
            </text>

            {/* Neutral Level 50 */}
            <line
              x1={padLeft}
              y1={getRsiY(50)}
              x2={width - padRight}
              y2={getRsiY(50)}
              stroke="#374151"
              strokeDasharray="2 2"
            />

            {/* Oversold Level 40/42 */}
            <line
              x1={padLeft}
              y1={getRsiY(activeAsset === 'gold' ? 42 : 40)}
              x2={width - padRight}
              y2={getRsiY(activeAsset === 'gold' ? 42 : 40)}
              stroke="#10b981"
              strokeDasharray="3 3"
              opacity="0.7"
            />
            <text
              x={padLeft - 8}
              y={getRsiY(activeAsset === 'gold' ? 42 : 40) + 3}
              fill="#10b981"
              fontSize="9"
              textAnchor="end"
              fontFamily="monospace"
            >
              {activeAsset === 'gold' ? '42' : '40'}
            </text>

            {/* RSI Line */}
            <polyline
              fill="none"
              stroke="#c084fc"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={rsiPoints}
            />

            {/* Hover indicator on RSI */}
            {hoverIndex !== null && chartData[hoverIndex]?.rsi !== undefined && (
              <circle
                cx={getX(hoverIndex)}
                cy={getRsiY(chartData[hoverIndex].rsi ?? 50)}
                r="4"
                fill="#c084fc"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            )}

            {/* Transparent RSI interaction overlay */}
            <rect
              x={padLeft}
              y={rsiPadTop}
              width={innerWidth}
              height={rsiInnerHeight}
              fill="transparent"
              className="cursor-crosshair pointer-events-auto"
            />
          </svg>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. Leyenda y Explicación Metodológica                     */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-800 text-xs text-gray-400">
        <div className="flex items-center gap-1.5 text-[11px]">
          <Info className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <span>
            Pasa el ratón o desliza el dedo sobre la curva para explorar la cotización y la media en cada fecha.
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 rounded" style={{ backgroundColor: config.priceColor }} />
            <span className="font-semibold text-gray-300">Precio Cotización</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-1 rounded" style={{ backgroundColor: config.emaColor }} />
            <span className="font-semibold text-gray-300">{config.emaLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
