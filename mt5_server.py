# ================== IMPORTLAR ==================
import MetaTrader5 as mt5
import pandas as pd
import pandas_ta as ta
from flask import Flask, jsonify
import time

# ================== SOZLAMALAR ==================
SYMBOL = "XAUUSD"              # Brokerga qarab: XAUUSD, XAUUSDm, XAUUSD.pro
TIMEFRAME = mt5.TIMEFRAME_M5
BARS = 300
DEBUG = True                   # Debug loglarni yoqish / o‘chirish

# ================== FLASK APP ==================
app = Flask(__name__)

# ================== MT5 ULANISH ==================
def init_mt5():
    if not mt5.initialize():
        print("❌ MT5 ulanib bo‘lmadi")
        return False
    print("✅ MT5 ulandi")
    return True

if not init_mt5():
    quit()

# ================== ROOT ROUTE ==================
@app.route("/")
def home():
    return jsonify({
        "status": "running",
        "symbol": SYMBOL,
        "timeframe": "M5"
    })

# ================== SIGNAL API ==================
@app.route("/signal")
def signal():
    try:
        # --- MT5 dan data olish ---
        rates = mt5.copy_rates_from_pos(SYMBOL, TIMEFRAME, 0, BARS)
        if rates is None or len(rates) == 0:
            return jsonify({"error": "MT5 dan data kelmadi"})

        # --- DataFrame ---
        df = pd.DataFrame(rates)

        # --- Indikatorlar ---
        df["ema200"] = ta.ema(df["close"], length=200)
        df["rsi"] = ta.rsi(df["close"], length=14)

        macd = ta.macd(df["close"])
        df["macd"] = macd["MACD_12_26_9"]
        df["macd_signal"] = macd["MACDs_12_26_9"]

        # --- Oxirgi sham ---
        last = df.iloc[-1]

        # --- DEBUG ---
        if DEBUG:
            print("----- DEBUG -----")
            print("PRICE:", last.close)
            print("EMA200:", last.ema200)
            print("RSI:", last.rsi)
            print("MACD:", last.macd)
            print("MACD_SIGNAL:", last.macd_signal)
            print("-----------------")

        # --- Trend aniqlash ---
        trend = "BUY" if last.close > last.ema200 else "SELL"

        # --- Signal logikasi ---
        signal = "NO_TRADE"

        if trend == "BUY":
            if 35 < last.rsi < 50 and last.macd > last.macd_signal:
                signal = "BUY"

        if trend == "SELL":
            if 50 < last.rsi < 65 and last.macd < last.macd_signal:
                signal = "SELL"

        # --- Javob ---
        return jsonify({
            "symbol": SYMBOL,
            "timeframe": "M5",
            "trend": trend,
            "signal": signal,
            "timestamp": int(time.time())
        })

    except Exception as e:
        print("❌ ERROR:", e)
        return jsonify({"error": str(e)})

# ================== SERVER ==================
if __name__ == "__main__":
    try:
        app.run(host="127.0.0.1", port=5000)
    finally:
        mt5.shutdown()
