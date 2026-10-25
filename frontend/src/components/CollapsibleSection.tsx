import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  summaryBadge?: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  id,
  title,
  subtitle,
  icon,
  summaryBadge,
  isOpen,
  onToggle,
  children
}) => {
  return (
    <section className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-all duration-300">
      {/* Header Button (Click anywhere to fold/unfold) */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`section-content-${id}`}
        className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-5 text-left hover:bg-slate-800/40 transition-colors gap-3 border-b border-transparent data-[open=true]:border-slate-800/80"
        data-open={isOpen}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 rounded-xl bg-slate-800/80 text-yellow-400 border border-slate-700/60 shrink-0">
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base md:text-lg font-bold text-white tracking-tight">
                {title}
              </h3>
            </div>
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right side: Summary Badges + Chevron */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {summaryBadge && <div className="shrink-0">{summaryBadge}</div>}
          <div className="p-1.5 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-300 hover:text-white transition-transform">
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-yellow-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>
      </button>

      {/* Content Area */}
      {isOpen && (
        <div id={`section-content-${id}`} className="p-4 md:p-6 pt-3 animate-fade-in border-t border-slate-800/60">
          {children}
        </div>
      )}
    </section>
  );
};
