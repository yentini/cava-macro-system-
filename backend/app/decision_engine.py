"""Cava Composite Decision Matrix & Regime Engine.

Orchestrates the explainable scoring (see app.scoring):
1. Scores 9 indicators in 3 layers (Macro & Liquidez 40, Tendencia 40, Momento 20).
2. Applies 6 cross rules (R1-R6) to get the Confluence Index (0-100).
3. Selects the regime by priority: veto > divergence > opportunity > index thresholds.
4. Computes conviction as the share of indicators agreeing with the regime.
"""
from dataclasses import dataclass
from typing import List, Optional, Tuple

from app.models import (
    CrossRule,
    DecisionResult,
    GaugeMetric,
    GaugeZone,
    LayerEvaluation,
    MarketRegime,
    TechnicalIndicators,
)
from app.scoring import (
    BEARISH,
    BULLISH,
    DEFENSIVE_THRESHOLD,
    EXPANSION_THRESHOLD,
    LIQUIDITY_VETO_CAP,
    NEUTRAL,
    compute_confluence_index,
    compute_conviction,
    evaluate_cross_rules,
    explain_confluence_index,
    is_rule_active,
    score_layers,
)

DIRECTION_LABELS = {BULLISH: "alcista", BEARISH: "defensivo", NEUTRAL: "de transición"}


@dataclass(frozen=True)
class RegimeProfile:
    """Static description and actions associated with a market regime."""
    regime: MarketRegime
    title: str
    color: str
    direction: str
    action_sp500: str
    action_gold: str
    rationale: str


DEFENSIVE_PROFILE = RegimeProfile(
    MarketRegime.REGIMEN_DEFENSIVO, "RÉGIMEN DEFENSIVO (Riesgo Sistémico)", "red", BEARISH,
    "PAUSAR COMPRAS / ACTIVAR STOPS CEÑIDOS", "MANTENER ORO COMO COBERTURA",
    "La liquidez no acompaña y la tendencia está dañada. Prioridad absoluta: proteger capital "
    "y evitar trampas de liquidez.",
)
DIVERGENCE_PROFILE = RegimeProfile(
    MarketRegime.DIVERGENCIA_BAJISTA, "DIVERGENCIA BAJISTA (Alerta de Trampa)", "yellow", BEARISH,
    "NO PERSEGUIR PRECIOS / CEÑIR STOPS", "OBSERVAR SOPORTES Y ESPERAR CONFIRMACIÓN",
    "La bolsa sube pero el crédito de alto riesgo cae: el dinero inteligente no valida las "
    "subidas. Riesgo elevado de corrección súbita.",
)
EXPANSION_PROFILE = RegimeProfile(
    MarketRegime.EXPANSION_PLENA, "EXPANSIÓN PLENA (Risk-On Total)", "green", BULLISH,
    "APORTACIÓN RECURRENTE SISTEMÁTICA / MANTENER", "MANTENER / ACUMULACIÓN PROGRESIVA",
    "Los motores de fondo están alineados: liquidez abundante, tipos tolerables y tendencia "
    "estructural alcista. Ignorar el ruido de noticias catastrofistas.",
)
TRANSITION_PROFILE = RegimeProfile(
    MarketRegime.TRANSICION_NEUTRA, "TRANSICIÓN / ESPERA TÁCTICA", "blue", NEUTRAL,
    "MANTENER ESTRATEGIA BASE", "MANTENER POSICIONES",
    "Mercado sin confluencia clara. No hacer cambios bruscos de cartera.",
)


def build_opportunity_profile(spy_trigger: bool, gold_trigger: bool) -> RegimeProfile:
    """Build the asymmetric-opportunity profile for the asset(s) whose trigger fired."""
    targets = " y ".join(name for name, fired in (("S&P 500", spy_trigger), ("Oro", gold_trigger)) if fired)
    return RegimeProfile(
        MarketRegime.OPORTUNIDAD_ASIMETRICA, "OPORTUNIDAD ASIMÉTRICA (Dip de Pánico / Compra)",
        "green", BULLISH,
        "COMPRA ASIMÉTRICA: RSI ≤ 40 CON TENDENCIA Y CRÉDITO SANOS" if spy_trigger
        else "MANTENER POSICIONES",
        "GATILLO DE COMPRA ACTIVO (Sobreventa con macro alcista)" if gold_trigger
        else "MANTENER / ACUMULACIÓN PROGRESIVA",
        f"Descuento temporal en {targets} con la liquidez y la tendencia de fondo sanas. "
        "Perfil de riesgo/beneficio óptimo para entradas asimétricas ('Home Run').",
    )


