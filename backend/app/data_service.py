"""Data Acquisition Service for Cava Macro Dashboard.

Retrieves market data via yfinance and macroeconomic indicators via fredapi.
Includes resilient fallback caches to guarantee high availability.
"""
from datetime import datetime, timedelta
import json
import logging
from typing import Dict, List, Tuple
import urllib.parse
import urllib.request
import pandas as pd
import numpy as np

try:
    import yfinance as yf
except ImportError:
    yf = None

try:
    from fredapi import Fred
except ImportError:
    Fred = None

from app.config import settings
from app.models import ChartDataPoint, TechnicalIndicators

logger = logging.getLogger(__name__)

# Cache store
_DATA_CACHE: Dict[str, any] = {
    "timestamp": None,
    "indicators": None,
    "charts": None,
}
CACHE_TTL_SECONDS = 1800  # 30 minutes

def calculate_ema(series: pd.Series, span: int) -> pd.Series:
    """Calculate exponential moving average."""
    return series.ewm(span=span, adjust=False).mean()

def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Calculate Relative Strength Index (RSI)."""
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / (loss.replace(0, np.nan))
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(50.0)

def get_third_friday(year: int, month: int) -> datetime:
    """Return the third Friday of a given year and month."""
    first_day = datetime(year, month, 1)
    days_to_first_friday = (4 - first_day.weekday()) % 7
    first_friday = first_day + timedelta(days=days_to_first_friday)
    return first_friday + timedelta(weeks=2)

def calculate_options_expiration_metrics(reference_date: datetime | None = None) -> Tuple[bool, int, str]:
    """Calculate whether today is within the quarterly OPEX window (+-7 days of 3rd Friday in Mar/Jun/Sep/Dec),
    the days remaining to the next expiration, and its formatted date string.
    """
    today = reference_date or datetime.now()
    year = today.year
    quarter_months = [3, 6, 9, 12]

    expirations: List[datetime] = []
    for y in (year - 1, year, year + 1):
        for m in quarter_months:
            expirations.append(get_third_friday(y, m))

    is_window = any(abs((today.date() - exp.date()).days) <= 7 for exp in expirations)
    future_expirations = [exp for exp in expirations if exp.date() >= today.date()]
    next_exp = min(future_expirations, key=lambda exp: (exp.date() - today.date()).days)
    days_to_next = (next_exp.date() - today.date()).days
    next_exp_str = next_exp.strftime("%d/%m/%Y")

    return is_window, days_to_next, next_exp_str

def is_options_expiration_window() -> bool:
    """Check if today is within major quarterly options expiration window (March/June/Sept/Dec)."""
    is_window, _, _ = calculate_options_expiration_metrics()
    return is_window

def fetch_yahoo_direct_candles(ticker: str, range_str: str = "1y", interval_str: str = "1wk") -> pd.DataFrame:
    """Fetch candles directly from Yahoo Finance Chart API with standard browser headers."""
    encoded_ticker = urllib.parse.quote(ticker.strip())
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded_ticker}?range={range_str}&interval={interval_str}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    
    chart = data.get("chart", {})
    results = chart.get("result")
    if not results or len(results) == 0:
        raise ValueError(f"No chart data returned for {ticker}")
    
    item = results[0]
    timestamps = item.get("timestamp", [])
    quotes = item.get("indicators", {}).get("quote", [{}])[0]
    closes = quotes.get("close", [])
    
    if not timestamps or not closes:
        raise ValueError(f"Empty price series for {ticker}")
    
    dates = [datetime.fromtimestamp(ts) for ts in timestamps]
    df = pd.DataFrame({
        "Open": quotes.get("open", closes),
        "High": quotes.get("high", closes),
        "Low": quotes.get("low", closes),
        "Close": closes,
        "Volume": quotes.get("volume", [0] * len(closes))
    }, index=pd.DatetimeIndex(dates))
    
    return df.dropna(subset=["Close"])

def fetch_yfinance_weekly(ticker: str, period: str = "3y") -> pd.DataFrame:
    """Fetch weekly candles for a ticker using direct Yahoo API with yfinance fallback."""
    try:
        df = fetch_yahoo_direct_candles(ticker, range_str=period, interval_str="1wk")
        if not df.empty and len(df) >= 5:
            return df
    except Exception as exc:
        logger.debug("Direct Yahoo API failed for %s weekly: %s. Trying yf.download", ticker, exc)
    if yf is None:
        raise RuntimeError("yfinance is not installed")
    df = yf.download(ticker, period=period, interval="1wk", progress=False)
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df = df.dropna()
    return df

def fetch_yfinance_daily(ticker: str, period: str = "1y") -> pd.DataFrame:
    """Fetch daily candles for a ticker using direct Yahoo API with yfinance fallback."""
    try:
        df = fetch_yahoo_direct_candles(ticker, range_str=period, interval_str="1d")
        if not df.empty and len(df) >= 5:
            return df
    except Exception as exc:
        logger.debug("Direct Yahoo API failed for %s daily: %s. Trying yf.download", ticker, exc)
    if yf is None:
        raise RuntimeError("yfinance is not installed")
    df = yf.download(ticker, period=period, interval="1d", progress=False)
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df = df.dropna()
    return df

def fetch_fred_indicators(api_key: str) -> Tuple[float, float, float, float, float, float, float, float, float]:
    """Fetch Fed balance (WALCL), Fed 4W % change, HY OAS Spread, Nominal GDP YoY %, 10Y-2Y Yield Curve,
    Fed Net Liquidity in Trillions (WALCL - TGA - RRP), Net Liquidity 4W % change, TGA in Billions, and RRP in Billions.
    """
    default_balance_t = 6.75  # ~6.75 Trillion
    default_fed_change_pct = 0.09  # +0.09%
    default_hy_spread = 3.20  # ~3.2%
    default_nominal_gdp = 6.31  # ~6.31%
    default_10y2y_curve = 0.31  # +0.31%
    default_net_liq_t = 5.80  # ~5.80 Trillion
    default_net_liq_change_pct = 0.54  # +0.54%
    default_tga_b = 952.0  # ~$952B
    default_rrp_b = 0.24  # ~$0.24B

    if not api_key or Fred is None:
        return (
            default_balance_t, default_fed_change_pct, default_hy_spread,
            default_nominal_gdp, default_10y2y_curve, default_net_liq_t,
            default_net_liq_change_pct, default_tga_b, default_rrp_b
        )

    balance_trillions = default_balance_t
    fed_change_pct = default_fed_change_pct
    latest_spread = default_hy_spread
    nominal_gdp = default_nominal_gdp
    yield_curve_10y2y = default_10y2y_curve
    net_liq_t = default_net_liq_t
    net_liq_chg_pct = default_net_liq_change_pct
    tga_billions = default_tga_b
    rrp_billions = default_rrp_b

    try:
        fred = Fred(api_key=api_key)
        # WALCL is reported weekly in Millions
        walcl_series = fred.get_series("WALCL").dropna()
        tga_series = fred.get_series("WTREGEN").dropna()
        rrp_series = fred.get_series("RRPONTSYD").dropna()

        if not walcl_series.empty:
            latest_walcl_m = float(walcl_series.iloc[-1])
            balance_trillions = round(latest_walcl_m / 1_000_000, 2)
            if len(walcl_series) >= 5:
                prev_4w_walcl_m = float(walcl_series.iloc[-5])
                fed_change_pct = round(((latest_walcl_m - prev_4w_walcl_m) / prev_4w_walcl_m) * 100, 2)

            # Net Liquidity = WALCL (Total Assets) - TGA (WTREGEN) - RRP (RRPONTSYD)
            latest_tga_m = float(tga_series.iloc[-1]) if not tga_series.empty else (default_tga_b * 1000.0)
            tga_billions = round(latest_tga_m / 1000.0, 1)

            latest_rrp_b = float(rrp_series.iloc[-1]) if not rrp_series.empty else default_rrp_b
            rrp_billions = round(latest_rrp_b, 2)

            walcl_b = latest_walcl_m / 1000.0
            tga_b = latest_tga_m / 1000.0
            rrp_b = latest_rrp_b

            current_net_liq_b = walcl_b - tga_b - rrp_b
            net_liq_t = round(current_net_liq_b / 1000.0, 2)

            if len(walcl_series) >= 5 and len(tga_series) >= 5:
                prev_walcl_m = float(walcl_series.iloc[-5])
                prev_tga_m = float(tga_series.iloc[-5])
                prev_rrp_b = float(rrp_series.asof(walcl_series.index[-5])) if not rrp_series.empty else latest_rrp_b
                prev_net_liq_b = (prev_walcl_m / 1000.0) - (prev_tga_m / 1000.0) - prev_rrp_b
                if prev_net_liq_b > 0:
                    net_liq_chg_pct = round(((current_net_liq_b - prev_net_liq_b) / prev_net_liq_b) * 100, 2)
    except Exception as exc:
        logger.warning("Could not fetch Net Liquidity from FRED: %s", exc)

    try:
        fred = Fred(api_key=api_key)
        spread_series = fred.get_series("BAMLH0A0HYM2").dropna()
        if not spread_series.empty:
            latest_spread = round(float(spread_series.iloc[-1]), 2)
    except Exception as exc:
        logger.warning("Could not fetch HY Spread from FRED: %s", exc)

    try:
        fred = Fred(api_key=api_key)
        # Fetch US Nominal GDP (Gross Domestic Product in Billions, quarterly series)
        gdp_series = fred.get_series("GDP").dropna()
        if len(gdp_series) >= 5:
            latest_gdp = float(gdp_series.iloc[-1])
            prev_year_gdp = float(gdp_series.iloc[-5])
            nominal_gdp = round(((latest_gdp - prev_year_gdp) / prev_year_gdp) * 100, 2)
    except Exception as exc:
        logger.warning("Could not fetch GDP from FRED: %s", exc)

    try:
        fred = Fred(api_key=api_key)
        curve_series = fred.get_series("T10Y2Y").dropna()
        if not curve_series.empty:
            yield_curve_10y2y = round(float(curve_series.iloc[-1]), 2)
    except Exception as exc:
        logger.warning("Could not fetch T10Y2Y from FRED: %s", exc)

    return (
        balance_trillions, fed_change_pct, latest_spread, nominal_gdp,
        yield_curve_10y2y, net_liq_t, net_liq_chg_pct, tga_billions, rrp_billions
    )

def generate_mock_indicators() -> Tuple[TechnicalIndicators, Dict[str, List[ChartDataPoint]]]:
    """Generate realistic fallback indicators and charts if network is offline."""
    now = datetime.now()
    indicators = TechnicalIndicators(
        spy_price=586.40,
        spy_ema50=535.20,
        spy_diff_pct=round(((586.40 - 535.20) / 535.20) * 100, 2),
        spy_bullish=True,
        spy_rsi14=63.2,
        spy_oversold=False,
        gold_price=252.80,
        gold_ema50=224.50,
        gold_diff_pct=round(((252.80 - 224.50) / 224.50) * 100, 2),
        gold_bullish=True,
        gold_rsi14=56.4,
        gold_oversold=False,
        hyg_price=79.20,
        hyg_ema20=77.80,
        hyg_diff_pct=round(((79.20 - 77.80) / 77.80) * 100, 2),
        hyg_bullish=True,
        us10y_yield=4.24,
        nominal_gdp_ref=6.31,
        yield_spread_safe=True,
        vix_value=14.2,
        vix_low=True,
        breadth_ratio=0.38,
        breadth_diff_pct=1.45,
        breadth_healthy=True,
        fed_balance_trillions=6.75,
        fed_balance_change_pct=0.09,
        fed_net_liquidity_trillions=5.80,
        fed_net_liquidity_change_pct=0.54,
        tga_billions=952.0,
        rrp_billions=0.24,
        hy_oas_spread=3.40,
        yield_curve_10y2y=0.31,
        vix_term_ratio=0.95,
        vix_term_structure="CONTANGO",
        dxy_value=101.8,
        is_options_window=is_options_expiration_window(),
        days_to_next_options=54,
        next_options_date="18/12/2026",
        btc_price=67500.0,
        btc_ema50=61200.0,
        btc_diff_pct=round(((67500.0 - 61200.0) / 61200.0) * 100, 2),
        btc_bullish=True,
        btc_rsi14=58.5,
        btc_oversold=False,
        spy_net_liquidity_ratio=round(586.40 / 5.80, 2),
        spy_net_liquidity_diff_pct=round(9.56 - 0.54, 2),
        spy_gold_ratio=round(586.40 / 252.80, 2)
    )

    dates = [(now - timedelta(weeks=i)).strftime("%Y-%m-%d") for i in range(52, -1, -1)]
    # SPY: Steady equity market climb with mid-cycle pullback and late surge
    spy_chart = []
    for i, d in enumerate(dates):
        c = round(470.0 + (i * 2.1) + 10.0 * np.sin(i / 5.0) + (i % 3), 2)
        o = round(c - (1.2 * np.sin(i * 1.7)) + 0.3, 2)
        h = round(max(c, o) + abs(np.cos(i / 3.0)) * 2.5 + 0.8, 2)
        l = round(min(c, o) - abs(np.sin(i / 2.5)) * 2.2 - 0.7, 2)
        spy_chart.append(
            ChartDataPoint(
                date=d,
                price=c,
                ema=round(465.0 + (i * 1.4), 2),
                open=o,
                high=h,
                low=l,
                volume=round(65000000 + 15000000 * np.sin(i / 4.0), 0)
            )
        )

    # Gold (GLD): Parabolic gold rally in Spring, consolidation in Summer, new highs in Autumn
    gold_chart = []
    for i, d in enumerate(dates):
        c = round(185.0 + (35.0 / (1.0 + np.exp(-(i - 16) / 3.0))) + (32.0 / (1.0 + np.exp(-(i - 38) / 3.5))) + 3.0 * np.cos(i / 4.0), 2)
        o = round(c - (1.0 * np.sin(i * 1.5)), 2)
        h = round(max(c, o) + abs(np.sin(i / 3.5)) * 1.8 + 0.6, 2)
        l = round(min(c, o) - abs(np.cos(i / 3.0)) * 1.6 - 0.5, 2)
        gold_chart.append(
            ChartDataPoint(
                date=d,
                price=c,
                ema=round(184.0 + (i * 1.3), 2),
                rsi=round(50.0 + 18.0 * np.sin(i / 4.0), 1),
                open=o,
                high=h,
                low=l,
                volume=round(8000000 + 2000000 * np.cos(i / 3.0), 0)
            )
        )

    # HYG: Credit bond ETF oscillating in tight band between 74 and 79
    hyg_chart = []
    for i, d in enumerate(dates):
        c = round(76.0 + 1.8 * np.sin(i / 6.0) + 0.3 * ((i % 4) - 1.5), 2)
        o = round(c - 0.2 * np.cos(i / 2.0), 2)
        h = round(max(c, o) + 0.45, 2)
        l = round(min(c, o) - 0.40, 2)
        hyg_chart.append(
            ChartDataPoint(
                date=d,
                price=c,
                ema=round(76.2 + 0.03 * i, 2),
                open=o,
                high=h,
                low=l,
                volume=round(35000000 + 8000000 * np.sin(i / 5.0), 0)
            )
        )

    # BTC: Bitcoin halving cycle and monetary debasement hedge
    btc_chart = []
    for i, d in enumerate(dates):
        t = i / 51.0
        c = round(42000.0 + (t * 22000.0) + 12000.0 / (1.0 + np.exp(-(t - 0.4) * 14.0)) + np.sin(t * 12.0) * 2500.0, 2)
        o = round(c - (500.0 * np.sin(i * 1.4)), 2)
        h = round(max(c, o) + abs(np.cos(i * 2.0)) * 1200.0 + 400.0, 2)
        l = round(min(c, o) - abs(np.sin(i * 2.2)) * 1100.0 - 300.0, 2)
        btc_chart.append(
            ChartDataPoint(
                date=d,
                price=c,
                ema=round(41000.0 + (t * 20200.0), 2),
                rsi=round(55.0 + 15.0 * np.sin(i / 4.5), 1),
                open=o,
                high=h,
                low=l,
                volume=round(24000000000 + 6000000000 * np.sin(i / 4.0), 0)
            )
        )

    charts = {
        "spy": spy_chart,
        "gold": gold_chart,
        "hyg": hyg_chart,
        "btc": btc_chart
    }
    return indicators, charts

def fetch_live_indicators() -> Tuple[TechnicalIndicators, Dict[str, List[ChartDataPoint]]]:
    """Fetch live data from yfinance and FRED."""
    try:
        spy_df = fetch_yfinance_weekly("SPY", period="3y")
        gld_df = fetch_yfinance_weekly("GLD", period="3y")
        hyg_df = fetch_yfinance_weekly("HYG", period="2y")
        tnx_df = fetch_yfinance_daily("^TNX", period="1y")

        # Fetch VIX, VIX3M and DXY
        vix_val = 14.5
        vix_term_ratio = 0.95
        vix_term_structure = "CONTANGO"
        dxy_val = 101.8

        try:
            vix_df = fetch_yahoo_direct_candles("^VIX", range_str="1mo", interval_str="1d")
            if not vix_df.empty:
                vix_val = float(vix_df["Close"].iloc[-1])
        except Exception:
            pass

        try:
            vix3m_df = fetch_yahoo_direct_candles("^VIX3M", range_str="1mo", interval_str="1d")
            if not vix3m_df.empty:
                vix3m_val = float(vix3m_df["Close"].iloc[-1])
                if vix3m_val > 0:
                    vix_term_ratio = round(vix_val / vix3m_val, 2)
                    vix_term_structure = "BACKWARDATION" if vix_term_ratio > 1.0 else "CONTANGO"
        except Exception:
            pass

        try:
            dxy_df = fetch_yahoo_direct_candles("DX-Y.NYB", range_str="1mo", interval_str="1d")
            if not dxy_df.empty:
                dxy_val = round(float(dxy_df["Close"].iloc[-1]), 2)
        except Exception:
            pass

        breadth_ratio = 0.38
        breadth_diff = 1.2
        breadth_ok = True
        try:
            iwm_df = fetch_yfinance_weekly("IWM", period="2y")
            if not iwm_df.empty and not spy_df.empty:
                common_idx = iwm_df.index.intersection(spy_df.index)
                ratio_series = iwm_df.loc[common_idx, "Close"] / spy_df.loc[common_idx, "Close"]
                ratio_ema = calculate_ema(ratio_series, 20)
                breadth_ratio = float(ratio_series.iloc[-1])
                ratio_ema_val = float(ratio_ema.iloc[-1])
                breadth_diff = round(((breadth_ratio - ratio_ema_val) / ratio_ema_val) * 100, 2)
                breadth_ok = (breadth_ratio >= ratio_ema_val)
        except Exception:
            pass

        spy_df["EMA50"] = calculate_ema(spy_df["Close"], 50)
        spy_df["RSI14"] = calculate_rsi(spy_df["Close"], 14)
        gld_df["EMA50"] = calculate_ema(gld_df["Close"], 50)
        gld_df["RSI14"] = calculate_rsi(gld_df["Close"], 14)
        hyg_df["EMA20"] = calculate_ema(hyg_df["Close"], 20)

        last_spy = spy_df.iloc[-1]
        last_gld = gld_df.iloc[-1]
        last_hyg = hyg_df.iloc[-1]
        last_10y = float(tnx_df["Close"].iloc[-1]) if not tnx_df.empty else 4.25

        spy_price = float(last_spy["Close"])
        spy_ema50 = float(last_spy["EMA50"])
        spy_diff = round(((spy_price - spy_ema50) / spy_ema50) * 100, 2)
        spy_rsi = float(last_spy["RSI14"])

        gold_price = float(last_gld["Close"])
        gold_ema50 = float(last_gld["EMA50"])
        gold_diff = round(((gold_price - gold_ema50) / gold_ema50) * 100, 2)
        gold_rsi = float(last_gld["RSI14"])

        hyg_price = float(last_hyg["Close"])
        hyg_ema20 = float(last_hyg["EMA20"])
        hyg_diff = round(((hyg_price - hyg_ema20) / hyg_ema20) * 100, 2)

        # Fetch Bitcoin (BTC-USD)
        btc_price = 67500.0
        btc_ema50 = 61200.0
        btc_diff = 10.29
        btc_rsi = 58.5
        btc_chart = []
        try:
            btc_df = fetch_yfinance_weekly("BTC-USD", period="3y")
            if not btc_df.empty and len(btc_df) >= 20:
                btc_df["EMA50"] = calculate_ema(btc_df["Close"], 50)
                btc_df["RSI14"] = calculate_rsi(btc_df["Close"], 14)
                last_btc = btc_df.iloc[-1]
                btc_price = float(last_btc["Close"])
                btc_ema50 = float(last_btc["EMA50"])
                btc_diff = round(((btc_price - btc_ema50) / btc_ema50) * 100, 2)
                btc_rsi = float(last_btc["RSI14"])

                btc_tail = btc_df.tail(52)
                btc_chart = [
                    ChartDataPoint(
                        date=idx.strftime("%Y-%m-%d"),
                        price=round(float(row["Close"]), 2),
                        ema=round(float(row["EMA50"]), 2),
                        rsi=round(float(row["RSI14"]), 1),
                        open=round(float(row["Open"]), 2) if "Open" in row and not pd.isna(row["Open"]) else None,
                        high=round(float(row["High"]), 2) if "High" in row and not pd.isna(row["High"]) else None,
                        low=round(float(row["Low"]), 2) if "Low" in row and not pd.isna(row["Low"]) else None,
                        volume=round(float(row["Volume"]), 0) if "Volume" in row and not pd.isna(row["Volume"]) else None
                    )
                    for idx, row in btc_tail.iterrows()
                ]
        except Exception as exc:
            logger.warning("Could not fetch BTC-USD: %s", exc)

        if not btc_chart:
            btc_chart = generate_fallback_chart_history("BTC-USD", "1y", "1wk")

        (
            fed_bal, fed_chg, oas_spread, gdp_growth, curve_10y2y,
            net_liq_t, net_liq_chg, tga_b, rrp_b
        ) = fetch_fred_indicators(settings.fred_api_key)
        is_opt_win, opt_days, opt_date = calculate_options_expiration_metrics()

        spy_net_liq_ratio = round(spy_price / net_liq_t, 2) if net_liq_t > 0 else 101.0
        spy_net_liq_diff = round(spy_diff - net_liq_chg, 2)
        spy_gld_ratio = round(spy_price / gold_price, 2) if gold_price > 0 else 2.32

        indicators = TechnicalIndicators(
            spy_price=round(spy_price, 2),
            spy_ema50=round(spy_ema50, 2),
            spy_diff_pct=spy_diff,
            spy_bullish=(spy_price > spy_ema50),
            spy_rsi14=round(spy_rsi, 1),
            spy_oversold=(spy_rsi <= 40.0),
            gold_price=round(gold_price, 2),
            gold_ema50=round(gold_ema50, 2),
            gold_diff_pct=gold_diff,
            gold_bullish=(gold_price > gold_ema50),
            gold_rsi14=round(gold_rsi, 1),
            gold_oversold=(gold_rsi <= 42.0),
            hyg_price=round(hyg_price, 2),
            hyg_ema20=round(hyg_ema20, 2),
            hyg_diff_pct=hyg_diff,
            hyg_bullish=(hyg_price > hyg_ema20),
            us10y_yield=round(last_10y, 2),
            nominal_gdp_ref=round(gdp_growth, 2),
            yield_spread_safe=(last_10y < gdp_growth),
            vix_value=round(vix_val, 1),
            vix_low=(vix_val < 16.0),
            breadth_ratio=round(breadth_ratio, 4),
            breadth_diff_pct=breadth_diff,
            breadth_healthy=breadth_ok,
            fed_balance_trillions=fed_bal,
            fed_balance_change_pct=fed_chg,
            fed_net_liquidity_trillions=net_liq_t,
            fed_net_liquidity_change_pct=net_liq_chg,
            tga_billions=tga_b,
            rrp_billions=rrp_b,
            hy_oas_spread=oas_spread,
            yield_curve_10y2y=curve_10y2y,
            vix_term_ratio=vix_term_ratio,
            vix_term_structure=vix_term_structure,
            dxy_value=dxy_val,
            is_options_window=is_opt_win,
            days_to_next_options=opt_days,
            next_options_date=opt_date,
            btc_price=round(btc_price, 2),
            btc_ema50=round(btc_ema50, 2),
            btc_diff_pct=btc_diff,
            btc_bullish=(btc_price > btc_ema50),
            btc_rsi14=round(btc_rsi, 1),
            btc_oversold=(btc_rsi <= 40.0),
            spy_net_liquidity_ratio=spy_net_liq_ratio,
            spy_net_liquidity_diff_pct=spy_net_liq_diff,
            spy_gold_ratio=spy_gld_ratio
        )

        # Build chart series (last 52 weeks)
        spy_tail = spy_df.tail(52)
        gld_tail = gld_df.tail(52)
        hyg_tail = hyg_df.tail(52)

        spy_chart = [
            ChartDataPoint(
                date=idx.strftime("%Y-%m-%d"),
                price=round(float(row["Close"]), 2),
                ema=round(float(row["EMA50"]), 2),
                open=round(float(row["Open"]), 2) if "Open" in row and not pd.isna(row["Open"]) else None,
                high=round(float(row["High"]), 2) if "High" in row and not pd.isna(row["High"]) else None,
                low=round(float(row["Low"]), 2) if "Low" in row and not pd.isna(row["Low"]) else None,
                volume=round(float(row["Volume"]), 0) if "Volume" in row and not pd.isna(row["Volume"]) else None
            )
            for idx, row in spy_tail.iterrows()
        ]
        gold_chart = [
            ChartDataPoint(
                date=idx.strftime("%Y-%m-%d"),
                price=round(float(row["Close"]), 2),
                ema=round(float(row["EMA50"]), 2),
                rsi=round(float(row["RSI14"]), 1),
                open=round(float(row["Open"]), 2) if "Open" in row and not pd.isna(row["Open"]) else None,
                high=round(float(row["High"]), 2) if "High" in row and not pd.isna(row["High"]) else None,
                low=round(float(row["Low"]), 2) if "Low" in row and not pd.isna(row["Low"]) else None,
                volume=round(float(row["Volume"]), 0) if "Volume" in row and not pd.isna(row["Volume"]) else None
            )
            for idx, row in gld_tail.iterrows()
        ]
        hyg_chart = [
            ChartDataPoint(
                date=idx.strftime("%Y-%m-%d"),
                price=round(float(row["Close"]), 2),
                ema=round(float(row["EMA20"]), 2),
                open=round(float(row["Open"]), 2) if "Open" in row and not pd.isna(row["Open"]) else None,
                high=round(float(row["High"]), 2) if "High" in row and not pd.isna(row["High"]) else None,
                low=round(float(row["Low"]), 2) if "Low" in row and not pd.isna(row["Low"]) else None,
                volume=round(float(row["Volume"]), 0) if "Volume" in row and not pd.isna(row["Volume"]) else None
            )
            for idx, row in hyg_tail.iterrows()
        ]

        charts = {
            "spy": spy_chart,
            "gold": gold_chart,
            "hyg": hyg_chart,
            "btc": btc_chart
        }
        return indicators, charts
    except Exception as exc:
        logger.error("Failed to fetch live market indicators: %s. Using fallback.", exc)
        return generate_mock_indicators()

def get_macro_data(force_refresh: bool = False) -> Tuple[TechnicalIndicators, Dict[str, List[ChartDataPoint]]]:
    """Retrieve macro data with caching to avoid rate limits."""
    now = datetime.now()
    last_ts = _DATA_CACHE.get("timestamp")

    if not force_refresh and last_ts is not None:
        elapsed = (now - last_ts).total_seconds()
        if elapsed < CACHE_TTL_SECONDS and _DATA_CACHE.get("indicators") is not None:
            return _DATA_CACHE["indicators"], _DATA_CACHE["charts"]

    indicators, charts = fetch_live_indicators()
    _DATA_CACHE["timestamp"] = now
    _DATA_CACHE["indicators"] = indicators
    _DATA_CACHE["charts"] = charts
    return indicators, charts

_CHART_HISTORY_CACHE: Dict[Tuple[str, str, str], Tuple[datetime, List[ChartDataPoint]]] = {}

def generate_fallback_chart_history(
    ticker: str,
    period: str,
    interval: str
) -> List[ChartDataPoint]:
    """Generate realistic synthetic historical candles with distinct asset profiles when offline."""
    base_prices = {"SPY": 586.0, "GLD": 252.0, "HYG": 79.0, "BTC": 67500.0, "BTC-USD": 67500.0}
    ticker_u = ticker.upper().strip()
    base = base_prices.get(ticker_u, 100.0)

    num_points = {
        ("6mo", "1d"): 126,
        ("6mo", "1wk"): 26,
        ("6mo", "1mo"): 6,
        ("1y", "1d"): 252,
        ("1y", "1wk"): 52,
        ("1y", "1mo"): 12,
        ("5y", "1d"): 1260,
        ("5y", "1wk"): 260,
        ("5y", "1mo"): 60,
    }.get((period, interval), 52)

    days_step = 1 if interval == "1d" else (7 if interval == "1wk" else 30)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=num_points * days_step)

    points: List[ChartDataPoint] = []
    current_price = base * 0.85
    ema_val = current_price * 0.96

    # Only downsample if dataset is extremely large (e.g. 5y daily > 600 points)
    step_skip = max(1, num_points // 400) if num_points > 600 else 1

    for i in range(num_points):
        t = i / max(1, num_points - 1)
        if ticker_u == "SPY":
            # S&P 500 profile: Equity bull trend with summer dip
            wave = 14.0 * np.sin(t * 7.5) - (12.0 if 0.35 <= t <= 0.55 else 0.0)
            current_price = (base * 0.82) + (t * (base * 0.18)) + wave + ((i % 3) - 1) * 1.5
            alpha = 2.0 / 51.0
            ema_val = (current_price * alpha) + (ema_val * (1.0 - alpha))
            rsi_val = 55.0 + np.sin(t * 9.0) * 15.0
        elif ticker_u == "GLD":
            # Gold profile: Parabolic rally in spring, flat summer base, explosive rally in autumn
            surge1 = 28.0 / (1.0 + np.exp(-(t - 0.25) * 20.0))
            surge2 = 25.0 / (1.0 + np.exp(-(t - 0.75) * 15.0))
            current_price = (base * 0.76) + surge1 + surge2 + np.cos(t * 12.0) * 3.5
            alpha = 2.0 / 51.0
            ema_val = (current_price * alpha) + (ema_val * (1.0 - alpha))
            rsi_val = 52.0 + np.sin(t * 8.0) * 18.0
        elif ticker_u in ("BTC", "BTC-USD"):
            # Bitcoin profile: Halving cycle upward trend and scarce digital asset volatility
            surge = 18000.0 / (1.0 + np.exp(-(t - 0.4) * 14.0))
            current_price = (base * 0.65) + (t * (base * 0.25)) + surge + np.sin(t * 14.0) * 2200.0
            alpha = 2.0 / 51.0
            ema_val = (current_price * alpha) + (ema_val * (1.0 - alpha))
            rsi_val = 58.0 + np.sin(t * 10.0) * 16.0
        else:
            # HYG profile: Tight credit spread channel
            current_price = (base * 0.97) + (base * 0.03 * np.sin(t * 6.0)) + ((i % 4) - 1.5) * 0.2
            alpha = 2.0 / 21.0
            ema_val = (current_price * alpha) + (ema_val * (1.0 - alpha))
            rsi_val = 50.0

        rsi_val = max(20.0, min(85.0, rsi_val))
        date_curr = start_date + timedelta(days=i * days_step)

        if i % step_skip == 0 or i == num_points - 1:
            price_val = round(float(current_price), 2)
            open_val = round(price_val - (0.6 * np.sin(i * 1.8)), 2)
            high_val = round(max(price_val, open_val) + abs(np.cos(i * 2.1)) * 1.4 + 0.3, 2)
            low_val = round(min(price_val, open_val) - abs(np.sin(i * 2.3)) * 1.3 - 0.2, 2)
            points.append(
                ChartDataPoint(
                    date=date_curr.strftime("%Y-%m-%d"),
                    price=price_val,
                    ema=round(float(ema_val), 2),
                    rsi=round(float(rsi_val), 1) if ticker_u in ("GLD", "SPY") else None,
                    open=open_val,
                    high=high_val,
                    low=low_val,
                    volume=round(40000000 + 10000000 * np.sin(i / 4.0), 0)
                )
            )

    return points

def fetch_chart_history(
    ticker: str = "SPY",
    period: str = "1y",
    interval: str = "1wk",
    force_refresh: bool = False
) -> List[ChartDataPoint]:
    """Fetch configurable historical candles with EMA and RSI with resilient fallback."""
    ticker_clean = ticker.upper().strip()
    valid_periods = {"6mo", "1y", "5y"}
    valid_intervals = {"1d", "1wk", "1mo"}

    period_clean = period if period in valid_periods else "1y"
    interval_clean = interval if interval in valid_intervals else "1wk"
    cache_key = (ticker_clean, period_clean, interval_clean)

    now = datetime.now()
    cached = _CHART_HISTORY_CACHE.get(cache_key)
    if not force_refresh and cached is not None:
        cached_ts, cached_points = cached
        if (now - cached_ts).total_seconds() < CACHE_TTL_SECONDS:
            return cached_points

    # Buffer lookback range so indicators like EMA50 have sufficient historical bars to converge
    if interval_clean == "1wk":
        fetch_range = "5y" if period_clean == "5y" else "3y"
    elif interval_clean == "1mo":
        fetch_range = "5y"
    elif interval_clean == "1d":
        fetch_range = "5y" if period_clean == "5y" else ("2y" if period_clean == "1y" else "1y")
    else:
        fetch_range = period_clean

    try:
        # 1. Try direct Yahoo Chart API first (reliable, bypasses yfinance crumb rate limits)
        df = None
        try:
            df = fetch_yahoo_direct_candles(ticker_clean, range_str=fetch_range, interval_str=interval_clean)
        except Exception as direct_err:
            logger.debug("Direct Yahoo chart error for %s: %s", ticker_clean, direct_err)

        # 2. Try yf.download as secondary fallback
        if df is None or df.empty:
            if yf is not None:
                sym = ticker_clean
                df = yf.download(sym, period=fetch_range, interval=interval_clean, progress=False)
                if isinstance(df.columns, pd.MultiIndex):
                    df = df.xs(sym, level="Ticker", axis=1) if "Ticker" in df.columns.names else df.droplevel(1, axis=1)
                df = df.dropna(subset=["Close"])

        if df is None or df.empty or len(df) < 5:
            raise ValueError(f"Insufficient historical data for {ticker_clean}")

        ema_span = 20 if ticker_clean == "HYG" or interval_clean == "1mo" else 50
        df["EMA"] = calculate_ema(df["Close"], span=ema_span)
        df["RSI14"] = calculate_rsi(df["Close"], period=14)

        # Slice back to the user's requested display timeframe after indicators have converged
        if period_clean in ("6mo", "1y"):
            days = 183 if period_clean == "6mo" else 366
            try:
                cutoff = now - timedelta(days=days)
                if df.index.tz is not None:
                    cutoff = cutoff.astimezone(df.index.tz)
                df_sliced = df[df.index >= cutoff]
                if not df_sliced.empty:
                    df = df_sliced
            except Exception as slice_err:
                logger.debug("Error slicing buffered chart history: %s", slice_err)

        # Keep 100% of consecutive trading days for 6mo & 1y; only downsample if > 600 candles
        if len(df) > 600:
            step = max(1, len(df) // 400)
            df = df.iloc[::step]

        points = [
            ChartDataPoint(
                date=idx.strftime("%Y-%m-%d"),
                price=round(float(row["Close"]), 2),
                ema=round(float(row["EMA"]), 2),
                rsi=round(float(row["RSI14"]), 1) if ticker_clean in ("GLD", "SPY") else None,
                open=round(float(row["Open"]), 2) if "Open" in row and not pd.isna(row["Open"]) else None,
                high=round(float(row["High"]), 2) if "High" in row and not pd.isna(row["High"]) else None,
                low=round(float(row["Low"]), 2) if "Low" in row and not pd.isna(row["Low"]) else None,
                volume=round(float(row["Volume"]), 0) if "Volume" in row and not pd.isna(row["Volume"]) else None
            )
            for idx, row in df.iterrows()
        ]
        _CHART_HISTORY_CACHE[cache_key] = (now, points)
        return points
    except Exception as exc:
        logger.warning("Could not fetch live chart history for %s (%s, %s): %s. Using synthetic fallback.", ticker_clean, period_clean, interval_clean, exc)
        fallback_points = generate_fallback_chart_history(ticker_clean, period_clean, interval_clean)
        _CHART_HISTORY_CACHE[cache_key] = (now, fallback_points)
        return fallback_points

