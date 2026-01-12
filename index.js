require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const express = require('express');
const app = express();
app.use(express.json());




const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const ADMIN_ID = Number(process.env.ADMIN_ID);










function isStrongXAUUSDSignal(d) {
  let score = 0;

  // TREND
  if (d.ema50 > d.ema200) {
    score += 40;
  } else {
    score += 40;
  }

  // RSI
  if (d.ema50 > d.ema200 && d.rsi < 35) score += 30;
  if (d.ema50 < d.ema200 && d.rsi > 65) score += 30;

  // PRICE ACTION (retest)
  if (d.retest === true) score += 30;

  return score >= 80; // faqat kuchli signal
}



app.post('/xauusd', (req, res) => {
  const d = req.body;

  if (!isStrongXAUUSDSignal(d)) {
    return res.send({ status: 'no_signal' });
  }

  const signalText = `
📊 *XAUUSD AUTO SIGNAL*

📌 Signal: *${d.ema50 > d.ema200 ? 'BUY 🟢' : 'SELL 🔴'}*
💰 Price: ${d.price}

📈 EMA50: ${d.ema50.toFixed(2)}
📉 EMA200: ${d.ema200.toFixed(2)}
📊 RSI: ${d.rsi.toFixed(1)}

🔥 Kuchli signal (80%+)
⚠️ Riskni boshqaring
`;

  users.forEach(id => {
    if (isActive(id)) {
      bot.sendMessage(id, signalText, { parse_mode: 'Markdown' });
    }
  });

  lastSignal = signalText;
  res.send({ status: 'signal_sent' });
});












// ================= DATA =================
const users = new Set();                 // barcha userlar
const subscribers = new Map();           // aktiv userlar
let lastSignal = 'Hozircha signal yo‘q ❌';
let broadcastMode = false;
let signalMode = false;

// ================= MENU =================
const mainMenu = {
  reply_markup: {
    keyboard: [
      ['📊 Signal'],
      ['💳 Obuna'],
      ['ℹ️ Ma’lumot'],
      ['♾️boshqa']
    ],
    resize_keyboard: true
  }
};

// ================= HELPERS =================
function isActive(userId) {
  return subscribers.has(userId) && subscribers.get(userId) > Date.now();
}
async function analyzeMarket(symbol = 'BTCUSDT', tf = '5m') {
  const url = 'https://api.binance.com/api/v3/klines';

  const res = await axios.get(url, {
    params: { symbol, interval: tf, limit: 250 }
  });

  const closes = res.data.map(c => Number(c[4]));

  const rsi = calculateRSI(closes);
  const ema50 = calculateEMA(closes.slice(-60), 50);
  const ema200 = calculateEMA(closes.slice(-220), 200);

  let direction = ema50 > ema200 ? 'BUY 🟢' : 'SELL 🔴';
  let score = 40; // trend borligi uchun

  if (direction.includes('BUY') && rsi < 35) score += 30;
  if (direction.includes('SELL') && rsi > 65) score += 30;

  if (
    (direction.includes('BUY') && rsi < 50) ||
    (direction.includes('SELL') && rsi > 50)
  ) score += 30;

  let risk = 'Yuqori';
  if (score >= 75) risk = 'Past';
  else if (score >= 55) risk = 'O‘rtacha';

  return `
📊 *LIVE ANALIZ*

Instrument: ${symbol}
Timeframe: ${tf}

📈 EMA 50 / 200: ${ema50 > ema200 ? 'UPTREND' : 'DOWNTREND'}
📉 RSI(14): ${rsi.toFixed(2)}

🎯 Signal: *${direction}*
📊 Kuch: *${score}%*
⚠️ Risk: *${risk}*
`;
}


// ================= START =================
bot.onText(/\/start/, msg => {
  users.add(msg.chat.id);

  bot.sendMessage(
    msg.chat.id,
`✨ *Xush kelibsiz!*

📊 Professional trading signallar
👇 Menyudan foydalaning

⛔ Hozircha *AKTIV EMASSIZ*
Admin aktiv qilgach signal olasiz`,
    { parse_mode: 'Markdown', ...mainMenu }
  );
});


