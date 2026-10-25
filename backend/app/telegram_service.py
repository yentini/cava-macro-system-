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
        f"• *ORO:* {decision.action_gold}\n"
        f"• *BITCOIN:* {getattr(decision, 'action_btc', 'MANTENER')}\n\n"
        f"📊 *Semáforos y Métricas Clave:*\n"
        f"{spy_icon} *S&P 500:* ${ind.spy_price:.2f} (EMA 50W: ${ind.spy_ema50:.2f} | {ind.spy_diff_pct:+.2f}%)\n"
        f"{gold_icon} *Oro (GLD):* ${ind.gold_price:.2f} (EMA 50W: ${ind.gold_ema50:.2f} | {ind.gold_diff_pct:+.2f}%)\n"
        f"₿ *Bitcoin (BTC):* ${getattr(ind, 'btc_price', 67500):,.0f} (EMA 50W: ${getattr(ind, 'btc_ema50', 61200):,.0f} | {getattr(ind, 'btc_diff_pct', 10.29):+.1f}%)\n"
        f"🎭 *Ilusión Nominal (S&P / Liq):* {getattr(ind, 'spy_net_liquidity_diff_pct', 1.8):+.1f}% dif. (Ratio: {getattr(ind, 'spy_net_liquidity_ratio', 101.0):.1f}x)\n"
        f"📈 *RSI 1W S&P 500:* {ind.spy_rsi14:.1f} (Gatillo ≤40 | Euforia ≥70)\n"
        f"📈 *RSI 1W Oro:* {ind.gold_rsi14:.1f} (Gatillo ≤42)\n"
        f"{hyg_icon} *Bonos Basura (HYG):* ${ind.hyg_price:.2f} (Media 20W: ${ind.hyg_ema20:.2f})\n"
        f"{yield_icon} *Bono USA 10Y:* {ind.us10y_yield:.2f}% (PIB Nominal: {ind.nominal_gdp_ref:.2f}%)\n"
        f"💳 *Spread Crédito OAS:* {ind.hy_oas_spread:.2f}% | *Curva 10Y-2Y:* {ind.yield_curve_10y2y:+.2f}%\n"
        f"🌪️ *Volatilidad VIX:* {ind.vix_value:.1f} ({getattr(ind, 'vix_term_structure', 'CONTANGO')} | Ratio: {getattr(ind, 'vix_term_ratio', 0.95):.2f}) | *Dólar DXY:* {getattr(ind, 'dxy_value', 101.8):.1f}\n"
        f"⚡ *Gatillo Opciones / Pánico:* {trigger_icon} ({'Activo ahora' if ind.is_options_window else f'Próximo {ind.next_options_date} ({ind.days_to_next_options}d)'})\n"
        f"🏛️ *Liquidez Neta Fed:* ${getattr(ind, 'fed_net_liquidity_trillions', 5.80):.2f}T ({getattr(ind, 'fed_net_liquidity_change_pct', 0.54):+.2f}% 4W) | Balance: ${ind.fed_balance_trillions:.2f}T"
        f"{url_footer}"
    )
    return message