def check_priority_rules(cross_rules: List[CrossRule]) -> Tuple[Optional[RegimeProfile], List[str]]:
    """Evaluate the cross rules that override the index, in priority order."""
    veto = is_rule_active(cross_rules, "R1")
    steps = [f"1. ¿Veto de liquidez (R1)? {'SÍ → Régimen Defensivo' if veto else 'No'}"]
    if veto:
        return DEFENSIVE_PROFILE, steps
    trap = is_rule_active(cross_rules, "R2")
    steps.append(f"2. ¿Trampa alcista (R2)? {'SÍ → Divergencia Bajista' if trap else 'No'}")
    if trap:
        return DIVERGENCE_PROFILE, steps
    spy_trigger = is_rule_active(cross_rules, "R5")
    gold_trigger = is_rule_active(cross_rules, "R6")
    is_opportunity = spy_trigger or gold_trigger
    steps.append(
        f"3. ¿Compra asimétrica (R5 S&P / R6 Oro)? {'SÍ → Oportunidad Asimétrica' if is_opportunity else 'No'}"
    )
    if is_opportunity:
        return build_opportunity_profile(spy_trigger, gold_trigger), steps
    return None, steps


def classify_by_index(index: int) -> Tuple[RegimeProfile, str]:
    """Pick the regime from the confluence index when no priority rule applies."""
    if index >= EXPANSION_THRESHOLD:
        return EXPANSION_PROFILE, f"4. Índice {index} ≥ {EXPANSION_THRESHOLD} → Expansión Plena"
    if index < DEFENSIVE_THRESHOLD:
        return DEFENSIVE_PROFILE, f"4. Índice {index} < {DEFENSIVE_THRESHOLD} → Régimen Defensivo"
    return TRANSITION_PROFILE, (
        f"4. Índice {index} entre {DEFENSIVE_THRESHOLD} y {EXPANSION_THRESHOLD - 1} → Transición"
    )


def select_regime(index: int, cross_rules: List[CrossRule]) -> Tuple[RegimeProfile, List[str]]:
    """Select the market regime and return the decision steps followed."""
    profile, steps = check_priority_rules(cross_rules)
    if profile:
        return profile, steps
    profile, last_step = classify_by_index(index)
    return profile, steps + [last_step]


def build_rationale(profile: RegimeProfile, cross_rules: List[CrossRule]) -> str:
    """Append warnings from active cautionary rules that did not set the regime."""
    warnings = [f"{r.name} ({r.id})" for r in cross_rules if r.is_active and r.id in ("R3", "R4")]
    if not warnings:
        return profile.rationale
    return f"{profile.rationale} Avisos activos: {', '.join(warnings)}."


# Backwards compatibility wrappers
def evaluate_macro_layer(hyg_bullish: bool, yield_spread_safe: bool, vix_value: float = 14.5) -> LayerEvaluation:
    mock_ind = TechnicalIndicators(
        spy_price=580.0, spy_ema50=530.0, spy_diff_pct=9.4, spy_bullish=True,
        gold_price=250.0, gold_ema50=220.0, gold_diff_pct=13.6, gold_bullish=True, gold_rsi14=55.0, gold_oversold=False,
        hyg_price=79.0, hyg_ema20=77.0, hyg_diff_pct=2.6 if hyg_bullish else -3.0, hyg_bullish=hyg_bullish,
        us10y_yield=4.25 if yield_spread_safe else 6.5, yield_spread_safe=yield_spread_safe,
        vix_value=vix_value, fed_balance_trillions=7.1, is_options_window=False
    )
    return score_layers(mock_ind)[0]

