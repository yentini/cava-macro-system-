"""CLI Script for Daily Market Check & Alert Dispatch.

Runs via GitHub Actions Cron from Monday to Friday after Wall Street closes.
"""
import sys
import logging
from app.data_service import get_macro_data
from app.decision_engine import evaluate_combined_system
from app.regime_state import check_and_update_regime
from app.telegram_service import (
    format_regime_change_alert,
    format_telegram_alert,
    send_telegram_message
)

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("DailyCheck")

def main():
    logger.info("Starting Cava Macro System Daily Check...")
    indicators, _ = get_macro_data(force_refresh=True)
    decision = evaluate_combined_system(indicators)

    logger.info("Evaluated Regime: %s (Conviction: %d%%)", decision.regime_title, decision.score_conviction)
    logger.info("S&P 500 Action: %s", decision.action_sp500)
    logger.info("Gold Action: %s", decision.action_gold)

    # Check for regime transition
    has_changed, prev_regime = check_and_update_regime(
        current_regime=decision.regime.value,
        metadata={"confluence_index": decision.confluence_index, "score_conviction": decision.score_conviction}
    )

    if has_changed and prev_regime:
        logger.warning("REGIME TRANSITION DETECTED: %s -> %s", prev_regime, decision.regime.value)
        message = format_regime_change_alert(prev_regime, decision, indicators)
    else:
        message = format_telegram_alert(decision, indicators)

    print("\n--- FORMATTED TELEGRAM ALERT ---\n")
    print(message)
    print("\n--------------------------------\n")

    result = send_telegram_message(message)
    if result.get("success"):
        logger.info("Telegram notification sent successfully.")
    else:
        logger.warning("Telegram notification skipped or failed: %s", result.get("error"))

if __name__ == "__main__":
    main()
