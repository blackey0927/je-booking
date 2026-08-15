/**
 * api/_telegram.js — Telegram 店家通知工具
 *
 * 用途：取代 LINE push 發送「店家端」通知（新預約 / 取消），
 *       LINE 官方帳號的訊息額度因此完全不被消耗。
 *
 * 需要的環境變數：
 *   TELEGRAM_BOT_TOKEN   BotFather 給的 token
 *   TELEGRAM_CHAT_ID     群組 ID（負數，例如 -5556762069）
 *   NOTIFY_ADMIN_VIA_LINE  選填，設為 "true" 時「同時」也發 LINE（備援/過渡期用）
 */
import https from "https";

export const TG_TOKEN   = process.env.TELEGRAM_BOT_TOKEN || "";
export const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID   || "";

/** 是否同時保留 LINE 推播（過渡期備援開關） */
export const ALSO_LINE = String(process.env.NOTIFY_ADMIN_VIA_LINE || "").toLowerCase() === "true";

/** HTML 特殊字元跳脫（Telegram parse_mode=HTML 需要） */
export function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** 低階：呼叫 Telegram Bot API */
export function tgPost(method, body) {
  return new Promise((resolve, reject) => {
    if (!TG_TOKEN) return reject(new Error("TELEGRAM_BOT_TOKEN 未設定"));
    const buf = Buffer.from(JSON.stringify(body));
    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${TG_TOKEN}/${method}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": buf.length,
        },
        timeout: 10000,
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve({ status: res.statusCode, body: d }));
      }
    );
    req.on("timeout", () => { req.destroy(new Error("Telegram API 逾時")); });
    req.on("error", reject);
    req.write(buf);
    req.end();
  });
}

/**
 * 發送訊息到店家群組
 * @param {string} text          HTML 格式訊息內容
 * @param {string} [buttonUrl]   選填，附一顆連結按鈕
 * @param {string} [buttonLabel] 按鈕文字
 */
export async function tgSend(text, buttonUrl, buttonLabel) {
  if (!TG_TOKEN)   throw new Error("TELEGRAM_BOT_TOKEN 未設定");
  if (!TG_CHAT_ID) throw new Error("TELEGRAM_CHAT_ID 未設定");

  const payload = {
    chat_id: TG_CHAT_ID,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  // 只有 https 連結 Telegram 才接受做為 inline button
  if (buttonUrl && /^https:\/\//i.test(buttonUrl)) {
    payload.reply_markup = {
      inline_keyboard: [[{ text: buttonLabel || "開啟連結", url: buttonUrl }]],
    };
  }

  const r = await tgPost("sendMessage", payload);
  if (r.status === 200) return { ok: true, channel: "telegram" };

  let detail = r.body;
  try { detail = JSON.parse(r.body).description || r.body; } catch (_) {}
  return { ok: false, channel: "telegram", error: `Telegram HTTP ${r.status}: ${detail}` };
}

/* ────────────────── 訊息內容組裝 ────────────────── */

function line(label, value) {
  if (value == null || value === "") return null;
  return `${label}：${esc(value)}`;
}

/** 新預約通知文字 */
export function buildNewBookingText(booking = {}, svcName, stylistName) {
  const rows = [
    line("服務",    svcName),
    line("設計師",  stylistName),
    line("日期",    `${booking.date || ""} ${booking.time || ""}`.trim()),
    line("顧客",    booking.customerName),
    line("電話",    booking.customerPhone),
    line("備註",    booking.notes),
    line("LINE ID", booking.lineId),
  ].filter(Boolean);

  return [
    "🔔 <b>新預約通知</b>",
    "",
    ...rows,
  ].join("\n");
}

/** 取消通知文字 */
export function buildCancelText(booking = {}) {
  const rows = [
    line("顧客", booking.customerName),
    line("電話", booking.customerPhone),
    line("日期", `${booking.date || ""} ${booking.time || ""}`.trim()),
  ].filter(Boolean);

  return [
    "⚠️ <b>預約已取消</b>",
    "",
    ...rows,
  ].join("\n");
}