def evaluate_trend_layer(spy_bullish: bool, gold_bullish: bool, breadth_healthy: bool = True) -> LayerEvaluation:
    mock_ind = TechnicalIndicators(
        spy_price=580.0, spy_ema50=530.0, spy_diff_pct=9.4 if spy_bullish else -4.0, spy_bullish=spy_bullish,
        gold_price=250.0, gold_ema50=220.0, gold_diff_pct=13.6 if gold_bullish else -2.0, gold_bullish=gold_bullish, gold_rsi14=55.0, gold_oversold=False,
        hyg_price=79.0, hyg_ema20=77.0, hyg_diff_pct=2.0, hyg_bullish=True,
        us10y_yield=4.25, yield_spread_safe=True,
        breadth_diff_pct=2.0 if breadth_healthy else -3.0, breadth_healthy=breadth_healthy,
        fed_balance_trillions=7.1, is_options_window=False
    )
    return score_layers(mock_ind)[1]

def evaluate_trigger_layer(gold_oversold: bool, is_options_window: bool) -> LayerEvaluation:
    mock_ind = TechnicalIndicators(
        spy_price=580.0, spy_ema50=530.0, spy_diff_pct=9.4, spy_bullish=True,
        gold_price=250.0, gold_ema50=220.0, gold_diff_pct=13.6, gold_bullish=True,
        gold_rsi14=38.0 if gold_oversold else 55.0, gold_oversold=gold_oversold,
        hyg_price=79.0, hyg_ema20=77.0, hyg_diff_pct=2.0, hyg_bullish=True,
        us10y_yield=4.25, yield_spread_safe=True,
        fed_balance_trillions=7.1, is_options_window=is_options_window
    )
    return score_layers(mock_ind)[2]


def evaluate_combined_system(ind: TechnicalIndicators) -> DecisionResult:
    """Evaluate the explainable cross-rules matrix and return the full decision."""
    layers = score_layers(ind)
    cross_rules = evaluate_cross_rules(ind)
    base_score = sum(layer.score for layer in layers)
    index = compute_confluence_index(base_score, cross_rules)
    profile, steps = select_regime(index, cross_rules)
    all_rules = [rule for layer in layers for rule in layer.rules]
    conviction, conviction_text = compute_conviction(all_rules, profile.direction)
    return DecisionResult(
        regime=profile.regime,
        regime_title=profile.title,
        score_conviction=conviction,
        status_color=profile.color,
        action_sp500=profile.action_sp500,
        action_gold=profile.action_gold,
        rationale=build_rationale(profile, cross_rules),
        layers=layers,
        confluence_index=index,
        base_score=base_score,
        cross_adjustment=index - base_score,
        cross_rules=cross_rules,
        index_explanation=explain_confluence_index(layers, cross_rules, index),
        conviction_explanation=f"Régimen {DIRECTION_LABELS[profile.direction]}: {conviction_text}",
        regime_steps=steps,
    )


SPY_RSI_OVERSOLD = 40.0
SPY_RSI_OVERBOUGHT = 70.0


def build_spy_rsi_gauge(spy_rsi: float) -> GaugeMetric:
    """Build the weekly RSI(14) gauge for the S&P 500."""
    is_oversold = spy_rsi <= SPY_RSI_OVERSOLD
    is_overbought = spy_rsi >= SPY_RSI_OVERBOUGHT
    return GaugeMetric(
        id="spy_rsi",
        name="RSI(14) Semanal S&P 500",
        current_value=round(spy_rsi, 1),
        display_value=f"{spy_rsi:.1f}",
        unit="pts",
        min_value=15.0,
        max_value=85.0,
        zones=[
            GaugeZone(from_val=15.0, to_val=SPY_RSI_OVERSOLD, color="#10b981", label="Sobreventa / Compra"),
            GaugeZone(from_val=SPY_RSI_OVERSOLD, to_val=SPY_RSI_OVERBOUGHT, color="#3b82f6", label="Tendencia Sana"),
            GaugeZone(from_val=SPY_RSI_OVERBOUGHT, to_val=85.0, color="#f59e0b", label="Sobrecompra / Euforia")
        ],
        status_label="Gatillo Compra (≤40)" if is_oversold else ("Euforia (>70)" if is_overbought else "Neutral"),
        status_color="green" if is_oversold else ("yellow" if is_overbought else "blue"),
        description="Cava compra caídas cuando el RSI semanal del S&P baja a ≤ 40 en mercado alcista.",
        what_it_measures=(
            "Oscilador de momento del S&P 500 en velas semanales: indica si el índice está "
            "sobrecalentado por euforia o castigado en exceso por miedo."
        ),
        meaning=(
            "RSI en sobreventa (≤ 40). El miedo ha castigado al índice más de lo que justifica su tendencia de fondo."
            if is_oversold else (
                "RSI en euforia (≥ 70). El índice ha subido muy rápido y suele necesitar una pausa o recorte."
                if is_overbought else
                "RSI en rango de tendencia sana (40 a 70). Subida ordenada, sin excesos emocionales."
            )
        ),
        recommendation=(
            "Oportunidad asimétrica: comprar la caída si el precio sigue sobre la EMA 50W, con stop bajo el mínimo semanal."
            if is_oversold else (
                "No perseguir rupturas verticales. Esperar retroceso hacia la EMA 50W para nuevas entradas."
                if is_overbought else
                "Mantener posiciones y aportaciones periódicas sin forzar entradas agresivas."
            )
        ),
        how_calculated=(
            "Cálculo: RSI clásico de Wilder (14 semanas) sobre SPY. "
            "En la matriz de confluencia aporta 8 pts (rango 40-70), 4 pts (≤40) o 2 pts (≥70). "
            "Si cae a ≤40 con SPY>EMA50 y crédito HYG alcista, activa la Regla Cruzada R5 (+10 pts extra)."
        )
    )


