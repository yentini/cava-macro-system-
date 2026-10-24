"""Regime State Persistence and Transition Tracker.

Monitors the market regime state between daily cron runs and identifies
transitions (e.g. from TRANSICION_NEUTRA to ALERTA_MAXIMA or EXPANSION_PLENA)
to trigger high-priority push notifications.
"""
from datetime import datetime
import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

# Cache directory inside backend
STATE_FILE = Path(__file__).resolve().parent.parent / "cache" / "regime_state.json"


def _ensure_dir_exists() -> None:
    """Ensure parent directory for state file exists."""
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)


def load_previous_regime() -> Tuple[Optional[str], Optional[datetime]]:
    """Load the last recorded regime from local storage."""
    try:
        if not STATE_FILE.exists():
            return None, None
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            regime = data.get("last_regime")
            updated_str = data.get("updated_at")
            updated_dt = datetime.fromisoformat(updated_str) if updated_str else None
            return regime, updated_dt
    except Exception as exc:
        logger.warning("Could not read previous regime state: %s", exc)
        return None, None


def save_current_regime(regime: str, metadata: Optional[Dict[str, Any]] = None) -> None:
    """Persist the current regime and timestamp."""
    try:
        _ensure_dir_exists()
        payload = {
            "last_regime": regime,
            "updated_at": datetime.now().isoformat(),
            "metadata": metadata or {}
        }
        with open(STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        logger.info("Persisted current regime '%s' to state file.", regime)
    except Exception as exc:
        logger.error("Could not save regime state: %s", exc)


def check_and_update_regime(
    current_regime: str,
    metadata: Optional[Dict[str, Any]] = None
) -> Tuple[bool, Optional[str]]:
    """Check if the market regime has changed compared to last known state.

    Returns:
        (has_changed, previous_regime)
    """
    prev_regime, _ = load_previous_regime()
    has_changed = (prev_regime is not None) and (prev_regime != current_regime)
    save_current_regime(current_regime, metadata)
    return has_changed, prev_regime
