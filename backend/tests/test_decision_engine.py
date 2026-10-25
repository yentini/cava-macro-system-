"""Unit Tests for Cava Composite Decision Engine."""
import pytest
from app.decision_engine import (
    evaluate_macro_layer,
    evaluate_trend_layer,
    evaluate_trigger_layer,
    evaluate_combined_system,
    build_gauge_metrics,
    build_spy_rsi_gauge,
    build_hyg_gauge,
)
from app.models import MarketRegime, TechnicalIndicators

def create_base_indicators(**kwargs) -> TechnicalIndicators:
    """Helper factory for TechnicalIndicators fixtures."""
    defaults = {
        "spy_price": 580.0,
        "spy_ema50": 530.0,
        "spy_diff_pct": 9.43,
        "spy_bullish": True,
        "gold_price": 250.0,
        "gold_ema50": 220.0,
        "gold_diff_pct": 13.64,
        "gold_bullish": True,
        "gold_rsi14": 55.0,
        "gold_oversold": False,
        "hyg_price": 79.0,
        "hyg_ema20": 77.0,
        "hyg_diff_pct": 2.6,
        "hyg_bullish": True,
        "us10y_yield": 4.25,
        "nominal_gdp_ref": 6.5,
        "yield_spread_safe": True,
        "fed_balance_trillions": 7.15,
        "is_options_window": False,
    }
    defaults.update(kwargs)
    return TechnicalIndicators(**defaults)

def test_expansion_plena_regime():
    # Arrange
    ind = create_base_indicators(
        spy_bullish=True,
        hyg_bullish=True,
        yield_spread_safe=True
    )

    # Act
    decision = evaluate_combined_system(ind)

    # Assert
    assert decision.regime == MarketRegime.EXPANSION_PLENA
    assert decision.status_color == "green"
    assert decision.score_conviction >= 80
    assert "APORTACIÓN" in decision.action_sp500

def test_oportunidad_asimetrica_regime_on_gold_dip():
    # Arrange: healthy macro but gold oversold (RSI <= 42)
    ind = create_base_indicators(
        hyg_bullish=True,
        yield_spread_safe=True,
        gold_oversold=True,
        gold_rsi14=38.5
    )

    # Act
    decision = evaluate_combined_system(ind)

    # Assert
    assert decision.regime == MarketRegime.OPORTUNIDAD_ASIMETRICA
    assert decision.status_color == "green"
    assert "GATILLO DE COMPRA" in decision.action_gold

def test_divergencia_bajista_regime():
    # Arrange: SPY is bullish but credit (HYG) is breaking down
    ind = create_base_indicators(
        spy_bullish=True,
        hyg_bullish=False,
        hyg_diff_pct=-3.5
    )

    # Act
    decision = evaluate_combined_system(ind)

    # Assert
    assert decision.regime == MarketRegime.DIVERGENCIA_BAJISTA
    assert decision.status_color == "yellow"
    assert "NO PERSEGUIR" in decision.action_sp500

def test_regimen_defensivo_critical():
    # Arrange: SPY below EMA50, HYG broken, high VIX and weak breadth
    ind = create_base_indicators(
        spy_bullish=False,
        spy_diff_pct=-4.0,
        hyg_bullish=False,
        hyg_diff_pct=-5.0,
        vix_value=28.0,
        breadth_healthy=False,
        breadth_diff_pct=-4.0
    )

    # Act
    decision = evaluate_combined_system(ind)

    # Assert
    assert decision.regime == MarketRegime.REGIMEN_DEFENSIVO
    assert decision.status_color == "red"
    assert "PAUSAR COMPRAS" in decision.action_sp500
    assert decision.score_conviction >= 50
    assert decision.confluence_index <= 35
    assert len(decision.cross_rules) == 8
    assert decision.index_explanation != ""
    assert decision.conviction_explanation != ""


def test_r7_fed_liquidity_drain():
    from app.scoring import rule_fed_liquidity_drain
    ind = create_base_indicators()
    ind.fed_net_liquidity_change_pct = -2.4  # Acute contraction
    r7 = rule_fed_liquidity_drain(ind)
    assert r7.id == "R7"
    assert r7.is_active is True
    assert r7.adjustment == -8

    ind.fed_net_liquidity_change_pct = +0.5  # Positive expansion
    r7_inactive = rule_fed_liquidity_drain(ind)
    assert r7_inactive.is_active is False


