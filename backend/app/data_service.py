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

def is_options_expiration_window() -> bool:
    """Check if today is within major quarterly options expiration window (March/Sept)."""
    today = datetime.now()
    is_march = (today.month == 3 and today.day >= 15)
    is_sept = (today.month == 9 and today.day >= 15)
    return is_march or is_sept

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

def fetch_fred_indicators(api_key: str) -> Tuple[float, float, float]:
    """Fetch Fed balance (WALCL) in Trillions, High Yield Spread, and Nominal GDP YoY %."""
    default_balance_t = 7.15  # Default ~7.15 Trillion
    default_hy_spread = 3.20  # Default ~3.2%
    default_nominal_gdp = 6.50  # Default ~6.5%
    if not api_key or Fred is None:
        return default_balance_t, default_hy_spread, default_nominal_gdp

    balance_trillions = default_balance_t
    latest_spread = default_hy_spread
    nominal_gdp = default_nominal_gdp

    try:
        fred = Fred(api_key=api_key)
        # WALCL is reported weekly in Millions
        walcl_series = fred.get_series("WALCL")
        latest_walcl_m = float(walcl_series.dropna().iloc[-1])
        balance_trillions = round(latest_walcl_m / 1_000_000, 2)
    except Exception as exc:
        logger.warning("Could not fetch WALCL from FRED: %s", exc)

    try:
        fred = Fred(api_key=api_key)
        spread_series = fred.get_series("BAMLH0A0HYM2")
        latest_spread = float(spread_series.dropna().iloc[-1])
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

    return balance_trillions, latest_spread, nominal_gdp

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
        nominal_gdp_ref=6.5,
        yield_spread_safe=True,
        vix_value=14.2,
        vix_low=True,
        breadth_ratio=0.38,
        breadth_diff_pct=1.45,
        breadth_healthy=True,
        fed_balance_trillions=7.12,
        is_options_window=is_options_expiration_window()
    )

    dates = [(now - timedelta(weeks=i)).strftime("%Y-%m-%d") for i in range(52, -1, -1)]
    # SPY: Steady equity market climb with mid-cycle pullback and late surge
    spy_chart = [
        ChartDataPoint(
            date=d,
            price=round(470.0 + (i * 2.1) + 10.0 * np.sin(i / 5.0) + (i % 3), 2),
            ema=round(465.0 + (i * 1.4), 2)
        )
        for i, d in enumerate(dates)
    ]
    # Gold (GLD): Parabolic gold rally in Spring, consolidation in Summer, new highs in Autumn
    gold_chart = [
        ChartDataPoint(
            date=d,
            price=round(185.0 + (35.0 / (1.0 + np.exp(-(i - 16) / 3.0))) + (32.0 / (1.0 + np.exp(-(i - 38) / 3.5))) + 3.0 * np.cos(i / 4.0), 2),
            ema=round(184.0 + (i * 1.3), 2),
            rsi=round(50.0 + 18.0 * np.sin(i / 4.0), 1)
        )
        for i, d in enumerate(dates)
    ]
    # HYG: Credit bond ETF oscillating in tight band between 74 and 79
    hyg_chart = [
        ChartDataPoint(
            date=d,
            price=round(76.0 + 1.8 * np.sin(i / 6.0) + 0.3 * ((i % 4) - 1.5), 2),
            ema=round(76.2 + 0.03 * i, 2)
        )
        for i, d in enumerate(dates)
    ]

    charts = {
        "spy": spy_chart,
        "gold": gold_chart,
        "hyg": hyg_chart
    }
    return indicators, charts