def build_hyg_gauge(
    hyg_price: float,
    hyg_ema20: float,
    hyg_diff_pct: float,
    hyg_bullish: bool
) -> GaugeMetric:
    """Build the speedometer gauge for High Yield Bonds (HYG vs 20W EMA) - Cava's canary in the coal mine."""
    return GaugeMetric(
        id="hyg_ema",
        name="Bonos Basura (HYG) vs 20W",
        current_value=round(hyg_diff_pct, 2),
        display_value=f"{hyg_diff_pct:+.2f}%",
        unit="%",
        min_value=-10.0,
        max_value=10.0,
        zones=[
            GaugeZone(from_val=-10.0, to_val=-1.0, color="#ef4444", label="Crédito Roto (Alerta)"),
            GaugeZone(from_val=-1.0, to_val=1.0, color="#f59e0b", label="Testeo Soporte"),
            GaugeZone(from_val=1.0, to_val=10.0, color="#10b981", label="Liquidez Sana")
        ],
        status_label="Liquidez Sana" if hyg_bullish else "Deterioro Crediticio",
        status_color="green" if hyg_bullish else "red",
        description=f"Precio ${hyg_price:.2f} vs Media 20W ${hyg_ema20:.2f}.",
        what_it_measures=(
            "Mide la salud del crédito corporativo de alto rendimiento frente a su media móvil de 20 semanas. "
            "Para José Luis Cava es el 'canario en la mina de carbón' del sistema financiero."
        ),
        meaning=(
            f"HYG cotiza un {hyg_diff_pct:+.2f}% respecto a su media de 20 semanas. "
            + ("El mercado de crédito valida el apetito por riesgo: las empresas se financian con fluidez y la liquidez institucional empuja las bolsas al alza." if hyg_bullish else
               "HYG ha perforado su media de 20 semanas. El dinero inteligente se está retirando del riesgo. Si la bolsa sigue subiendo mientras HYG cae, se activa la Divergencia Bajista (Trampa de Mercado).")
        ),
        recommendation=(
            "Vía libre para renta variable: el crédito corporativo acompaña las subidas de la bolsa."
            if hyg_bullish else
            "Prudencia máxima: no perseguir compras en bolsa y ceñir stops de protección. El crédito suele caer antes que las acciones."
        ),
        how_calculated=(
            "Cálculo: ((Precio HYG - Media 20W) / Media 20W) * 100. Pondera 16 puntos en la Capa 1 si es alcista. "
            "Si cae bajo la media mientras SPY está alcista, activa la Regla Cruzada R2 (Divergencia Bajista / Trampa)."
        )
    )


