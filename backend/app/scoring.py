"""Explainable point-based scoring for Cava's cross-rules matrix.

Every indicator contributes points to one of three layers (max 100 in total).
Cross rules then adjust that base score when specific combinations appear.

Weights follow the hierarchy used by institutional composite regime models
(credit > trend > breadth > volatility > momentum, roughly 30/25/20/15/10)
plus Cava's own principle: "la liquidez manda".

    Capa 1 Macro & Liquidez (40): HYG 20 + Bono 10Y 8 + VIX 12
    Capa 2 Tendencia semanal (40): S&P 500 16 + Oro 8 + Amplitud 16
    Capa 3 Momento de entrada (20): RSI S&P 8 + RSI Oro 7 + Opciones 5
"""
from typing import List, Tuple

from app.models import CrossRule, LayerEvaluation, RuleCheck, TechnicalIndicators

BULLISH = "bullish"
NEUTRAL = "neutral"
BEARISH = "bearish"

VIX_CALM = 16.0
VIX_STRESS = 22.0
YIELD_COMFORT = 5.0
YIELD_LIMIT = 6.0
BREADTH_HEALTHY = 1.5
BREADTH_CONCENTRATED = -2.0
SPY_RSI_OVERSOLD = 40.0
GOLD_RSI_OVERSOLD = 42.0
RSI_OVERBOUGHT = 70.0

LIQUIDITY_VETO_CAP = 30
EXPANSION_THRESHOLD = 65
DEFENSIVE_THRESHOLD = 35

BULLISH_RATIO = 0.75
BEARISH_RATIO = 0.25

# Neutral signals neither confirm nor contradict a regime, so they count as half.
CONVICTION_WEIGHTS = {
    BULLISH: {BULLISH: 1.0, NEUTRAL: 0.5, BEARISH: 0.0},
    BEARISH: {BEARISH: 1.0, NEUTRAL: 0.5, BULLISH: 0.0},
    NEUTRAL: {NEUTRAL: 1.0, BULLISH: 0.5, BEARISH: 0.5},
}

SIGNAL_LABELS = {BULLISH: "a favor", NEUTRAL: "neutros", BEARISH: "en contra"}


# ---------------------------------------------------------------------------
# Indicator rules
# ---------------------------------------------------------------------------

def classify_signal(points: float, max_points: float) -> str:
    """Map the share of points earned to a directional signal.

    Args:
        points: Points earned by the indicator.
        max_points: Maximum points available (must be > 0 to be meaningful).

    Returns:
        "bullish" (>= 75 %), "bearish" (<= 25 %) or "neutral".
    """
    ratio = points / max_points if max_points else 0.0
    if ratio >= BULLISH_RATIO:
        return BULLISH
    if ratio <= BEARISH_RATIO:
        return BEARISH
    return NEUTRAL


def build_rule(
    rule_id: str, indicator: str, value_text: str, condition: str,
    points: float, max_points: float, explanation: str,
) -> RuleCheck:
    """Create a RuleCheck, deriving its signal from the points earned."""
    return RuleCheck(
        id=rule_id, indicator=indicator, value_text=value_text, condition=condition,
        points=points, max_points=max_points,
        signal=classify_signal(points, max_points), explanation=explanation,
    )


def score_hyg(ind: TechnicalIndicators) -> RuleCheck:
    """Credit appetite: HYG above its 20-week EMA (20 pts) enriched with OAS Spread."""
    is_above = ind.hyg_bullish
    spread_info = f" (OAS: {ind.hy_oas_spread:.2f}%)" if ind.hy_oas_spread else ""
    return build_rule(
        "hyg", "Bonos basura (HYG) vs media 20W", f"{ind.hyg_diff_pct:+.2f}% vs media{spread_info}",
        "Sobre la media 20W" if is_above else "Bajo la media 20W",
        20 if is_above else 0, 20,
        f"El crédito de alto riesgo cotiza con un diferencial OAS de {ind.hy_oas_spread:.2f}% sobre el Tesoro. "
        "Tiene el mayor peso porque el dinero inteligente opera en crédito: si se seca, la bolsa no se sostiene.",
    )