def format_regime_change_alert(
    previous_regime: str,
    decision: DecisionResult,
    ind: TechnicalIndicators,
    dashboard_url: Optional[str] = None
) -> str:
    """Format high-priority urgent Telegram alert when a regime transition is detected."""
    status_emoji = {
        "green": "🟢",
        "yellow": "🟡",
        "red": "🔴",
        "blue": "🔵"
    }.get(decision.status_color, "⚪")

    url_footer = f"\n\n📱 [Abrir Cuadro de Mando en Vivo]({dashboard_url})" if dashboard_url else ""

    message = (
        f"🚨 *¡ALERTA CRÍTICA: CAMBIO DE RÉGIMEN MACRO!* 🚨\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"🔄 *Transición:* `{previous_regime}` ➡️ {status_emoji} *{decision.regime_title}*\n"
        f"⚡ *Índice de Confluencia:* *{decision.confluence_index}/100*\n"
        f"🎯 *Convicción del Sistema:* *{decision.score_conviction}%*\n\n"
        f"📋 *Motivo / Detonante del Cambio:*\n"
        f"_{decision.rationale}_\n\n"
        f"⚠️ *ACCIÓN TÁCTICA INMEDIATA:*\n"
        f"• *S&P 500:* *{decision.action_sp500}*\n"
        f"• *ORO:* *{decision.action_gold}*\n"
        f"• *BITCOIN:* *{getattr(decision, 'action_btc', 'MANTENER')}*\n\n"
        f"🔍 *Métricas Clave de la Transición:*\n"
        f"• *S&P 500:* ${ind.spy_price:.2f} ({ind.spy_diff_pct:+.2f}% vs EMA 50W)\n"
        f"• *Crédito HYG:* ${ind.hyg_price:.2f} ({ind.hyg_diff_pct:+.2f}% vs Media 20W)\n"
        f"• *Bitcoin:* ${getattr(ind, 'btc_price', 67500):,.0f} ({getattr(ind, 'btc_diff_pct', 10.29):+.1f}% vs EMA 50W)\n"
        f"• *Liquidez Neta Fed:* ${getattr(ind, 'fed_net_liquidity_trillions', 5.80):.2f}T ({getattr(ind, 'fed_net_liquidity_change_pct', 0.54):+.2f}% 4W)\n"
        f"• *VIX & Curva:* {ind.vix_value:.1f} ({getattr(ind, 'vix_term_structure', 'CONTANGO')})\n"
        f"• *Bono 10Y:* {ind.us10y_yield:.2f}% (PIB Nominal: {ind.nominal_gdp_ref:.2f}%)"
        f"{url_footer}"
    )
    return message

def _get_telegram_credentials():
    """Retrieve Telegram credentials dynamically with fallback to .env file."""
    import os
    token = (settings.telegram_bot_token or os.environ.get("TELEGRAM_BOT_TOKEN") or "").strip()
    chat_id = (settings.telegram_chat_id or os.environ.get("TELEGRAM_CHAT_ID") or "").strip()

    if not token or not chat_id:
        from pathlib import Path
        env_file = Path(__file__).resolve().parent.parent / ".env"
        if env_file.exists():
            try:
                with open(env_file, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("TELEGRAM_BOT_TOKEN=") and not token:
                            token = line.split("=", 1)[1].strip().strip('"').strip("'")
                        elif line.startswith("TELEGRAM_CHAT_ID=") and not chat_id:
                            chat_id = line.split("=", 1)[1].strip().strip('"').strip("'")
            except Exception as e:
                logger.warning("Error reading .env directly: %s", e)

    return token, chat_id

def send_telegram_message(text: str) -> Dict[str, Any]:
    """Send message via Telegram Bot API (supports single or comma-separated chat IDs)."""
    token, raw_chat_ids = _get_telegram_credentials()

    if not token or not raw_chat_ids:
        logger.warning("Telegram Bot Token or Chat ID not configured.")
        return {
            "success": False,
            "error": "Telegram credentials not configured in environment variables."
        }

    # Support multiple recipients (e.g. "5746616987, 123456789")
    chat_ids = [cid.strip() for cid in raw_chat_ids.split(",") if cid.strip()]
    api_url = f"https://api.telegram.org/bot{token}/sendMessage"

    success_count = 0
    errors = []
    last_msg_id = None

    for target_chat in chat_ids:
        payload = {
            "chat_id": target_chat,
            "text": text,
            "parse_mode": "Markdown",
            "disable_web_page_preview": False
        }

        try:
            try:
                response = requests.post(api_url, json=payload, timeout=10)
            except requests.exceptions.SSLError:
                # Fallback for corporate environments / Windows self-signed cert chains
                import urllib3
                urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
                response = requests.post(api_url, json=payload, timeout=10, verify=False)

            data = response.json()
            if response.status_code == 200 and data.get("ok"):
                success_count += 1
                last_msg_id = data["result"]["message_id"]
                logger.info("Telegram notification sent successfully to chat %s", target_chat)
            else:
                err_desc = data.get("description", "Unknown error")
                logger.error("Telegram API error for chat %s: %s", target_chat, err_desc)
                errors.append(f"{target_chat}: {err_desc}")
        except Exception as exc:
            logger.error("Failed to connect to Telegram API for chat %s: %s", target_chat, exc)
            errors.append(f"{target_chat}: {str(exc)}")

    if success_count > 0:
        return {
            "success": True,
            "delivered_count": success_count,
            "message_id": last_msg_id,
            "errors": errors if errors else None
        }
    else:
        return {
            "success": False,
            "error": "; ".join(errors) if errors else "Failed to dispatch Telegram message."
        }