def build_gauge_metrics(
    ind: TechnicalIndicators,
    score_conviction: int = 85,
    confluence_index: int = 80,
    index_explanation: str = "",
    conviction_explanation: str = ""
) -> List[GaugeMetric]:
    """Generate the half-moon gauge metrics for visual rendering."""
    # Gauge 0: Velocímetro de Reglas Cruzadas (Índice de Confluencia)
    confluence_gauge = GaugeMetric(
        id="confluence_index",
        name="Confluencia Reglas Cruzadas",
        current_value=float(confluence_index),
        display_value=f"{confluence_index}/100",
        unit="pts",
        min_value=0.0,
        max_value=100.0,
        zones=[
            GaugeZone(from_val=0.0, to_val=35.0, color="#ef4444", label="Defensivo (<35)"),
            GaugeZone(from_val=35.0, to_val=65.0, color="#f59e0b", label="Transición (35-65)"),
            GaugeZone(from_val=65.0, to_val=100.0, color="#10b981", label="Expansión (≥65)")
        ],
        status_label="Expansión Plena" if confluence_index >= 65 else ("Transición" if confluence_index >= 35 else "Régimen Defensivo"),
        status_color="green" if confluence_index >= 65 else ("yellow" if confluence_index >= 35 else "red"),
        description="Resultado neto ponderado de las 3 capas y reglas cruzadas R1-R6.",
        what_it_measures="Mide la puntuación cuantitativa compuesta de todo el mercado según las reglas cruzadas de Cava.",
        meaning=f"Índice en {confluence_index} puntos sobre 100. " + (
            "Entorno de viento a favor: liquidez, tendencia y participación apoyan el riesgo." if confluence_index >= 65
            else "Mercado en transición o con divergencias tácticas." if confluence_index >= 35
            else "Alerta de riesgo sistémico: liquidez seca o tendencia rota."
        ),
        recommendation=(
            "Inversión activa: continuar con compras periódicas e indexación." if confluence_index >= 65
            else "Paciencia y prudencia: no asumir riesgo extra." if confluence_index >= 35
            else "Defensa de capital: liquidez en fondos monetarios y oro."
        ),
        how_calculated=index_explanation or (
            "Cálculo: Capa 1 Macro (max 40 pts) + Capa 2 Tendencia (max 40 pts) + "
            "Capa 3 Momento (max 20 pts) + Ajustes por Reglas Cruzadas activas R1-R6."
        )
    )

    # Gauge 1: S&P 500 vs EMA 50W
    spy_diff = ind.spy_diff_pct
    spy_gauge = GaugeMetric(
        id="spy_ema",
        name="S&P 500 vs EMA 50W",
        current_value=round(spy_diff, 2),
        display_value=f"{spy_diff:+.2f}%",
        unit="%",
        min_value=-15.0,
        max_value=15.0,
        zones=[
            GaugeZone(from_val=-15.0, to_val=-1.0, color="#ef4444", label="Bajo EMA (Peligro)"),
            GaugeZone(from_val=-1.0, to_val=2.0, color="#f59e0b", label="Testeo Soporte"),
            GaugeZone(from_val=2.0, to_val=15.0, color="#10b981", label="Alcista Sano")
        ],
        status_label="Alcista" if spy_diff > 0 else "Alerta Bajista",
        status_color="green" if spy_diff > 0 else "red",
        description=f"Precio ${ind.spy_price:.1f} vs EMA50 ${ind.spy_ema50:.1f} semanal.",
        what_it_measures="Compara el precio actual del S&P 500 con su media móvil de 50 semanas (la famosa 'Línea Azul' de Cava).",
        meaning=(
            f"El índice cotiza un {spy_diff:+.2f}% respecto a su media semanal. "
            + ("La marea monetaria institucional sigue empujando al alza." if spy_diff > 0 else
               "Ha perforado la media de medio plazo, lo que indica riesgo de corrección profunda.")
        ),
        recommendation=(
            "Mantener posiciones y continuar con compras periódicas programadas. Ignorar el ruido de noticias catastróficas."
            if spy_diff > 0 else
            "Pausar nuevas compras en renta variable y ceñir stops de protección de capital."
        ),
        how_calculated="Cálculo: ((Precio SPY - EMA 50W) / EMA 50W) * 100. Pondera 16 puntos en la Capa 2 si es alcista."
    )

    # Gauge 2: Oro vs EMA 50W
    gold_diff = ind.gold_diff_pct
    gold_gauge = GaugeMetric(
        id="gold_ema",
        name="Oro (GLD) vs EMA 50W",
        current_value=round(gold_diff, 2),
        display_value=f"{gold_diff:+.2f}%",
        unit="%",
        min_value=-15.0,
        max_value=15.0,
        zones=[
            GaugeZone(from_val=-15.0, to_val=-1.0, color="#ef4444", label="Corrección Fuerte"),
            GaugeZone(from_val=-1.0, to_val=2.0, color="#f59e0b", label="Zona de Soporte"),
            GaugeZone(from_val=2.0, to_val=15.0, color="#10b981", label="Tendencia Sólida")
        ],
        status_label="Alcista" if gold_diff > 0 else "Bajo Media",
        status_color="green" if gold_diff > 0 else "red",
        description=f"Precio ${ind.gold_price:.1f} vs EMA50 ${ind.gold_ema50:.1f} semanal.",
        what_it_measures="Mide la fortaleza del oro físico como activo duro de cobertura contra la degradación de las monedas fiat (euro y dólar).",
        meaning=(
            f"El oro se encuentra un {gold_diff:+.2f}% sobre su media semanal. "
            + ("La tendencia es impecable y protege el poder adquisitivo frente al ~8% anual de devaluación monetaria." if gold_diff > 0 else
               "En fase de consolidación técnica o corrección transitoria bajo la media.")
        ),
        recommendation=(
            "Mantener y acumular en correcciones. Nunca vender oro mientras mantenga la estructura alcista de fondo."
            if gold_diff > 0 else
            "Esperar formación de suelo antes de añadir más posiciones."
        ),
        how_calculated="Cálculo: ((Precio GLD - EMA 50W) / EMA 50W) * 100. Pondera 8 puntos en la Capa 2 si es alcista."
    )

    # Gauge 3: RSI Semanal del Oro
    rsi_val = ind.gold_rsi14
    rsi_gauge = GaugeMetric(
        id="gold_rsi",
        name="RSI(14) Semanal Oro",
        current_value=round(rsi_val, 1),
        display_value=f"{rsi_val:.1f}",
        unit="pts",
        min_value=15.0,
        max_value=85.0,
        zones=[
            GaugeZone(from_val=15.0, to_val=42.0, color="#10b981", label="Sobreventa / Compra"),
            GaugeZone(from_val=42.0, to_val=70.0, color="#3b82f6", label="Zona Neutra"),
            GaugeZone(from_val=70.0, to_val=85.0, color="#f59e0b", label="Sobrecompra")
        ],
        status_label="Gatillo Compra (≤42)" if rsi_val <= 42 else ("Sobrecompra (>70)" if rsi_val >= 70 else "Neutral"),
        status_color="green" if rsi_val <= 42 else ("yellow" if rsi_val >= 70 else "blue"),
        description="Cava busca compras asimétricas cuando el RSI semanal cae a zona ≤ 40-42.",
        what_it_measures="Oscilador de momento que detecta si el oro está 'caro' por exceso de optimismo o 'barato' por miedo puntual.",
        meaning=(
            "RSI en zona de sobreventa extrema (≤ 42). El pánico temporal ofrece una ventana con descuento."
            if rsi_val <= 42 else (
                "RSI elevado (> 70). El oro ha subido rápido y puede necesitar una pausa antes de seguir subiendo."
                if rsi_val >= 70 else
                "RSI en rango normal de tendencia (42 a 70). Mercado equilibrado sin excesos emocionales."
            )
        ),
        recommendation=(
            "¡Alerta de compra asimétrica ('Home Run')! Desplegar liquidez reservada con stop ceñido bajo el mínimo semanal."
            if rsi_val <= 42 else (
                "No perseguir compras en euforia. Esperar recortes hacia soporte."
                if rsi_val >= 70 else
                "Acumulación periódica estándar sin forzar entradas agresivas."
            )
        ),
        how_calculated="Cálculo: RSI(14) sobre GLD semanal. Pondera 7 pts en rango 42-70. Si cae a ≤42 activa la regla R6 (+8 pts)."
    )

    # Gauge 4: Rendimiento Bono USA 10Y vs PIB nominal
    yield_val = ind.us10y_yield
    gdp_ref = ind.nominal_gdp_ref
    yield_gauge = GaugeMetric(
        id="us10y_yield",
        name="Bono USA 10Y Yield",
        current_value=round(yield_val, 2),
        display_value=f"{yield_val:.2f}%",
        unit="%",
        min_value=2.0,
        max_value=8.0,
        zones=[
            GaugeZone(from_val=2.0, to_val=5.0, color="#10b981", label="Expansivo (<5%)"),
            GaugeZone(from_val=5.0, to_val=round(gdp_ref, 1), color="#f59e0b", label=f"Vigilancia (5-{gdp_ref:.1f}%)"),
            GaugeZone(from_val=round(gdp_ref, 1), to_val=8.0, color="#ef4444", label=f"Restrictivo (>{gdp_ref:.1f}%)")
        ],
        status_label=f"Expansivo (< PIB {gdp_ref:.1f}%)" if yield_val < gdp_ref else f"Restrictivo (> {gdp_ref:.1f}%)",
        status_color="green" if yield_val < gdp_ref else "red",
        description=f"Si el bono supera al crecimiento del PIB nominal ({gdp_ref:.2f}%), el coste de la deuda asfixia la economía.",
        what_it_measures=f"Mide el coste del endeudamiento a 10 años comparado con la velocidad a la que crece la economía de EE.UU. (PIB nominal {gdp_ref:.2f}% según FRED).",
        meaning=(
            f"El rendimiento actual del {yield_val:.2f}% está por debajo del PIB nominal ({gdp_ref:.2f}%). "
            "El coste de la deuda no asfixia a empresas ni familias, manteniendo la expansión económica viva."
            if yield_val < gdp_ref else
            f"El rendimiento ({yield_val:.2f}%) roza o supera el PIB nominal ({gdp_ref:.2f}%). Alerta de freno económico o recesión técnica."
        ),
        recommendation=(
            "Tranquilidad macroeconómica: el entorno financiero sigue siendo propicio para activos de riesgo."
            if yield_val < gdp_ref else
            "Aumentar prudencia y reducir apalancamiento ante el encarecimiento del dinero."
        ),
        how_calculated=f"Cálculo: Rendimiento nominal del bono a 10 años comparado contra el PIB Nominal dinámico de FRED ({gdp_ref:.2f}%). <5.0% = 8 pts, 5.0%-{gdp_ref:.1f}% = 4 pts, ≥{gdp_ref:.1f}% = 0 pts (Capa 1)."
    )

    # Gauge 5: Convicción Global del Sistema
    conviction_gauge = GaugeMetric(
        id="system_conviction",
        name="Convicción del Sistema",
        current_value=float(score_conviction),
        display_value=f"{score_conviction}%",
        unit="%",
        min_value=0.0,
        max_value=100.0,
        zones=[
            GaugeZone(from_val=0.0, to_val=50.0, color="#ef4444", label="Baja / Incertidumbre"),
            GaugeZone(from_val=50.0, to_val=75.0, color="#f59e0b", label="Moderada"),
            GaugeZone(from_val=75.0, to_val=100.0, color="#10b981", label="Alta Convicción")
        ],
        status_label="Alta" if score_conviction >= 75 else ("Moderada" if score_conviction >= 50 else "Baja"),
        status_color="green" if score_conviction >= 75 else ("yellow" if score_conviction >= 50 else "red"),
        description="Porcentaje de indicadores que confirman y empujan en la misma dirección que el régimen.",
        what_it_measures="Mide la unanimidad y confluencia entre los 9 indicadores respecto a la dirección del diagnóstico de mercado.",
        meaning=(
            f"Convicción del {score_conviction}%. Múltiples capas lógicas confirman la misma dirección del mercado, filtrando falsas alarmas."
            if score_conviction >= 75 else
            f"Convicción del {score_conviction}%. Algunas capas muestran divergencias o el mercado está en fase de transición."
        ),
        recommendation=(
            "Operar con alta confianza siguiendo las reglas del régimen activo sin dudar ante titulares de prensa."
            if score_conviction >= 75 else
            "Mantener prudencia y no anticipar movimientos sin confirmación semanal completa."
        ),
        how_calculated=conviction_explanation or (
            "Cálculo: (Indicadores a favor * 1.0 + Neutros * 0.5) / 9 indicadores totales * 100."
        )
    )

    # Gauge 6: Volatilidad VIX
    vix_val = ind.vix_value
    vix_gauge = GaugeMetric(
        id="vix_volatility",
        name="Volatilidad VIX (^VIX)",
        current_value=round(vix_val, 1),
        display_value=f"{vix_val:.1f}",
        unit="pts",
        min_value=10.0,
        max_value=35.0,
        zones=[
            GaugeZone(from_val=10.0, to_val=16.0, color="#10b981", label="Baja (Puts Protegiendo)"),
            GaugeZone(from_val=16.0, to_val=22.0, color="#f59e0b", label="Volatilidad Moderada"),
            GaugeZone(from_val=22.0, to_val=35.0, color="#ef4444", label="Estrés / Miedo")
        ],
        status_label="Complacencia (<16)" if vix_val < 16.0 else ("Moderado" if vix_val < 22.0 else "Alerta Estrés"),
        status_color="green" if vix_val < 16.0 else ("yellow" if vix_val < 22.0 else "red"),
        description="Termómetro del miedo y venta institucional de puts.",
        what_it_measures="Mide la volatilidad implícita a 30 días del S&P 500 según el mercado de opciones del CBOE.",
        meaning=(
            f"VIX en {vix_val:.1f}. Las 'manos fuertes' venden puts masivamente, forzando a los creadores de mercado (dealers) a comprar subyacente para cubrirse (suelo mecánico alcista)."
            if vix_val < 16.0 else
            f"VIX en {vix_val:.1f}. Repunte de volatilidad y mayor demanda de coberturas de protección."
        ),
        recommendation=(
            "Acompañar la tendencia alcista. La baja volatilidad confirma que no hay pánico institucional."
            if vix_val < 16.0 else
            "Ceñir stops y no perseguir subidas verticales hasta que el VIX se relaje."
        ),
        how_calculated="Cálculo: Índice VIX en tiempo real. <16.0 = 12 pts, 16.0-22.0 = 6 pts, >22.0 = 0 pts (Capa 1). Si VIX>22 y HYG está roto, activa R1 (Veto)."
    )

    # Gauge 7: Amplitud de Mercado (Russell 2000 / S&P 500)
    breadth_diff = ind.breadth_diff_pct
    breadth_gauge = GaugeMetric(
        id="market_breadth",
        name="Amplitud (Russell / SPY)",
        current_value=round(breadth_diff, 2),
        display_value=f"{breadth_diff:+.2f}%",
        unit="%",
        min_value=-10.0,
        max_value=10.0,
        zones=[
            GaugeZone(from_val=-10.0, to_val=-2.0, color="#ef4444", label="Alerta Concentración"),
            GaugeZone(from_val=-2.0, to_val=1.5, color="#f59e0b", label="Equilibrada"),
            GaugeZone(from_val=1.5, to_val=10.0, color="#10b981", label="Amplitud Sana")
        ],
        status_label="Sana / Rotación" if breadth_diff >= 1.5 else ("Equilibrada" if breadth_diff >= -2.0 else "Concentración"),
        status_color="green" if breadth_diff >= 1.5 else ("yellow" if breadth_diff >= -2.0 else "red"),
        description="Salud de 2.000 empresas medianas frente a los gigantes del S&P.",
        what_it_measures="Compara el comportamiento relativo de las pequeñas/medianas empresas (Russell 2000) frente a las megacaps del S&P 500.",
        meaning=(
            "Amplitud de mercado saludable. La subida no depende solo de 5 gigantes tecnológicos; el dinero rota y fluye por toda la economía."
            if breadth_diff >= -2.0 else
            "Alerta de concentración. La subida del S&P se sostiene solo en los 7 Magníficos mientras la mayoría de empresas se quedan rezagadas."
        ),
        recommendation=(
            "Entorno de confianza amplia. Es seguro invertir tanto en el índice general como en temáticas de crecimiento."
            if breadth_diff >= -2.0 else
            "Centrar la cartera en el núcleo duro (S&P 500 / Mag 7) y evitar activos más frágiles de pequeña capitalización."
        ),
        how_calculated="Cálculo: Ratio IWM/SPY vs EMA 20W. ≥+1.5% = 16 pts, -2.0% a +1.5% = 8 pts, <-2.0% = 0 pts (Capa 2)."
    )

    spy_rsi_gauge = build_spy_rsi_gauge(ind.spy_rsi14)
    hyg_gauge = build_hyg_gauge(
        hyg_price=ind.hyg_price,
        hyg_ema20=ind.hyg_ema20,
        hyg_diff_pct=ind.hyg_diff_pct,
        hyg_bullish=ind.hyg_bullish
    )

    return [
        confluence_gauge, conviction_gauge,
        hyg_gauge,
        spy_gauge, spy_rsi_gauge, gold_gauge, rsi_gauge,
        yield_gauge, vix_gauge, breadth_gauge
    ]
