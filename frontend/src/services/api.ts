import { MacroSystemResponse, ChartDataPoint } from '../types';

const API_BASE = '/api';

export const fallbackMockData: MacroSystemResponse = {
  updated_at: new Date().toLocaleString('es-ES'),
  decision: {
    regime: 'EXPANSION_PLENA',
    regime_title: 'EXPANSIÓN PLENA (Risk-On Total)',
    score_conviction: 85,
    status_color: 'green',
    action_sp500: 'APORTACIÓN RECURRENTE SISTEMÁTICA / MANTENER',
    action_gold: 'MANTENER / ACUMULACIÓN PROGRESIVA',
    rationale: 'Todos los motores de fondo están alineados: liquidez abundante, tipos tolerables y tendencia estructural alcista. Ignorar el ruido de noticias catastrofistas.',
    layers: [
      {
        layer_num: 1,
        name: 'Capa 1: Macro & Liquidez Institucional',
        is_healthy: true,
        status_label: 'Sana (Liquidez Activa)',
        summary: 'El crédito corporativo y tipos sostienen el apetito por riesgo.',
        details: [
          'Bonos Basura (HYG): Alcista sobre media 20W (+2.1%)',
          'Bono 10Y vs PIB nominal: Expansivo (4.24% vs 6.50%)'
        ]
      },
      {
        layer_num: 2,
        name: 'Capa 2: Tendencia Estructural (Semanal)',
        is_healthy: true,
        status_label: 'Alcista Estructural',
        summary: 'Tendencia de fondo intacta en activos duros y bolsa.',
        details: [
          'S&P 500: $586.40 vs EMA 50W $535.20 (+9.57%) - Alcista',
          'Oro (GLD): $252.80 vs EMA 50W $224.50 (+12.61%) - Alcista'
        ]
      },
      {
        layer_num: 3,
        name: 'Capa 3: Gatillos Tácticos & Opciones',
        is_healthy: false,
        status_label: 'Sin Gatillo Activo',
        summary: 'Acumulación estándar sin estrés ni descuento extraordinario.',
        details: [
          'RSI 1W Oro: 56.4 (Zona neutral, gatillo de compra en ≤42)',
          'Ventana de Opciones: Inactiva (próxima ventana: marzo/septiembre)'
        ]
      }
    ],
    confluence_index: 84,
    base_score: 84,
    cross_adjustment: 0,
    index_explanation: 'Capa 1 (36/40) + Capa 2 (36/40) + Capa 3 (12/20) = 84 pts. Ninguna regla cruzada restrictiva activa → Índice 84.',
    conviction_explanation: 'Régimen alcista: (8 a favor ×1 + 1 neutro ×0.5) / 9 indicadores = 94 %.',
    regime_steps: [
      '1. ¿Veto de liquidez (R1)? No',
      '2. ¿Trampa alcista (R2)? No',
      '3. ¿Compra asimétrica (R5/R6)? No',
      '4. Índice 84 ≥ 65 → Expansión Plena'
    ],
    cross_rules: [
      {
        id: 'R1',
        name: 'Veto de liquidez',
        condition: 'HYG bajo su media 20W Y (VIX > 22 O S&P 500 bajo su EMA 50W)',
        is_active: false,
        direction: 'bearish',
        adjustment: 0,
        effect: 'Tope 30 pts → Defensivo',
        explanation: 'Secado de crédito con estrés de volatilidad o tendencia rota.',
        cava_action: 'Pausar compras y ceñir stops.'
      },
      {
        id: 'R2',
        name: 'Trampa alcista (divergencia)',
        condition: 'S&P 500 sobre EMA 50W pero HYG bajo media 20W',
        is_active: false,
        direction: 'bearish',
        adjustment: -10,
        effect: '−10 puntos',
        explanation: 'La bolsa sube pero el crédito de riesgo no valida.',
        cava_action: 'No perseguir precios.'
      },
      {
        id: 'R3',
        name: 'Complacencia frágil',
        condition: 'VIX < 16 y amplitud < −2%',
        is_active: false,
        direction: 'bearish',
        adjustment: -8,
        effect: '−8 puntos',
        explanation: 'Subida estrecha en los 7 Magníficos sin miedo institucional.',
        cava_action: 'Mantener núcleo sin sobreapalancarse.'
      },
      {
        id: 'R4',
        name: 'Euforia sin apoyo',
        condition: 'RSI S&P ≥ 70 y amplitud < −2%',
        is_active: false,
        direction: 'bearish',
        adjustment: -6,
        effect: '−6 puntos',
        explanation: 'Sobrecompra vertical sin acompañamiento del mercado amplio.',
        cava_action: 'Esperar recorte hacia EMA 50W.'
      },
      {
        id: 'R5',
        name: 'Compra asimétrica S&P 500',
        condition: 'RSI S&P ≤ 40 y S&P > EMA 50W y HYG alcista',
        is_active: false,
        direction: 'bullish',
        adjustment: 10,
        effect: '+10 puntos',
        explanation: 'Pánico puntual en activo con tendencia de fondo sana.',
        cava_action: 'Comprar la caída con stop semanal.'
      },
      {
        id: 'R6',
        name: 'Compra asimétrica Oro',
        condition: 'RSI Oro ≤ 42 y Oro > EMA 50W y Bono 10Y < 6%',
        is_active: false,
        direction: 'bullish',
        adjustment: 8,
        effect: '+8 puntos',
        explanation: 'Sobreventa en oro físico con tipos de interés tolerables.',
        cava_action: 'Desplegar liquidez reservada.'
      }
    ]
  },
  gauges: [
    {
      id: 'confluence_index',
      name: 'Confluencia Reglas Cruzadas',
      current_value: 84,
      display_value: '84/100',
      unit: 'pts',
      min_value: 0,
      max_value: 100,
      zones: [
        { from_val: 0, to_val: 35, color: '#ef4444', label: 'Defensivo (<35)' },
        { from_val: 35, to_val: 65, color: '#f59e0b', label: 'Transición (35-65)' },
        { from_val: 65, to_val: 100, color: '#10b981', label: 'Expansión (≥65)' }
      ],
      status_label: 'Expansión Plena',
      status_color: 'green',
      description: 'Resultado neto ponderado de las 3 capas y reglas cruzadas R1-R6.',
      what_it_measures: 'Mide la puntuación cuantitativa compuesta de todo el mercado según las reglas cruzadas de Cava.',
      meaning: 'Índice en 84 puntos sobre 100. Entorno de viento a favor: liquidez, tendencia y participación apoyan el riesgo.',
      recommendation: 'Inversión activa: continuar con compras periódicas e indexación.',
      how_calculated: 'Capa 1 Macro (36/40) + Capa 2 Tendencia (36/40) + Capa 3 Momento (12/20) = 84 pts.'
    },
    {
      id: 'spy_ema',
      name: 'S&P 500 vs EMA 50W',
      current_value: 9.57,
      display_value: '+9.57%',
      unit: '%',
      min_value: -15,
      max_value: 15,
      zones: [
        { from_val: -15, to_val: -1, color: '#ef4444', label: 'Bajo EMA (Peligro)' },
        { from_val: -1, to_val: 2, color: '#f59e0b', label: 'Testeo Soporte' },
        { from_val: 2, to_val: 15, color: '#10b981', label: 'Alcista Sano' }
      ],
      status_label: 'Alcista',
      status_color: 'green',
      description: 'Precio $586.4 vs EMA50 $535.2 semanal.',
      what_it_measures: 'Compara el precio actual del S&P 500 con su media móvil de 50 semanas (la Línea Azul de Cava).',
      meaning: 'El precio cotiza un +9.57% sobre la media semanal. La marea de liquidez institucional sigue empujando al alza.',
      recommendation: 'Mantener posiciones y continuar con compras periódicas programadas. No vender por miedo a noticias.'
    },
    {
      id: 'spy_rsi',
      name: 'RSI(14) Semanal S&P 500',
      current_value: 63.2,
      display_value: '63.2',
      unit: 'pts',
      min_value: 15,
      max_value: 85,
      zones: [
        { from_val: 15, to_val: 40, color: '#10b981', label: 'Sobreventa / Compra' },
        { from_val: 40, to_val: 70, color: '#3b82f6', label: 'Tendencia Sana' },
        { from_val: 70, to_val: 85, color: '#f59e0b', label: 'Sobrecompra / Euforia' }
      ],
      status_label: 'Neutral',
      status_color: 'blue',
      description: 'Cava compra caídas cuando el RSI semanal del S&P baja a ≤ 40 en mercado alcista.',
      what_it_measures: 'Oscilador de momento del S&P 500 en velas semanales: euforia vs miedo excesivo.',
      meaning: 'RSI en rango de tendencia sana (40 a 70). Subida ordenada, sin excesos emocionales.',
      recommendation: 'Mantener posiciones y aportaciones periódicas sin forzar entradas agresivas.'
    },
    {
      id: 'gold_ema',
      name: 'Oro (GLD) vs EMA 50W',
      current_value: 12.61,
      display_value: '+12.61%',
      unit: '%',
      min_value: -15,
      max_value: 15,
      zones: [
        { from_val: -15, to_val: -1, color: '#ef4444', label: 'Corrección Fuerte' },
        { from_val: -1, to_val: 2, color: '#f59e0b', label: 'Zona Soporte' },
        { from_val: 2, to_val: 15, color: '#10b981', label: 'Tendencia Sólida' }
      ],
      status_label: 'Alcista',
      status_color: 'green',
      description: 'Precio $252.8 vs EMA50 $224.5 semanal.',
      what_it_measures: 'Mide la salud del oro físico como activo duro frente a la pérdida de poder adquisitivo de las divisas fiat.',
      meaning: 'El oro está un +12.61% sobre la media semanal. Mantiene la tendencia de protección ante la devaluación monetaria.',
      recommendation: 'Mantener y acumular en correcciones. Nunca vender oro físico mientras la estructura de fondo sea alcista.'
    },
    {
      id: 'gold_rsi',
      name: 'RSI(14) Semanal Oro',
      current_value: 56.4,
      display_value: '56.4',
      unit: 'pts',
      min_value: 15,
      max_value: 85,
      zones: [
        { from_val: 15, to_val: 42, color: '#10b981', label: 'Compra Asimétrica' },
        { from_val: 42, to_val: 70, color: '#3b82f6', label: 'Zona Neutral' },
        { from_val: 70, to_val: 85, color: '#f59e0b', label: 'Sobrecompra' }
      ],
      status_label: 'Zona Neutral',
      status_color: 'blue',
      description: 'Cava busca compras asimétricas cuando el RSI semanal cae a zona ≤ 40-42.',
      what_it_measures: 'Oscilador que detecta si el oro está en sobrecompra (caro) o sobreventa con pánico (con descuento).',
      meaning: 'En rango neutro (56.4). Mercado equilibrado sin pánico ni euforia extrema.',
      recommendation: 'Esperar a que caiga a la zona verde (≤ 40-42) para activar compras asimétricas con descuento.'
    },
    {
      id: 'us10y_yield',
      name: 'Bono USA 10Y Yield',
      current_value: 4.24,
      display_value: '4.24%',
      unit: '%',
      min_value: 2,
      max_value: 8,
      zones: [
        { from_val: 2, to_val: 5, color: '#10b981', label: 'Expansivo (<5%)' },
        { from_val: 5, to_val: 6, color: '#f59e0b', label: 'Vigilancia (5-6%)' },
        { from_val: 6, to_val: 8, color: '#ef4444', label: 'Restrictivo (>6%)' }
      ],
      status_label: 'Expansivo (< PIB ~6.5%)',
      status_color: 'green',
      description: 'Si el bono supera el PIB nominal, el coste de la deuda asfixia la economía.',
      what_it_measures: 'Coste del dinero a 10 años comparado con el crecimiento nominal de EE.UU. (~6.5%).',
      meaning: 'El 4.24% está por debajo del 6%. El coste de financiación no estrangula la economía.',
      recommendation: 'Entorno macro favorable para bolsa y activos de riesgo.'
    },
    {
      id: 'system_conviction',
      name: 'Convicción del Sistema',
      current_value: 85,
      display_value: '85%',
      unit: '%',
      min_value: 0,
      max_value: 100,
      zones: [
        { from_val: 0, to_val: 50, color: '#ef4444', label: 'Baja' },
        { from_val: 50, to_val: 75, color: '#f59e0b', label: 'Moderada' },
        { from_val: 75, to_val: 100, color: '#10b981', label: 'Alta Convicción' }
      ],
      status_label: 'Alta',
      status_color: 'green',
      description: 'Ponderación combinada de liquidez, tendencia semanal y gatillos tácticos.',
      what_it_measures: 'Nivel de confluencia entre las 3 capas: Liquidez, Tendencia Semanal y Gatillos.',
      meaning: 'Alta confluencia (85%). Las capas confirman la misma dirección minimizando señales falsas.',
      recommendation: 'Operar con confianza siguiendo las reglas del régimen activo sin dejarse llevar por el ruido.'
    }
  ],
  indicators: {
    spy_price: 586.40,
    spy_ema50: 535.20,
    spy_diff_pct: 9.57,
    spy_bullish: true,
    spy_rsi14: 63.2,
    spy_oversold: false,
    gold_price: 252.80,
    gold_ema50: 224.50,
    gold_diff_pct: 12.61,
    gold_bullish: true,
    gold_rsi14: 56.4,
    gold_oversold: false,
    hyg_price: 79.20,
    hyg_ema20: 77.80,
    hyg_diff_pct: 1.80,
    hyg_bullish: true,
    us10y_yield: 4.24,
    nominal_gdp_ref: 6.5,
    yield_spread_safe: true,
    fed_balance_trillions: 7.12,
    is_options_window: false
  },
  charts: {
    spy: Array.from({ length: 24 }, (_, i) => ({
      date: `Sem ${i + 1}`,
      price: Math.round(520 + i * 2.8 + (i % 3)),
      ema: Math.round(510 + i * 2.0)
    })),
    gold: Array.from({ length: 24 }, (_, i) => ({
      date: `Sem ${i + 1}`,
      price: Math.round(210 + i * 1.8 + (i % 4)),
      ema: Math.round(205 + i * 1.2),
      rsi: Math.round(48 + (i % 18))
    })),
    hyg: Array.from({ length: 24 }, (_, i) => ({
      date: `Sem ${i + 1}`,
      price: Number((76.5 + i * 0.12).toFixed(2)),
      ema: Number((76.2 + i * 0.10).toFixed(2))
    }))
  }
};