def score_us10y(ind: TechnicalIndicators) -> RuleCheck:
    """Cost of money: US 10Y yield tiers (<5 % = 8, 5-GDP_ref % = 4, >=GDP_ref % = 0) with 10Y-2Y curve."""
    yield_val = ind.us10y_yield
    gdp_limit = ind.nominal_gdp_ref if ind.nominal_gdp_ref > YIELD_COMFORT else YIELD_LIMIT
    curve_info = f" | Curva 10Y-2Y: {ind.yield_curve_10y2y:+.2f}%"
    if yield_val < YIELD_COMFORT:
        points, condition = 8, f"Menor del 5 % (expansivo){curve_info}"
    elif yield_val < gdp_limit:
        points, condition = 4, f"Entre 5 % y {gdp_limit:.1f} % (vigilancia){curve_info}"
    else:
        points, condition = 0, f"{gdp_limit:.1f} % o más (restrictivo){curve_info}"
    return build_rule(
        "us10y", "Bono USA 10Y & Curva", f"{yield_val:.2f}% (Curva: {ind.yield_curve_10y2y:+.2f}%)", condition, points, 8,
        f"Bono 10Y en {yield_val:.2f}% frente al crecimiento del PIB nominal ({ind.nominal_gdp_ref:.2f}% según FRED). "
        f"La curva 10Y-2Y cotiza en {ind.yield_curve_10y2y:+.2f}% de pendiente.",
    )


def score_vix(ind: TechnicalIndicators) -> RuleCheck:
    """Fear gauge: VIX tiers (<16 = 12, 16-22 = 6, >22 = 0)."""
    vix = ind.vix_value
    if vix < VIX_CALM:
        points, condition = 12, "Menor de 16 (calma)"
    elif vix <= VIX_STRESS:
        points, condition = 6, "Entre 16 y 22 (moderado)"
    else:
        points, condition = 0, "Mayor de 22 (estrés)"
    return build_rule(
        "vix", "Volatilidad VIX", f"{vix:.1f}", condition, points, 12,
        "Mide el miedo en opciones. Pesa menos que el crédito porque a veces da sustos falsos, "
        "pero un VIX alto confirma que las manos fuertes están comprando protección.",
    )


def score_spy_trend(ind: TechnicalIndicators) -> RuleCheck:
    """Structural equity trend: S&P 500 above its 50-week EMA (16 pts)."""
    is_above = ind.spy_bullish
    return build_rule(
        "spy_trend", "S&P 500 vs EMA 50W", f"{ind.spy_diff_pct:+.2f}% vs EMA",
        "Sobre la EMA 50W" if is_above else "Bajo la EMA 50W",
        16 if is_above else 0, 16,
        "La 'línea azul' de Cava. Mientras el índice esté sobre su media de 50 semanas, la "
        "tendencia de fondo es alcista y las caídas son correcciones, no cambios de ciclo.",
    )


def score_gold_trend(ind: TechnicalIndicators) -> RuleCheck:
    """Hard-asset trend: Gold above its 50-week EMA (8 pts)."""
    is_above = ind.gold_bullish
    return build_rule(
        "gold_trend", "Oro vs EMA 50W", f"{ind.gold_diff_pct:+.2f}% vs EMA",
        "Sobre la EMA 50W" if is_above else "Bajo la EMA 50W",
        8 if is_above else 0, 8,
        "El oro protege frente a la devaluación de las monedas. Pesa menos que el S&P porque "
        "es la cobertura de la cartera, no el motor principal del ciclo.",
    )


def score_breadth(ind: TechnicalIndicators) -> RuleCheck:
    """Participation: Russell 2000 / S&P 500 ratio vs its 20W EMA (16/8/0)."""
    diff = ind.breadth_diff_pct
    if diff >= BREADTH_HEALTHY:
        points, condition = 16, "≥ +1,5 % (amplitud sana)"
    elif diff >= BREADTH_CONCENTRATED:
        points, condition = 8, "Entre −2 % y +1,5 % (equilibrada)"
    else:
        points, condition = 0, "< −2 % (concentración)"
    return build_rule(
        "breadth", "Amplitud Russell / S&P", f"{diff:+.2f}%", condition, points, 16,
        "Comprueba si la subida es de todo el mercado o solo de unos pocos gigantes. "
        "Una subida estrecha (solo los 7 Magníficos) es más frágil.",
    )


def score_spy_rsi(ind: TechnicalIndicators) -> RuleCheck:
    """S&P 500 weekly RSI momentum (40-70 = 8, <=40 = 4, >=70 = 2)."""
    rsi = ind.spy_rsi14
    if rsi <= SPY_RSI_OVERSOLD:
        points, condition = 4, "≤ 40 (sobreventa: depende de la tendencia, ver R5)"
    elif rsi >= RSI_OVERBOUGHT:
        points, condition = 2, "≥ 70 (euforia)"
    else:
        points, condition = 8, "Entre 40 y 70 (impulso sano)"
    return build_rule(
        "spy_rsi", "RSI(14) semanal S&P 500", f"{rsi:.1f}", condition, points, 8,
        "Un RSI entre 40 y 70 es una subida ordenada. Por debajo de 40 puede ser oportunidad "
        "o rotura: lo decide la regla cruzada R5. Por encima de 70 hay euforia.",
    )