def fetch_live_indicators() -> Tuple[TechnicalIndicators, Dict[str, List[ChartDataPoint]]]:
    """Fetch live data from yfinance and FRED."""
    try:
        spy_df = fetch_yfinance_weekly("SPY", period="3y")
        gld_df = fetch_yfinance_weekly("GLD", period="3y")
        hyg_df = fetch_yfinance_weekly("HYG", period="2y")
        tnx_df = fetch_yfinance_daily("^TNX", period="1y")

        # Fetch VIX and Russell 2000 (IWM) for breadth
        vix_val = 14.5
        try:
            vix_df = fetch_yfinance_daily("^VIX", period="1mo")
            if not vix_df.empty:
                vix_val = float(vix_df["Close"].iloc[-1])
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

        fed_bal, _, gdp_growth = fetch_fred_indicators(settings.fred_api_key)

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
            is_options_window=is_options_expiration_window()
        )

        # Build chart series (last 52 weeks)
        spy_tail = spy_df.tail(52)
        gld_tail = gld_df.tail(52)
        hyg_tail = hyg_df.tail(52)

        spy_chart = [
            ChartDataPoint(
                date=idx.strftime("%Y-%m-%d"),
                price=round(float(row["Close"]), 2),
                ema=round(float(row["EMA50"]), 2)
            )
            for idx, row in spy_tail.iterrows()
        ]
        gold_chart = [
            ChartDataPoint(
                date=idx.strftime("%Y-%m-%d"),
                price=round(float(row["Close"]), 2),
                ema=round(float(row["EMA50"]), 2),
                rsi=round(float(row["RSI14"]), 1)
            )
            for idx, row in gld_tail.iterrows()
        ]
        hyg_chart = [
            ChartDataPoint(
                date=idx.strftime("%Y-%m-%d"),
                price=round(float(row["Close"]), 2),
                ema=round(float(row["EMA20"]), 2)
            )
            for idx, row in hyg_tail.iterrows()
        ]

        charts = {
            "spy": spy_chart,
            "gold": gold_chart,
            "hyg": hyg_chart
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
    base_prices = {"SPY": 586.0, "GLD": 252.0, "HYG": 79.0}
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
        else:
            # HYG profile: Tight credit spread channel
            current_price = (base * 0.97) + (base * 0.03 * np.sin(t * 6.0)) + ((i % 4) - 1.5) * 0.2
            alpha = 2.0 / 21.0
            ema_val = (current_price * alpha) + (ema_val * (1.0 - alpha))
            rsi_val = 50.0

        rsi_val = max(20.0, min(85.0, rsi_val))
        date_curr = start_date + timedelta(days=i * days_step)

        if i % step_skip == 0 or i == num_points - 1:
            points.append(
                ChartDataPoint(
                    date=date_curr.strftime("%Y-%m-%d"),
                    price=round(float(current_price), 2),
                    ema=round(float(ema_val), 2),
                    rsi=round(float(rsi_val), 1) if ticker_u in ("GLD", "SPY") else None
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

    try:
        # 1. Try direct Yahoo Chart API first (reliable, bypasses yfinance crumb rate limits)
        df = None
        try:
            df = fetch_yahoo_direct_candles(ticker_clean, range_str=period_clean, interval_str=interval_clean)
        except Exception as direct_err:
            logger.debug("Direct Yahoo chart error for %s: %s", ticker_clean, direct_err)

        # 2. Try yf.download as secondary fallback
        if df is None or df.empty:
            if yf is not None:
                sym = ticker_clean
                df = yf.download(sym, period=period_clean, interval=interval_clean, progress=False)
                if isinstance(df.columns, pd.MultiIndex):
                    df = df.xs(sym, level="Ticker", axis=1) if "Ticker" in df.columns.names else df.droplevel(1, axis=1)
                df = df.dropna(subset=["Close"])

        if df is None or df.empty or len(df) < 5:
            raise ValueError(f"Insufficient historical data for {ticker_clean}")

        ema_span = 20 if ticker_clean == "HYG" or interval_clean == "1mo" else 50
        df["EMA"] = calculate_ema(df["Close"], span=ema_span)
        df["RSI14"] = calculate_rsi(df["Close"], period=14)

        # Keep 100% of consecutive trading days for 6mo & 1y; only downsample if > 600 candles
        if len(df) > 600:
            step = max(1, len(df) // 400)
            df = df.iloc[::step]

        points = [
            ChartDataPoint(
                date=idx.strftime("%Y-%m-%d"),
                price=round(float(row["Close"]), 2),
                ema=round(float(row["EMA"]), 2),
                rsi=round(float(row["RSI14"]), 1) if ticker_clean in ("GLD", "SPY") else None
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

