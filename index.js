require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const ADMIN_ID = Number(process.env.ADMIN_ID);

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
        ['boshqa loyihalar']
    ],
    resize_keyboard: true
  }
};

// ================= HELPERS =================
function isActive(userId) {
  return subscribers.has(userId) && subscribers.get(userId) > Date.now();
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
bot.onText(/📊 Signal/, (msg) => {
  const user = users.get(msg.chat.id);

  if (!user || !user.active) {
    return bot.sendMessage(msg.chat.id,
"⛔ Siz aktiv emassiz\nAdmin bilan bog‘laning");
  }

  // tahlil + signal
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

   if (text === '❓boshqa loyihalar') {
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

console.log('🤖 BOT ISHLAYAPTI');
