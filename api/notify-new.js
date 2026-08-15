/**
 * api/notify-new.js
 * POST /api/notify-new — 新預約「店家端」通知
 *
 * v2：主要管道改為 Telegram（不消耗 LINE 官方帳號訊息額度）。
 *     若環境變數 NOTIFY_ADMIN_VIA_LINE=true，則「同時」也發 LINE 推播（過渡期備援）。
 *     前端呼叫方式與回傳格式不變，App.jsx 無需修改。
 */
import { pushToOwners, buildNewBookingFlex } from "./_line-utils.js";
import { tgSend, buildNewBookingText, ALSO_LINE } from "./_telegram.js";

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://je-booking.vercel.app";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { booking, svcName, stylistName, cancelUrl } = req.body || {};
    if (!booking) return res.status(400).json({ error: "booking 欄位必填" });

    const results = [];

    // ── 主管道：Telegram ──────────────────────────────
    try {
      results.push(
        await tgSend(
          buildNewBookingText(booking, svcName, stylistName),
          cancelUrl,
          "顧客取消預約連結"
        )
      );
    } catch (e) {
      results.push({ ok: false, channel: "telegram", error: e.message });
    }

    // ── 備援管道：LINE（預設關閉，會消耗訊息額度）────────
    if (ALSO_LINE) {
      try {
        const lineResults = await pushToOwners(
          buildNewBookingFlex(booking, svcName, stylistName, cancelUrl)
        );
        lineResults.forEach(r => results.push({ ...r, channel: "line" }));
      } catch (e) {
        results.push({ ok: false, channel: "line", error: e.message });
      }
    }

    const okCount = results.filter(r => r.ok).length;

    // 只要有任一管道送達就視為成功（避免 LINE 額度用盡時整筆判定失敗）
    if (okCount === 0) {
      const msg = results.map(r => `[${r.channel}] ${r.error}`).join(" | ") || "無可用通知管道";
      return res.status(500).json({ error: msg });
    }

    res.status(200).json({
      ok: true,
      sent: okCount,
      channels: results.filter(r => r.ok).map(r => r.channel),
      failed:   results.filter(r => !r.ok).map(r => `[${r.channel}] ${r.error}`),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
