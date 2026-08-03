import json
import os
from datetime import datetime, timedelta

LEARNING_STATE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'learning_state.json')


def load_state():
    """Load the learning_state JSON. If missing, create a default structure."""
    if not os.path.exists(LEARNING_STATE_PATH):
        default = {
            "total_tickets": 0,
            "wins": 0,
            "losses": 0,
            "sport_stats": {
                "Football": {"wins": 0, "losses": 0},
                "Tennis": {"wins": 0, "losses": 0},
                "Basketball": {"wins": 0, "losses": 0}
            },
            "history": []  # each entry: {"date": "YYYY-MM-DD", "win_rate": float}
        }
        save_state(default)
        return default
    try:
        with open(LEARNING_STATE_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        # Corrupt file – reset
        return {
            "total_tickets": 0,
            "wins": 0,
            "losses": 0,
            "sport_stats": {
                "Football": {"wins": 0, "losses": 0},
                "Tennis": {"wins": 0, "losses": 0},
                "Basketball": {"wins": 0, "losses": 0}
            },
            "history": []
        }


def save_state(state):
    """Persist the learning state to disk."""
    with open(LEARNING_STATE_PATH, 'w', encoding='utf-8') as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def record_day_results(date_str, win_count, loss_count, sport="Overall"):
    """Add a daily summary to the state.
    `sport` can be "Overall" or a specific sport name; for simplicity we update overall counters.
    """
    state = load_state()
    state["total_tickets"] += win_count + loss_count
    state["wins"] += win_count
    state["losses"] += loss_count
    # Update per‑sport stats if provided
    if sport != "Overall":
        sport_entry = state["sport_stats"].setdefault(sport, {"wins": 0, "losses": 0})
        sport_entry["wins"] += win_count
        sport_entry["losses"] += loss_count
    # Append to history with win_rate for the day
    total = win_count + loss_count
    win_rate = win_count / total if total else 0.0
    state["history"].append({"date": date_str, "win_rate": win_rate})
    # Keep only the last 30 days to avoid unbounded growth
    if len(state["history"]) > 30:
        state["history"] = state["history"][-30:]
    save_state(state)
    return state


def moving_average_win_rate(window=7):
    """Calculate the moving average of win_rate over the last `window` days.
    Returns 0.0 if no history is available.
    """
    state = load_state()
    hist = state.get("history", [])
    if not hist:
        return 0.0
    recent = hist[-window:]
    if not recent:
        return 0.0
    avg = sum(entry["win_rate"] for entry in recent) / len(recent)
    return avg


def adjust_thresholds(defaults):
    """Return adjusted threshold values based on the moving‑average win‑rate.
    `defaults` is a dict with keys: 'PROBABILITY_MIN', 'EV_THRESHOLD', 'SIMPLE_THRESHOLD'.
    """
    avg = moving_average_win_rate()
    adj = defaults.copy()
    if avg < 0.40:
        # under‑performing – become stricter
        adj["PROBABILITY_MIN"] = round(defaults["PROBABILITY_MIN"] + 0.02, 3)
        adj["EV_THRESHOLD"] = round(defaults["EV_THRESHOLD"] - 0.02, 3)
        adj["SIMPLE_THRESHOLD"] = round(defaults["SIMPLE_THRESHOLD"] + 0.05, 3)
    elif avg > 0.60:
        # performing well – relax a bit
        adj["PROBABILITY_MIN"] = round(max(0.0, defaults["PROBABILITY_MIN"] - 0.02), 3)
        adj["EV_THRESHOLD"] = round(defaults["EV_THRESHOLD"] + 0.02, 3)
        adj["SIMPLE_THRESHOLD"] = round(max(0.0, defaults["SIMPLE_THRESHOLD"] - 0.05), 3)
    # else keep defaults unchanged
    return adj
