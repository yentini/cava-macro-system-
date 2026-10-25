import React, { useState } from 'react';
import { RefreshCw, Send, Smartphone, Monitor, Shield, CheckCircle2, BookOpen, SlidersHorizontal } from 'lucide-react';
import { triggerTelegramAlert } from '../services/api';

interface HeaderProps {
  updatedAt: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  viewMode: 'auto' | 'mobile' | 'desktop';
  setViewMode: (mode: 'auto' | 'mobile' | 'desktop') => void;
  activeView: 'dashboard' | 'theory';
  setActiveView: (view: 'dashboard' | 'theory') => void;
}

export const Header: React.FC<HeaderProps> = ({
  updatedAt,
  onRefresh,
  isRefreshing,
  viewMode,
  setViewMode,
  activeView,
  setActiveView,
}) => {
  const [telegramStatus, setTelegramStatus] = useState<string | null>(null);
  const [isSendingTelegram, setIsSendingTelegram] = useState(false);

  const handleSendTelegram = async () => {
    setIsSendingTelegram(true);
    setTelegramStatus(null);
    try {
      const res = await triggerTelegramAlert();
      if (res.success) {
        setTelegramStatus('¡Alerta enviada a Telegram con éxito!');
      } else {
        setTelegramStatus(res.error || 'Configura TELEGRAM_BOT_TOKEN en .env para recibir alertas.');
      }
    } catch {
      setTelegramStatus('Error al conectar con el servidor.');
    } finally {
      setIsSendingTelegram(false);
      setTimeout(() => setTelegramStatus(null), 5000);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#0b0f19]/90 backdrop-blur-md border-b border-gray-800/80 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/20 text-black font-black">
              <Shield className="w-6 h-6 text-black fill-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">
                  CAVA <span className="text-yellow-400 font-normal text-sm">MACRO SYSTEM</span>
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Sistema Táctico de Inversión Reactiva — Cava Methodology
              </p>
            </div>
          </div>
        </div>

        {/* Primary Navigation: Dashboard vs Teoría */}
        <div className="flex items-center bg-gray-950/90 border border-gray-800 rounded-xl p-1 text-xs self-start md:self-auto shadow-inner">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition cursor-pointer ${
              activeView === 'dashboard'
                ? 'bg-yellow-500 text-slate-950 shadow-md font-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Dashboard Táctico</span>
          </button>
          <button
            onClick={() => setActiveView('theory')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition cursor-pointer ${
              activeView === 'theory'
                ? 'bg-yellow-500 text-slate-950 shadow-md font-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Teoría de Cava</span>
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          {/* Device View Mode Switcher */}
          <div className="flex items-center bg-gray-900 border border-gray-800 rounded-xl p-0.5 text-xs text-gray-400">
            <button
              onClick={() => setViewMode('auto')}
              className={`px-2.5 py-1 rounded-lg transition ${
                viewMode === 'auto' ? 'bg-gray-800 text-white font-semibold' : 'hover:text-gray-200'
              }`}
              title="Detectar dispositivo automáticamente"
            >
              Auto
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={`px-2 py-1 rounded-lg flex items-center gap-1 transition ${
                viewMode === 'mobile' ? 'bg-yellow-500/20 text-yellow-300 font-semibold' : 'hover:text-gray-200'
              }`}
              title="Forzar vista Móvil (App PWA)"
            >
              <Smartphone className="w-3.5 h-3.5" /> App
            </button>
            <button
              onClick={() => setViewMode('desktop')}
              className={`px-2 py-1 rounded-lg flex items-center gap-1 transition ${
                viewMode === 'desktop' ? 'bg-blue-500/20 text-blue-300 font-semibold' : 'hover:text-gray-200'
              }`}
              title="Forzar vista Escritorio a Pantalla Completa"
            >
              <Monitor className="w-3.5 h-3.5" /> PC
            </button>
          </div>

          {/* Telegram Alert Button */}
          <button
            onClick={handleSendTelegram}
            disabled={isSendingTelegram}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold transition disabled:opacity-50"
            title="Enviar informe a Telegram ahora"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Probar Telegram</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-800 rounded-xl text-xs font-semibold transition disabled:opacity-50"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-yellow-400' : ''}`} />
            <span className="hidden md:inline">Actualizar</span>
          </button>

          {/* Timestamp */}
          <span className="text-[11px] text-gray-400 font-mono hidden xl:inline">
            {updatedAt}
          </span>
        </div>
      </div>

      {/* Telegram Toast notification */}
      {telegramStatus && (
        <div className="max-w-7xl mx-auto mt-2 p-2 rounded-xl bg-gray-900 border border-blue-500/40 text-xs text-blue-300 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{telegramStatus}</span>
        </div>
      )}
    </header>
  );
};