bot.onText(/\/userid/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId,
`👋 Xush kelibsiz!
🆔 Sizning ID: ${chatId}

⚠️ Admin uchun saqlab qo‘ying`);
});

bot.onText(/\/myid/, (msg) => {
  bot.sendMessage(msg.chat.id,
`🆔 Sizning ID: ${msg.chat.id}`);
});



bot.onText(/\/activate (\d+)/, (msg, match) => {
  if (msg.chat.id !== ADMIN_ID) return;

  const userId = Number(match[1]);

  if (!users.has(userId)) {
    return bot.sendMessage(msg.chat.id, "❌ User topilmadi");
  }

  users.get(userId).active = true;

  bot.sendMessage(userId, "✅ Siz AKTIV bo‘ldingiz. Signal olasiz 🚀");
  bot.sendMessage(msg.chat.id, `✅ ${userId} aktiv qilindi`);
});

// ================= ADMIN AKTIV =================
// /aktiv chatId kun
bot.onText(/\/aktiv (\d+) (\d+)/, (msg, match) => {
  if (msg.chat.id !== ADMIN_ID) return;

  const userId = Number(match[1]);
  const days = Number(match[2]);

  const expire = Date.now() + days * 24 * 60 * 60 * 1000;
  subscribers.set(userId, expire);

  bot.sendMessage(userId, `✅ Obunangiz ${days} kunga AKTIV qilindi`);
  bot.sendMessage(msg.chat.id, '✅ User aktiv qilindi');
});
bot.onText(/📊 Signal/, async (msg) => {
  const chatId = msg.chat.id;

  if (!isActive(chatId)) {
    return bot.sendMessage(chatId,
      "⛔ Siz aktiv emassiz\nAdmin bilan bog‘laning");
  }

  try {
    const analysis = await analyzeMarket('BTCUSDT', '5m');
    bot.sendMessage(chatId, analysis, { parse_mode: 'Markdown' });
  } catch (e) {
    bot.sendMessage(chatId, '❌ Analizda xatolik');
  }
});





// ================= CALLBACK =================
bot.on('callback_query', query => {
  const chatId = query.message.chat.id;

  const actions = {
    last_signal: `📈 *Oxirgi signal*\n\n${lastSignal}`,
    signal_time: '🕒 Dushanba–Juma | 09:00–22:00',
    how_it_works: '📊 Signallar texnik va AI tahlil asosida',
    prices: '💵 1 oy — $30\n3 oy — $80',
   subscribe: 
`✅ *Obuna bo‘lish tartibi*

1️⃣ Tarifni tanlang:
• 1 oy — $30
• 3 oy — $80

2️⃣ To‘lov:
💳 Visa karta
4738 7200 5396 8685

3️⃣ To‘lovdan so‘ng:
📸 Chekni shu botga yuboring

4️⃣ Admin tekshiradi va obunani aktiv qiladi

📞 Admin: @Trederako`,

    check_sub: isActive(chatId)
      ? `✅ Aktiv\n⏳ Qolgan kunlar: ${Math.ceil((subscribers.get(chatId)-Date.now())/86400000)}`
      : '❌ Obuna aktiv emas',
    about_me: '👤 Professional trader',
    contact: '📞 @Trederako',
    rules: `📜shartnomaga asosan Risk foydalanuvchi zimmasida kapital yo'qotilishiga bot javobgar emas Risk menejmentga amal qiling!`,
    web_loyiha:'eng yangi loyiha',
    ai_rob:'aitreder loyihasi siz uchun',
    pul_das:'tradePluse hamda koplab robotlar'

  };

  if (actions[query.data]) {
    bot.sendMessage(chatId, actions[query.data], { parse_mode: 'Markdown' });
  }

  bot.answerCallbackQuery(query.id);
});

