// backend/telegram.js
// Uses Node 18+ native fetch — no extra dependency needed

/**
 * Send a text message to the configured Telegram chat.
 * Supports HTML formatting (use <b>, <code>, etc.).
 * No-ops silently if TELEGRAM_TOKEN or TELEGRAM_CHAT_ID are not set.
 * @param {string} text
 */
export async function sendTelegram(text) {
  const token = process.env.TELEGRAM_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  if (!text) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
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
