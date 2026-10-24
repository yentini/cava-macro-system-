import React, { useState, useEffect } from 'react';
import { GaugeMetric } from '../types';
import { HelpCircle, X, Lightbulb, Compass, BookOpen, ShieldCheck, Calculator } from 'lucide-react';

interface GaugeChartProps {
  metric: GaugeMetric;
  size?: 'normal' | 'compact';
}

export const GaugeChart: React.FC<GaugeChartProps> = ({ metric, size = 'normal' }) => {
  const [showExplanation, setShowExplanation] = useState(false);

  const {
    current_value,
    min_value,
    max_value,
    zones,
    name,
    display_value,
    status_label,
    status_color,
    description,
    what_it_measures,
    meaning,
    recommendation,
    how_calculated
  } = metric;

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowExplanation(false);
    };
    if (showExplanation) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showExplanation]);

  // Clamp value to [min_value, max_value]
  const clampedVal = Math.min(Math.max(current_value, min_value), max_value);
  const ratio = (clampedVal - min_value) / (max_value - min_value);
  // Angle: -90deg (far left / min) to +90deg (far right / max)
  const needleAngle = -90 + ratio * 180;

  const activeZoneColor =
    zones.find((z) => clampedVal >= z.from_val && clampedVal <= z.to_val)?.color ?? '#f3f4f6';

  // Geometry
  const cx = 120;
  const cy = 115;
  const r = 85;
  const strokeWidth = 14;

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

  const statusColorClasses = {
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    yellow: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    red: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  }[status_color] || 'bg-gray-500/10 text-gray-400 border-gray-500/30';

  return (
    <>
      <div className="bg-[#111827] border border-gray-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-lg shadow-black/30 hover:border-gray-700 transition-all duration-300">
        {/* Header: 2-Row clean layout */}
        <div className="mb-2">
          {/* Row 1: Title (wraps to 2 lines if needed) and Corner Help Button */}
          <div className="flex items-start justify-between gap-1.5 mb-1.5">
            <h3 className="text-xs sm:text-sm font-bold text-gray-200 tracking-tight leading-snug min-h-[2.25rem] flex items-center" title={name}>
              {name}
            </h3>
            <button
              onClick={() => setShowExplanation(true)}
              className="p-1 rounded-lg bg-gray-800 hover:bg-yellow-500/20 text-gray-400 hover:text-yellow-400 border border-gray-700 transition shrink-0 mt-0.5"
              title="¿Qué significa este indicador? (Guía para neófitos)"
              aria-label="Ver explicación para neófitos"
            >
              <HelpCircle className="w-3.5 h-3.5 text-yellow-400/90" />
            </button>
          </div>

          {/* Row 2: Status Pill Badge and Subtitle */}
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border max-w-full truncate ${statusColorClasses}`}>
              {status_label}
            </span>
            <span className="w-full text-[10px] text-gray-400 font-mono leading-snug line-clamp-2 min-h-[1.75rem]" title={description}>
              {description}
            </span>
          </div>
        </div>

        {/* Speedometer SVG */}
        <div className="relative flex justify-center items-center py-2">
          <svg viewBox="0 0 240 135" className={`${size === 'compact' ? 'w-44' : 'w-56'} h-auto overflow-visible`}>
            {/* Background Arc */}
            <path
              d={describeArc(cx, cy, r, -90, 90)}
              fill="none"
              stroke="#1f2937"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Color Segments for Zones */}
            {zones.map((zone, idx) => {
              const zStartRatio = Math.min(Math.max((zone.from_val - min_value) / (max_value - min_value), 0), 1);
              const zEndRatio = Math.min(Math.max((zone.to_val - min_value) / (max_value - min_value), 0), 1);
              const startA = -90 + zStartRatio * 180;
              const endA = -90 + zEndRatio * 180;
              if (endA <= startA) return null;

              return (
                <path
                  key={idx}
                  d={describeArc(cx, cy, r, startA, endA)}
                  fill="none"
                  stroke={zone.color}
                  strokeWidth={strokeWidth}
                  strokeLinecap={idx === 0 || idx === zones.length - 1 ? 'round' : 'butt'}
                  className="opacity-80"
                />
              );
            })}

            {/* Pivot & Needle */}
            <g
              style={{
                transform: `rotate(${needleAngle}deg)`,
                transformOrigin: `${cx}px ${cy}px`,
                transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              {/* Needle Line */}
              <line
                x1={cx}
                y1={cy}
                x2={cx}
                y2={cy - r + 8}
                stroke="#f3f4f6"
                strokeWidth="3.5"
                strokeLinecap="round"
                className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
              />
              {/* Needle tip indicator */}
              <circle cx={cx} cy={cy - r + 8} r="3" fill="#f59e0b" />
            </g>

            {/* Center Hub */}
            <circle cx={cx} cy={cy} r="10" fill="#1f2937" stroke="#374151" strokeWidth="2" />
            <circle cx={cx} cy={cy} r="5" fill="#f59e0b" />

            {/* Min and Max Labels */}
            <text x={cx - r} y={cy + 16} fill="#6b7280" fontSize="10" textAnchor="middle" fontFamily="monospace">
              {min_value}
            </text>
            <text x={cx + r} y={cy + 16} fill="#6b7280" fontSize="10" textAnchor="middle" fontFamily="monospace">
              {max_value}
            </text>
          </svg>
        </div>

        {/* Card Footer: current value readout (kept outside the SVG so it never overlaps the needle) */}
        <div className="mt-1 pt-2 border-t border-gray-800/80 flex items-center justify-center">
          <span
            className="text-2xl font-extrabold tracking-tight font-mono drop-shadow"
            style={{ color: activeZoneColor }}
          >
            {display_value}
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* EXPANDED EXPLANATION MODAL (Guía completa para neófitos) */}
      {/* ======================================================== */}
      {showExplanation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowExplanation(false)}
        >
          <div
            className="relative bg-[#111827] border-2 border-yellow-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl shadow-yellow-500/10 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-gray-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-yellow-400" /> Filosofía José Luis Cava — Guía para Neófitos
                </span>
                <h3 className="text-xl font-black text-white mt-1">{name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400 font-mono">Valor actual: <strong className="text-white">{display_value}</strong></span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColorClasses}`}>
                    {status_label}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowExplanation(false)}
                className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition"
                title="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 my-4 text-sm">
              {/* 1. ¿Qué mide? */}
              {what_it_measures && (
                <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800">
                  <h4 className="font-bold text-gray-200 flex items-center gap-2 mb-1.5 text-xs uppercase tracking-wide">
                    <BookOpen className="w-4 h-4 text-blue-400" /> ¿Qué mide este indicador?
                  </h4>
                  <p className="text-gray-300 leading-relaxed text-xs sm:text-sm">
                    {what_it_measures}
                  </p>
                </div>
              )}

              {/* 2. ¿Qué está pasando hoy? */}
              {meaning && (
                <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800">
                  <h4 className="font-bold text-gray-200 flex items-center gap-2 mb-1.5 text-xs uppercase tracking-wide">
                    <Compass className="w-4 h-4 text-emerald-400" /> ¿Qué está pasando ahora mismo?
                  </h4>
                  <p className="text-gray-200 font-medium leading-relaxed text-xs sm:text-sm">
                    {meaning}
                  </p>
                </div>
              )}

              {/* ¿Cómo se obtiene este cálculo? */}
              {how_calculated && (
                <div className="bg-gray-900/90 p-4 rounded-2xl border border-purple-500/30">
                  <h4 className="font-bold text-purple-300 flex items-center gap-2 mb-1.5 text-xs uppercase tracking-wide">
                    <Calculator className="w-4 h-4 text-purple-400" /> ¿Cómo se obtiene y pondera este cálculo?
                  </h4>
                  <p className="text-gray-300 text-xs leading-relaxed bg-black/40 p-2.5 rounded-xl border border-gray-800/80 font-mono">
                    {how_calculated}
                  </p>
                </div>
              )}

              {/* 3. Recomendación según Cava */}
              {recommendation && (
                <div className="bg-gradient-to-r from-yellow-500/15 via-amber-500/10 to-transparent p-4 rounded-2xl border border-yellow-500/40">
                  <h4 className="font-bold text-yellow-400 flex items-center gap-2 mb-1.5 text-xs uppercase tracking-wide">
                    <Lightbulb className="w-4 h-4 text-yellow-400" /> ¿Qué recomienda hacer José Luis Cava?
                  </h4>
                  <p className="text-yellow-100 font-semibold leading-relaxed text-xs sm:text-sm">
                    {recommendation}
                  </p>
                </div>
              )}

              {/* 4. Zonas del Tacómetro */}
              <div className="bg-gray-900/60 p-3.5 rounded-2xl border border-gray-800/80">
                <span className="text-xs uppercase font-bold text-gray-400 block mb-2">
                  Zonas y Colores del Tacómetro:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {zones.map((z, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-xl text-xs flex flex-col justify-between"
                      style={{ backgroundColor: `${z.color}15`, border: `1px solid ${z.color}30` }}
                    >
                      <span className="font-bold font-mono" style={{ color: z.color }}>{z.label}</span>
                      <span className="text-[11px] text-gray-400 font-mono mt-0.5">Rango: {z.from_val} a {z.to_val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <button
              onClick={() => setShowExplanation(false)}
              className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-extrabold text-xs sm:text-sm rounded-2xl transition shadow-lg shadow-yellow-500/20"
            >
              Entendido — Volver al Cuadro de Mando
            </button>
          </div>
        </div>
      )}
    </>
  );
};
