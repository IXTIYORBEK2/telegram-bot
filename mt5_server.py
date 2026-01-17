import MetaTrader5 as mt5
import pandas as pd
import pandas_ta as ta
from flask import Flask, jsonify

# ================== SOZLAMALAR ==================
SYMBOL = "XAUUSD"
TIMEFRAME = mt5.TIMEFRAME_M5
BARS = 300

app = Flask(__name__)

# ================== MT5 ULANISH ==================
if not mt5.initialize():
    print("❌ MT5 ulanib bo‘lmadi")
    quit()

print("✅ MT5 ulandi")

# ================== SIGNAL API ==================
@app.route("/signal")
def signal():
    rates = mt5.copy_rates_from_pos(SYMBOL, TIMEFRAME, 0, BARS)
    if rates is None:
        return jsonify({"error": "Data yo‘q"})

    df = pd.DataFrame(rates)

    # ===== INDIKATORLAR =====
    df["ema200"] = ta.ema(df["close"], length=200)
    df["rsi"] = ta.rsi(df["close"], length=14)

    macd = ta.macd(df["close"])
    df["macd"] = macd["MACD_12_26_9"]
    df["macd_signal"] = macd["MACDs_12_26_9"]

    last = df.iloc[-1]

    # ===== TREND =====
    if last.close > last.ema200:
        trend = "BUY"
    else:
        trend = "SELL"

    # ===== SIGNAL LOGIKA =====
    if (
        trend == "BUY"
        and last.rsi > 35
        and last.rsi < 50
        and last.macd > last.macd_signal
    ):
        return jsonify({
            "symbol": SYMBOL,
            "timeframe": "M5",
            "trend": trend,
            "signal": "BUY"
        })

    if (
        trend == "SELL"
        and last.rsi < 65
        and last.rsi > 50
        and last.macd < last.macd_signal
    ):
        return jsonify({
            "symbol": SYMBOL,
            "timeframe": "M5",
            "trend": trend,
            "signal": "SELL"
        })

    return jsonify({
        "symbol": SYMBOL,
        "timeframe": "M5",
        "trend": trend,
        "signal": "NO_TRADE"
    })


# ================== SERVER ==================
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000)