// ================= MESSAGE HANDLER =================
bot.on('message', msg => {
  const chatId = msg.chat.id;
  const text = msg.text;

  users.add(chatId);
  const isAdmin = chatId === ADMIN_ID;

  // ===== ADMIN MODE =====
  if (isAdmin && broadcastMode) {
    users.forEach(id => bot.sendMessage(id, text).catch(() => {}));
    broadcastMode = false;
    return bot.sendMessage(chatId, '✅ Broadcast yuborildi');
  }

  if (isAdmin && signalMode) {
    lastSignal = text;
    users.forEach(id => {
      if (isActive(id)) {
        bot.sendMessage(id, `📊 *YANGI SIGNAL*\n\n${text}`, { parse_mode: 'Markdown' });
      }
    });
    signalMode = false;
    return bot.sendMessage(chatId, '✅ Signal aktiv userlarga yuborildi');
  }

  // ===== USER MENU =====
  if (text === '📊 Signal') {
    return bot.sendMessage(chatId, '📊 Signal bo‘limi', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📈 Oxirgi signal', callback_data: 'last_signal' }],
          [{ text: '🕒 Signal vaqtlari', callback_data: 'signal_time' }],
          [{ text: '❓ Qanday ishlaydi', callback_data: 'how_it_works' }]
        ]
      }
    });
  }

   if (text === '♾️boshqa') {
    return bot.sendMessage(chatId, '📊 loyihalar bolimi', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🌐web ilovalar', callback_data: 'web_loyiha' }],
          [{ text: '🤖ai robotlar', callback_data: 'ai_rob' }],
          [{ text: '❓pullik dasturlar', callback_data: 'pul_das' }]
        ]
      }
    });
  }

  if (text === '💳 Obuna') {
    return bot.sendMessage(chatId, '💳 Obuna', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '💵 Tariflar', callback_data: 'prices' }],
          [{ text: '✅ Obuna bo‘lish', callback_data: 'subscribe' }],
          [{ text: '🔐 Obuna holati', callback_data: 'check_sub' }]
        ]
      }
    });
  }

  if (text === 'ℹ️ Ma’lumot') {
    return bot.sendMessage(chatId, 'ℹ️ Ma’lumot', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '👤 Muallif', callback_data: 'about_me' }],
          [{ text: '📞 Aloqa', callback_data: 'contact' }],
          [{ text: '📜 Qoidalar', callback_data: 'rules' }]
        ]
      }
    });
  }

  // ===== ADMIN PANEL =====
  if (!isAdmin) return;

  if (text === '/admin') {
    return bot.sendMessage(chatId, '👑 Admin Panel', {
      reply_markup: {
        keyboard: [
          ['📢 Signal yuborish'],
          ['📣 Broadcast'],
          ['👥 Userlar soni'],
          ['❌ Chiqish']
        ],
        resize_keyboard: true
      }
    });

    
  }

  if (text === '👥 Userlar soni') {
    return bot.sendMessage(chatId, `👥 Userlar: ${users.size}`);
  }

  if (text === '📣 Broadcast') {
    broadcastMode = true;
    return bot.sendMessage(chatId, '📢 Xabar yozing:');
  }

  if (text === '📢 Signal yuborish') {
    signalMode = true;
    return bot.sendMessage(chatId, '📊 Signal yozing:');
  }

  if (text === '❌ Chiqish') {
    return bot.sendMessage(chatId, 'Panel yopildi', mainMenu);
  }
});

// ================= AUTO EXPIRE =================
setInterval(() => {
  subscribers.forEach((expire, userId) => {
    if (expire < Date.now()) {
      subscribers.delete(userId);
      bot.sendMessage(userId, '⛔ Obunangiz tugadi');
    }
  });
}, 60 * 60 * 1000);




// ===== RSI =====
function calculateRSI(closes, period = 14) {
  let gains = 0, losses = 0;

  for (let i = closes.length - period - 1; i < closes.length - 1; i++) {
    const diff = closes[i + 1] - closes[i];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  const rs = gains / (losses || 1);
  return 100 - (100 / (1 + rs));
}

// ===== EMA =====
function calculateEMA(data, period) {
  const k = 2 / (period + 1);
  let ema = data[0];

  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return ema;
}





console.log('🤖 BOT ISHLAYAPTI');