def score_gold_rsi(ind: TechnicalIndicators) -> RuleCheck:
    """Gold weekly RSI momentum (42-70 = 7, <=42 = 4, >=70 = 2)."""
    rsi = ind.gold_rsi14
    if rsi <= GOLD_RSI_OVERSOLD:
        points, condition = 4, "≤ 42 (sobreventa: ver R6)"
    elif rsi >= RSI_OVERBOUGHT:
        points, condition = 2, "≥ 70 (sobrecompra)"
    else:
        points, condition = 7, "Entre 42 y 70 (impulso sano)"
    return build_rule(
        "gold_rsi", "RSI(14) semanal Oro", f"{rsi:.1f}", condition, points, 7,
        "Igual que en el S&P: la zona media es sana; la sobreventa solo es compra si la "
        "tendencia y los tipos acompañan (regla R6).",
    )


def score_options_window(ind: TechnicalIndicators) -> RuleCheck:
    """Options expiration window (active = 5, inactive = 2) with dynamic 3rd Friday OPEX."""
    is_active = ind.is_options_window
    detail_str = (
        "Ventana Activa (±7 días del 3.er viernes)"
        if is_active
        else (f"Próximo: {ind.next_options_date} ({ind.days_to_next_options}d)" if ind.next_options_date else "Fuera de ventana")
    )
    return build_rule(
        "options", "Ventana de vencimientos de opciones (OPEX)", detail_str,
        "Ventana activa (semana OPEX trimestral)" if is_active else "Fuera de ventana",
        5 if is_active else 2, 5,
        "Cava vigila los vencimientos trimestrales (3.er viernes de marzo, junio, septiembre y diciembre): "
        "las liquidaciones masivas de opciones gamma suelen provocar techos o suelos tácticos.",
    )


# ---------------------------------------------------------------------------
# Layers
# ---------------------------------------------------------------------------

def build_layer(
    layer_num: int, name: str, rules: List[RuleCheck],
    weight_rationale: str, summaries: Tuple[str, str, str],
) -> LayerEvaluation:
    """Aggregate rule points into a layer with a strength label.

    Args:
        summaries: Texts for strong (>= 75 %), acceptable (>= 50 %) and weak states.
    """
    score = sum(rule.points for rule in rules)
    max_score = sum(rule.max_points for rule in rules)
    ratio = score / max_score if max_score else 0.0
    if ratio >= BULLISH_RATIO:
        label, summary = "Fuerte", summaries[0]
    elif ratio >= 0.5:
        label, summary = "Aceptable", summaries[1]
    else:
        label, summary = "Débil", summaries[2]
    return LayerEvaluation(
        layer_num=layer_num, name=name, is_healthy=ratio >= 0.5,
        status_label=f"{label} · {score:g}/{max_score:g}", summary=summary,
        details=[f"{r.indicator}: {r.condition} → {r.points:g}/{r.max_points:g} pts" for r in rules],
        score=score, max_score=max_score, weight_rationale=weight_rationale, rules=rules,
    )


def score_layers(ind: TechnicalIndicators) -> List[LayerEvaluation]:
    """Score Cava's three layers. Their maximums add up to 100 points."""
    macro = build_layer(
        1, "Capa 1: Macro & Liquidez", [score_hyg(ind), score_us10y(ind), score_vix(ind)],
        "40 % del total: 'la liquidez manda'. El crédito (HYG) es lo que más pesa.",
        ("Crédito, tipos y volatilidad apoyan el riesgo.",
         "Liquidez aceptable con algún punto de vigilancia.",
         "Tensión en crédito, tipos o volatilidad: la liquidez no acompaña."),
    )
    trend = build_layer(
        2, "Capa 2: Tendencia Estructural (Semanal)",
        [score_spy_trend(ind), score_gold_trend(ind), score_breadth(ind)],
        "40 % del total: tendencia de fondo y participación de todo el mercado.",
        ("Tendencia alcista amplia en bolsa y oro.",
         "Tendencia mixta o concentrada en pocos valores.",
         "Tendencia de fondo rota en los activos principales."),
    )
    timing = build_layer(
        3, "Capa 3: Momento de Entrada",
        [score_spy_rsi(ind), score_gold_rsi(ind), score_options_window(ind)],
        "20 % del total: afina el momento, nunca decide el régimen por sí sola.",
        ("Impulso sano y sin excesos.",
         "Momento mejorable: hay sobreventa o euforia en algún activo.",
         "Momento poco favorable: euforia o estrés en el impulso."),
    )
    return [macro, trend, timing]


