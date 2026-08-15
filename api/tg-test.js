/**
 * api/tg-test.js
 * GET /api/tg-test — 測試 Telegram 設定是否正確
 *
 * 部署後用瀏覽器直接開 https://je-booking.vercel.app/api/tg-test
 * 群組收到測試訊息即代表設定完成。驗證通過後可刪除此檔。
 */
import { tgSend, TG_TOKEN, TG_CHAT_ID, ALSO_LINE } from "./_telegram.js";

export default async function handler(req, res) {
  const config = {
    TELEGRAM_BOT_TOKEN: TG_TOKEN ? `已設定（${TG_TOKEN.slice(0, 6)}…）` : "❌ 未設定",
    TELEGRAM_CHAT_ID:   TG_CHAT_ID || "❌ 未設定",
    NOTIFY_ADMIN_VIA_LINE: ALSO_LINE ? "true（LINE 備援開啟，會消耗額度）" : "false（僅 Telegram）",
  };

  if (!TG_TOKEN || !TG_CHAT_ID) {
    return res.status(500).json({ ok: false, config, hint: "請到 Vercel → Settings → Environment Variables 補齊後重新部署" });
  }

  try {
    const r = await tgSend(
      [
        "✅ <b>JE 預約系統．連線測試</b>",
        "",
        `時間：${new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}`,
        "看到這則訊息代表店家通知已成功切換到 Telegram。",
      ].join("\n")
    );
    res.status(r.ok ? 200 : 500).json({ ...r, config });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message, config });
  }
}
