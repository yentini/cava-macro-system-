"""Telegram Alert Messaging Service.

Formats and dispatches Cava Macro System status updates to Telegram chats.
Uses standard HTTP POST to Telegram Bot API.
"""
import logging
from typing import Dict, Any, Optional
import requests
from app.config import settings
from app.models import DecisionResult, TechnicalIndicators

logger = logging.getLogger(__name__)

def format_telegram_alert(
    decision: DecisionResult,
    ind: TechnicalIndicators,
    dashboard_url: Optional[str] = None
) -> str:
    """Format rich Telegram message for Cava daily macro check."""
    status_emoji = {
        "green": "🟢",
        "yellow": "🟡",
        "red": "🔴",
        "blue": "🔵"
    }.get(decision.status_color, "⚪")

    spy_icon = "🟢" if ind.spy_bullish else "🔴"
    gold_icon = "🟢" if ind.gold_bullish else "🔴"
    hyg_icon = "🟢" if ind.hyg_bullish else "🔴"
    yield_icon = "🟢" if ind.yield_spread_safe else "🔴"
    trigger_icon = "🔥 ACTIVO" if (ind.gold_oversold or ind.is_options_window) else "Inactivo"

    url_footer = f"\n\n📱 [Abrir Cuadro de Mando]({dashboard_url})" if dashboard_url else ""

    message = (
        f"🛡️ *CAVA MACRO DASHBOARD — Cierre Diario*\n"
        f"━━━━━━━━━━━━━━━━━━━━━━\n"
        f"*Régimen:* {status_emoji} *{decision.regime_title}*\n"
        f"⚡ *Índice de Confluencia:* {decision.confluence_index}/100\n"
        f"🎯 *Convicción Calculada:* {decision.score_conviction}%\n\n"
        f"📋 *Diagnóstico Estratégico:*\n"
        f"_{decision.rationale}_\n\n"
        f"🎯 *Decisiones Operativas (Qué hacer):*\n"
        f"• *S&P 500:* {decision.action_sp500}\n"
        f"• *ORO:* {decision.action_gold}\n\n"
        f"📊 *Semáforos y Métricas Clave:*\n"
        f"{spy_icon} *S&P 500:* ${ind.spy_price:.2f} (EMA 50W: ${ind.spy_ema50:.2f} | {ind.spy_diff_pct:+.2f}%)\n"
        f"{gold_icon} *Oro (GLD):* ${ind.gold_price:.2f} (EMA 50W: ${ind.gold_ema50:.2f} | {ind.gold_diff_pct:+.2f}%)\n"
        f"📈 *RSI 1W S&P 500:* {ind.spy_rsi14:.1f} (Gatillo ≤40 | Euforia ≥70)\n"
        f"📈 *RSI 1W Oro:* {ind.gold_rsi14:.1f} (Gatillo ≤42)\n"
        f"{hyg_icon} *Bonos Basura (HYG):* ${ind.hyg_price:.2f} (Media 20W: ${ind.hyg_ema20:.2f})\n"
        f"{yield_icon} *Bono USA 10Y:* {ind.us10y_yield:.2f}% (Umbral PIB ~6.5%)\n"
        f"⚡ *Gatillo Opciones / Pánico:* {trigger_icon}\n"
        f"🏛️ *Balance Fed:* ~${ind.fed_balance_trillions:.2f}T"
        f"{url_footer}"
    )
    return message

def send_telegram_message(text: str) -> Dict[str, Any]:
    """Send message via Telegram Bot API."""
    token = settings.telegram_bot_token
    chat_id = settings.telegram_chat_id

    if not token or not chat_id:
        logger.warning("Telegram Bot Token or Chat ID not configured.")
        return {
            "success": False,
            "error": "Telegram credentials not configured in environment variables."
        }

    api_url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown",
        "disable_web_page_preview": False
    }

    try:
        response = requests.post(api_url, json=payload, timeout=10)
        data = response.json()
        if response.status_code == 200 and data.get("ok"):
            logger.info("Telegram notification sent successfully to chat %s", chat_id)
            return {"success": True, "message_id": data["result"]["message_id"]}
        else:
            logger.error("Telegram API error: %s", data)
            return {"success": False, "error": data.get("description", "Unknown error")}
    except Exception as exc:
        logger.error("Failed to connect to Telegram API: %s", exc)
        return {"success": False, "error": str(exc)}