# ---------------------------------------------------------------------------
# Cross rules
# ---------------------------------------------------------------------------

def rule_liquidity_veto(ind: TechnicalIndicators) -> CrossRule:
    """R1: credit breaking down plus stress or broken equity trend caps the index."""
    return CrossRule(
        id="R1", name="Veto de liquidez",
        condition="HYG bajo su media 20W Y (VIX > 22 O S&P 500 bajo su EMA 50W)",
        is_active=not ind.hyg_bullish and (ind.vix_value > VIX_STRESS or not ind.spy_bullish),
        direction=BEARISH, adjustment=0,
        effect=f"Tope: el índice no puede pasar de {LIQUIDITY_VETO_CAP} → Régimen Defensivo",
        explanation="Cuando el crédito se seca y además hay pánico o la bolsa rompe su tendencia, "
                    "da igual lo que digan el resto de indicadores: es riesgo sistémico.",
        cava_action="Proteger capital: pausar compras, stops ceñidos y mantener el oro como cobertura.",
    )


def rule_bull_trap(ind: TechnicalIndicators) -> CrossRule:
    """R2: equities rising while credit weakens (divergence)."""
    return CrossRule(
        id="R2", name="Trampa alcista (divergencia)",
        condition="S&P 500 sobre su EMA 50W PERO HYG bajo su media 20W",
        is_active=ind.spy_bullish and not ind.hyg_bullish,
        direction=BEARISH, adjustment=-10, effect="−10 puntos → Divergencia Bajista",
        explanation="La bolsa sube pero el dinero inteligente sale del crédito de riesgo. "
                    "Es la señal clásica de que la subida no está validada.",
        cava_action="No perseguir precios y ceñir stops hasta que el crédito confirme.",
    )


def rule_fragile_complacency(ind: TechnicalIndicators) -> CrossRule:
    """R3: very low VIX while the rally is concentrated in few names."""
    return CrossRule(
        id="R3", name="Complacencia frágil",
        condition="VIX < 16 Y amplitud < −2 % (subida concentrada)",
        is_active=ind.vix_value < VIX_CALM and ind.breadth_diff_pct < BREADTH_CONCENTRATED,
        direction=BEARISH, adjustment=-8, effect="−8 puntos",
        explanation="Nadie tiene miedo, pero solo suben unos pocos gigantes. Cualquier tropiezo "
                    "de esos valores arrastra al índice sin red de seguridad.",
        cava_action="Mantener el núcleo, pero no aumentar riesgo ni apalancamiento.",
    )


def rule_unsupported_euphoria(ind: TechnicalIndicators) -> CrossRule:
    """R4: overbought S&P 500 with narrow participation."""
    return CrossRule(
        id="R4", name="Euforia sin apoyo",
        condition="RSI semanal S&P ≥ 70 Y amplitud < −2 %",
        is_active=ind.spy_rsi14 >= RSI_OVERBOUGHT and ind.breadth_diff_pct < BREADTH_CONCENTRATED,
        direction=BEARISH, adjustment=-6, effect="−6 puntos",
        explanation="El índice está sobrecalentado y la subida no la acompaña el resto del mercado.",
        cava_action="No perseguir la subida vertical; esperar un retroceso hacia la EMA 50W.",
    )


def rule_spy_asymmetric_buy(ind: TechnicalIndicators) -> CrossRule:
    """R5: oversold S&P 500 inside a healthy trend with healthy credit."""
    return CrossRule(
        id="R5", name="Compra asimétrica S&P 500",
        condition="RSI semanal S&P ≤ 40 Y S&P sobre EMA 50W Y HYG sobre su media 20W",
        is_active=(ind.spy_rsi14 <= SPY_RSI_OVERSOLD and ind.spy_bullish and ind.hyg_bullish),
        direction=BULLISH, adjustment=10, effect="+10 puntos → Oportunidad Asimétrica",
        explanation="Caída por miedo puntual mientras la tendencia de fondo y el crédito siguen "
                    "sanos: poco riesgo y mucho recorrido.",
        cava_action="Comprar la caída con stop bajo el mínimo semanal.",
    )


