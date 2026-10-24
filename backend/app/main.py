"""FastAPI Main Application for Cava Macro Decision System.

Serves endpoints for web dashboard (PC and Mobile PWA) and automated alerts.
"""
from datetime import datetime
from typing import Any, Dict, List
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.data_service import get_macro_data, fetch_chart_history
from app.decision_engine import evaluate_combined_system, build_gauge_metrics
from app.models import MacroSystemResponse, ChartDataPoint
from app.telegram_service import format_telegram_alert, send_telegram_message

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Cuadro de Mando Táctico Macro y Motor de Decisión - Filosofía José Luis Cava"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def healthcheck() -> Dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "time": datetime.now().isoformat()}

@app.get("/api/status", response_model=MacroSystemResponse)
def get_system_status(force_refresh: bool = False) -> MacroSystemResponse:
    """Retrieve current macro regime, half-moon gauges, and indicators."""
    indicators, charts = get_macro_data(force_refresh=force_refresh)
    decision = evaluate_combined_system(indicators)
    gauges = build_gauge_metrics(
        indicators,
        score_conviction=decision.score_conviction,
        confluence_index=decision.confluence_index,
        index_explanation=decision.index_explanation,
        conviction_explanation=decision.conviction_explanation
    )

    return MacroSystemResponse(
        updated_at=datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        decision=decision,
        gauges=gauges,
        indicators=indicators,
        charts=charts
    )

@app.get("/api/chart-history", response_model=List[ChartDataPoint])
def get_chart_history(
    ticker: str = "SPY",
    period: str = "1y",
    interval: str = "1wk",
    force_refresh: bool = False
) -> List[ChartDataPoint]:
    """Retrieve historical candle chart series with configurable range and timeframe."""
    return fetch_chart_history(ticker=ticker, period=period, interval=interval, force_refresh=force_refresh)

@app.post("/api/refresh", response_model=MacroSystemResponse)
def refresh_system_status() -> MacroSystemResponse:
    """Force fresh download of market data and recompute matrix."""
    return get_system_status(force_refresh=True)

@app.post("/api/alert/telegram")
def trigger_telegram_alert(
    background_tasks: BackgroundTasks,
    dashboard_url: str = "https://cava-macro.vercel.app"
) -> Dict[str, Any]:
    """Manually or programmatically trigger a Telegram notification."""
    indicators, _ = get_macro_data(force_refresh=False)
    decision = evaluate_combined_system(indicators)
    message = format_telegram_alert(decision, indicators, dashboard_url=dashboard_url)
    
    # Send message
    result = send_telegram_message(message)
    return result