export async function fetchSystemStatus(): Promise<MacroSystemResponse> {
  try {
    const res = await fetch(`${API_BASE}/status`);
    if (!res.ok) {
      throw new Error(`Status HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable, using cached mock data:', err);
    return fallbackMockData;
  }
}

export async function refreshSystemStatus(): Promise<MacroSystemResponse> {
  try {
    const res = await fetch(`${API_BASE}/refresh`, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Refresh HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('Backend unavailable during refresh, using fallback:', err);
    return fallbackMockData;
  }
}

export async function triggerTelegramAlert(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/alert/telegram`, { method: 'POST' });
    return await res.json();
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function fetchChartHistory(
  ticker: string,
  period: string = '1y',
  interval: string = '1wk'
): Promise<ChartDataPoint[]> {
  try {
    const res = await fetch(`${API_BASE}/chart-history?ticker=${ticker}&period=${period}&interval=${interval}`);
    if (!res.ok) {
      throw new Error(`Chart history HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`Backend unavailable for chart ${ticker}, using fallback:`, err);
    const lower = ticker.toLowerCase();
    const key = (lower === 'gld' ? 'gold' : lower) as 'spy' | 'gold' | 'hyg';
    return fallbackMockData.charts[key] || fallbackMockData.charts.spy;
  }
}

