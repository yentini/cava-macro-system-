export type MarketRegimeType = 
  | 'EXPANSION_PLENA'
  | 'OPORTUNIDAD_ASIMETRICA'
  | 'DIVERGENCIA_BAJISTA'
  | 'REGIMEN_DEFENSIVO'
  | 'TRANSICION_NEUTRA';

export interface GaugeZone {
  from_val: number;
  to_val: number;
  color: string;
  label: string;
}

export interface GaugeMetric {
  id: string;
  name: string;
  current_value: number;
  display_value: string;
  unit: string;
  min_value: number;
  max_value: number;
  zones: GaugeZone[];
  status_label: string;
  status_color: 'green' | 'yellow' | 'red' | 'blue';
  description: string;
  what_it_measures?: string;
  meaning?: string;
  recommendation?: string;
  how_calculated?: string;
}

export interface RuleCheck {
  id: string;
  indicator: string;
  value_text: string;
  condition: string;
  points: number;
  max_points: number;
  signal: 'bullish' | 'neutral' | 'bearish';
  explanation: string;
}

export interface CrossRule {
  id: string;
  name: string;
  condition: string;
  is_active: boolean;
  direction: 'bullish' | 'bearish';
  adjustment: number;
  effect: string;
  explanation: string;
  cava_action: string;
}

export interface LayerEvaluation {
  layer_num: number;
  name: string;
  is_healthy: boolean;
  status_label: string;
  summary: string;
  details: string[];
  score?: number;
  max_score?: number;
  weight_rationale?: string;
  rules?: RuleCheck[];
}

export interface DecisionResult {
  regime: MarketRegimeType;
  regime_title: string;
  score_conviction: number;
  status_color: 'green' | 'yellow' | 'red' | 'blue';
  action_sp500: string;
  action_gold: string;
  action_btc?: string;
  rationale: string;
  layers: LayerEvaluation[];
  confluence_index?: number;
  base_score?: number;
  cross_adjustment?: number;
  cross_rules?: CrossRule[];
  index_explanation?: string;
  conviction_explanation?: string;
  regime_steps?: string[];
}

export interface TechnicalIndicators {
  spy_price: number;
  spy_ema50: number;
  spy_diff_pct: number;
  spy_bullish: boolean;
  spy_rsi14?: number;
  spy_oversold?: boolean;

  gold_price: number;
  gold_ema50: number;
  gold_diff_pct: number;
  gold_bullish: boolean;
  gold_rsi14: number;
  gold_oversold: boolean;

  hyg_price: number;
  hyg_ema20: number;
  hyg_diff_pct: number;
  hyg_bullish: boolean;

  us10y_yield: number;
  nominal_gdp_ref: number;
  yield_spread_safe: boolean;

  vix_value?: number;
  vix_low?: boolean;
  breadth_ratio?: number;
  breadth_diff_pct?: number;
  breadth_healthy?: boolean;

  fed_balance_trillions: number;
  fed_balance_change_pct?: number;
  fed_net_liquidity_trillions?: number;
  fed_net_liquidity_change_pct?: number;
  tga_billions?: number;
  rrp_billions?: number;
  hy_oas_spread?: number;
  yield_curve_10y2y?: number;
  vix_term_ratio?: number;
  vix_term_structure?: string;
  dxy_value?: number;
  is_options_window: boolean;
  days_to_next_options?: number;
  next_options_date?: string;

  btc_price?: number;
  btc_ema50?: number;
  btc_diff_pct?: number;
  btc_bullish?: boolean;
  btc_rsi14?: number;
  btc_oversold?: boolean;

  spy_net_liquidity_ratio?: number;
  spy_net_liquidity_diff_pct?: number;
  spy_gold_ratio?: number;
}

export interface ChartDataPoint {
  date: string;
  price: number;
  ema?: number;
  rsi?: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export interface MacroSystemResponse {
  updated_at: string;
  decision: DecisionResult;
  gauges: GaugeMetric[];
  indicators: TechnicalIndicators;
  charts: {
    spy: ChartDataPoint[];
    gold: ChartDataPoint[];
    hyg: ChartDataPoint[];
    btc?: ChartDataPoint[];
  };
}