def rule_gold_asymmetric_buy(ind: TechnicalIndicators) -> CrossRule:
    """R6: oversold gold inside its uptrend with tolerable yields."""
    return CrossRule(
        id="R6", name="Compra asimétrica Oro",
        condition="RSI semanal Oro ≤ 42 Y Oro sobre EMA 50W Y Bono 10Y < 6 %",
        is_active=(ind.gold_rsi14 <= GOLD_RSI_OVERSOLD and ind.gold_bullish
                   and ind.us10y_yield < YIELD_LIMIT),
        direction=BULLISH, adjustment=8, effect="+8 puntos → Oportunidad Asimétrica",
        explanation="El oro corrige dentro de su tendencia alcista y los tipos no lo penalizan.",
        cava_action="Desplegar liquidez reservada en oro con stop bajo el mínimo semanal.",
    )


def evaluate_cross_rules(ind: TechnicalIndicators) -> List[CrossRule]:
    """Evaluate all cross rules (active or not) so the UI can show the full matrix."""
    return [
        rule_liquidity_veto(ind),
        rule_bull_trap(ind),
        rule_fragile_complacency(ind),
        rule_unsupported_euphoria(ind),
        rule_spy_asymmetric_buy(ind),
        rule_gold_asymmetric_buy(ind),
    ]


def is_rule_active(cross_rules: List[CrossRule], rule_id: str) -> bool:
    """Return True if the cross rule with the given id is active."""
    return any(rule.id == rule_id and rule.is_active for rule in cross_rules)


# ---------------------------------------------------------------------------
# Composite numbers
# ---------------------------------------------------------------------------

def compute_confluence_index(base_score: float, cross_rules: List[CrossRule]) -> int:
    """Apply cross-rule adjustments and the liquidity veto cap to the base score.

    Returns:
        Confluence index clamped to [0, 100].
    """
    adjustment = sum(rule.adjustment for rule in cross_rules if rule.is_active)
    index = max(0.0, min(100.0, base_score + adjustment))
    if is_rule_active(cross_rules, "R1"):
        index = min(index, LIQUIDITY_VETO_CAP)
    return round(index)


def explain_confluence_index(
    layers: List[LayerEvaluation], cross_rules: List[CrossRule], index: int,
) -> str:
    """Human-readable formula of how the confluence index was obtained."""
    base = sum(layer.score for layer in layers)
    layer_terms = " + ".join(f"Capa {l.layer_num} ({l.score:g}/{l.max_score:g})" for l in layers)
    active = [rule for rule in cross_rules if rule.is_active]
    if not active:
        return f"{layer_terms} = {base:g} pts. Ninguna regla cruzada activa → Índice {index}."
    rule_terms = ", ".join(
        f"{r.id} {r.name} ({r.adjustment:+g})" if r.adjustment else f"{r.id} {r.name} (tope {LIQUIDITY_VETO_CAP})"
        for r in active
    )
    return f"{layer_terms} = {base:g} pts. Reglas cruzadas: {rule_terms} → Índice {index}."


def compute_conviction(rules: List[RuleCheck], direction: str) -> Tuple[int, str]:
    """Measure how many indicators agree with the regime's direction.

    Args:
        rules: All indicator checks from the three layers.
        direction: Regime direction ("bullish", "bearish" or "neutral").

    Returns:
        Tuple of (conviction 0-100, explanation text).

    Raises:
        KeyError: If direction is not a known signal.
    """
    weights = CONVICTION_WEIGHTS[direction]
    counts = {signal: sum(1 for r in rules if r.signal == signal) for signal in weights}
    total = sum(weights[r.signal] for r in rules)
    conviction = round(100 * total / len(rules)) if rules else 0
    parts = " + ".join(
        f"{counts[s]} {_signal_label(s, direction)} ×{weights[s]:g}" for s in weights
    )
    explanation = f"({parts}) / {len(rules)} indicadores = {conviction} %."
    return conviction, explanation


def _signal_label(signal: str, direction: str) -> str:
    """Describe a signal relative to the regime direction (e.g. 'a favor', 'en contra')."""
    if direction == NEUTRAL:
        return {NEUTRAL: "neutros", BULLISH: "alcistas", BEARISH: "bajistas"}[signal]
    if signal == direction:
        return "a favor"
    return "neutros" if signal == NEUTRAL else "en contra"