def test_r8_dxy_headwind():
    from app.scoring import rule_dxy_headwind
    ind = create_base_indicators()
    ind.dxy_value = 106.2  # Strong dollar headwind
    r8 = rule_dxy_headwind(ind)
    assert r8.id == "R8"
    assert r8.is_active is True
    assert r8.adjustment == -5

    ind.dxy_value = 101.8  # Normal range
    r8_inactive = rule_dxy_headwind(ind)
    assert r8_inactive.is_active is False

def test_gauge_metrics_generation():
    # Arrange
    ind = create_base_indicators()

    # Act
    gauges = build_gauge_metrics(ind, 85, 80)

    # Assert
    assert len(gauges) == 13
    gauge_ids = [g.id for g in gauges]
    assert "confluence_index" in gauge_ids
    assert "system_conviction" in gauge_ids
    assert "fed_net_liquidity" in gauge_ids
    assert "hyg_ema" in gauge_ids
    assert "spy_ema" in gauge_ids
    assert "spy_rsi" in gauge_ids
    assert "gold_ema" in gauge_ids
    assert "gold_rsi" in gauge_ids
    assert "us10y_yield" in gauge_ids
    assert "vix_volatility" in gauge_ids
    assert "market_breadth" in gauge_ids
    assert "btc_structural" in gauge_ids
    assert "nominal_illusion" in gauge_ids


def test_build_hyg_gauge():
    # Bullish credit case
    gauge_bull = build_hyg_gauge(hyg_price=79.2, hyg_ema20=77.8, hyg_diff_pct=1.8, hyg_bullish=True)
    assert gauge_bull.id == "hyg_ema"
    assert gauge_bull.status_color == "green"


def test_build_fed_net_liquidity_gauge():
    from app.decision_engine import build_fed_net_liquidity_gauge
    gauge = build_fed_net_liquidity_gauge(
        net_liq_t=5.80,
        net_liq_chg=0.54,
        walcl_t=6.75,
        tga_b=952.0,
        rrp_b=0.24
    )
    assert gauge.id == "fed_net_liquidity"
    assert "$5.80T" in gauge.display_value
    assert gauge.status_color == "green"


def test_regime_state_transition(tmp_path, monkeypatch):
    from app import regime_state
    fake_file = tmp_path / "regime_state.json"
    monkeypatch.setattr(regime_state, "STATE_FILE", fake_file)

    # First check: no previous regime
    changed, prev = regime_state.check_and_update_regime("EXPANSION_PLENA")
    assert changed is False
    assert prev is None

    # Second check: same regime -> no change
    changed, prev = regime_state.check_and_update_regime("EXPANSION_PLENA")
    assert changed is False
    assert prev == "EXPANSION_PLENA"

    # Third check: transition to defensive regime -> changed is True
    changed, prev = regime_state.check_and_update_regime("REGIMEN_DEFENSIVO")
    assert changed is True
    assert prev == "EXPANSION_PLENA"

    # Bearish credit case (Divergence / Crack in high yield)
    gauge_bear = build_hyg_gauge(hyg_price=76.0, hyg_ema20=78.0, hyg_diff_pct=-2.56, hyg_bullish=False)
    assert gauge_bear.id == "hyg_ema"
    assert gauge_bear.status_color == "red"
    assert gauge_bear.status_label == "Deterioro Crediticio"
    assert gauge_bear.current_value == -2.56


@pytest.mark.parametrize(
    "rsi_value, expected_color",
    [
        (40.0, "green"),   # Oversold edge: buy-the-dip trigger
        (25.0, "green"),
        (40.1, "blue"),    # Healthy trend
        (69.9, "blue"),
        (70.0, "yellow"),  # Overbought edge: euphoria
        (82.0, "yellow"),
    ],
)
def test_spy_rsi_gauge_zones(rsi_value, expected_color):
    # Arrange / Act
    gauge = build_spy_rsi_gauge(rsi_value)

    # Assert
    assert gauge.id == "spy_rsi"
    assert gauge.status_color == expected_color
    assert gauge.display_value == f"{rsi_value:.1f}"
