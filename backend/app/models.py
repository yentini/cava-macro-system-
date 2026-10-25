from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

class MarketRegime(str, Enum):
    """The 4 core Cava market regimes + neutral state."""
    EXPANSION_PLENA = "EXPANSION_PLENA"
    OPORTUNIDAD_ASIMETRICA = "OPORTUNIDAD_ASIMETRICA"
    DIVERGENCIA_BAJISTA = "DIVERGENCIA_BAJISTA"
    REGIMEN_DEFENSIVO = "REGIMEN_DEFENSIVO"
    TRANSICION_NEUTRA = "TRANSICION_NEUTRA"

class GaugeZone(BaseModel):
    """Segment configuration for gauge visualization."""
    from_val: float
    to_val: float
    color: str  # Hex or Tailwind color token (green, yellow, red)
    label: str

class GaugeMetric(BaseModel):
    """Data for half-moon speedometer gauge."""
    id: str
    name: str
    current_value: float
    display_value: str
    unit: str
    min_value: float
    max_value: float
    zones: List[GaugeZone]
    status_label: str
    status_color: str  # "green" | "yellow" | "red"
    description: str
    what_it_measures: str = ""
    meaning: str = ""
    recommendation: str = ""
    how_calculated: str = ""

class RuleCheck(BaseModel):
    """One scored indicator inside a layer, with the full reasoning behind its points."""
    id: str
    indicator: str
    value_text: str
    condition: str
    points: float
    max_points: float
    signal: str  # "bullish" | "neutral" | "bearish"
    explanation: str

class CrossRule(BaseModel):
    """Combination rule that adjusts the confluence index beyond the sum of indicators."""
    id: str
    name: str
    condition: str
    is_active: bool
    direction: str  # "bullish" | "bearish"
    adjustment: float  # Points added/subtracted when active (0 for the liquidity veto cap)
    effect: str
    explanation: str
    cava_action: str

class LayerEvaluation(BaseModel):
    """Evaluation result for one of Cava's 3 logical layers."""
    layer_num: int
    name: str
    is_healthy: bool
    status_label: str
    summary: str
    details: List[str]
    score: float = 0.0
    max_score: float = 0.0
    weight_rationale: str = ""
    rules: List[RuleCheck] = Field(default_factory=list)

class TechnicalIndicators(BaseModel):
    """Raw and processed technical metrics."""
    spy_price: float
    spy_ema50: float
    spy_diff_pct: float
    spy_bullish: bool
    spy_rsi14: float = 62.0
    spy_oversold: bool = False

    gold_price: float
    gold_ema50: float
    gold_diff_pct: float
    gold_bullish: bool
    gold_rsi14: float
    gold_oversold: bool

    hyg_price: float
    hyg_ema20: float
    hyg_diff_pct: float
    hyg_bullish: bool

    us10y_yield: float
    nominal_gdp_ref: float = 6.5
    yield_spread_safe: bool

    # New Cava daily channel indicators
    vix_value: float = 14.5
    vix_low: bool = True  # VIX < 16 (complacencia / manos fuertes vendiendo puts)
    breadth_ratio: float = 0.38  # IWM / SPY ratio
    breadth_diff_pct: float = 1.2  # vs 20W EMA
    breadth_healthy: bool = True  # True if broad market participates

    # Liquidity & Macro dynamic indicators (FRED)
    fed_balance_trillions: float
    fed_balance_change_pct: float = 0.0
    fed_net_liquidity_trillions: float = 5.80
    fed_net_liquidity_change_pct: float = 0.54
    tga_billions: float = 952.0
    rrp_billions: float = 0.24
    hy_oas_spread: float = 3.40
    yield_curve_10y2y: float = 0.31

    # Volatility term structure & Dollar index
    vix_term_ratio: float = 0.95  # VIX / VIX3M (<1.0 Contango = Calma, >1.0 Backwardation = Pánico)
    vix_term_structure: str = "CONTANGO"
    dxy_value: float = 101.8

    # Options Quadruple Witching dynamics
    is_options_window: bool
    days_to_next_options: int = 0
    next_options_date: str = ""

    # Bitcoin & Monetary Degradation
    btc_price: float = 67500.0
    btc_ema50: float = 61200.0
    btc_diff_pct: float = 10.29
    btc_bullish: bool = True
    btc_rsi14: float = 58.5
    btc_oversold: bool = False

    # Nominal Illusion & Real Debasement Metrics
    spy_net_liquidity_ratio: float = 101.0
    spy_net_liquidity_diff_pct: float = 1.8
    spy_gold_ratio: float = 2.32

class DecisionResult(BaseModel):
    """Composite Decision Output following Cava's methodology."""
    regime: MarketRegime
    regime_title: str
    score_conviction: int  # 0 to 100
    status_color: str
    action_sp500: str
    action_gold: str
    action_btc: str = "COMPRA PERIÓDICA / MANTENER"
    rationale: str
    layers: List[LayerEvaluation]
    confluence_index: int = 0  # 0 to 100
    base_score: float = 0.0
    cross_adjustment: float = 0.0
    cross_rules: List[CrossRule] = Field(default_factory=list)
    index_explanation: str = ""
    conviction_explanation: str = ""
    regime_steps: List[str] = Field(default_factory=list)

class ChartDataPoint(BaseModel):
    """Single point for time series charts with optional OHLCV candle data."""
    date: str
    price: float
    ema: Optional[float] = None
    rsi: Optional[float] = None
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    volume: Optional[float] = None

class MacroSystemResponse(BaseModel):
    """Complete payload for frontend dashboard."""
    updated_at: str
    decision: DecisionResult
    gauges: List[GaugeMetric]
    indicators: TechnicalIndicators
    charts: Dict[str, List[ChartDataPoint]]
