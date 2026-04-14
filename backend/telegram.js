// backend/telegram.js
// Uses Node 18+ native fetch — no extra dependency needed

const BASE = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

/**
 * Send a text message to the configured Telegram chat.
 * No-ops silently if TELEGRAM_TOKEN or TELEGRAM_CHAT_ID are not set.
 */
export async function sendTelegram(text) {
  if (!process.env.TELEGRAM_TOKEN || !process.env.TELEGRAM_CHAT_ID) return;
  try {
    const res = await fetch(`${BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML'
      })
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[telegram] API error:', res.status, body);
    }
  } catch (e) {
    console.error('[telegram] send failed:', e.message);
  }
}
