/**
 * api/notify-cancel.js
 * POST /api/notify-cancel — 預約取消「店家端」通知
 *
 * v2：與 notify-new 相同架構，主管道 Telegram，LINE 為選用備援。
 */
import { pushToOwners, buildCancelFlex } from "./_line-utils.js";
import { tgSend, buildCancelText, ALSO_LINE } from "./_telegram.js";

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://je-booking.vercel.app";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { booking } = req.body || {};
    if (!booking) return res.status(400).json({ error: "booking 欄位必填" });

    const results = [];

    try {
      results.push(await tgSend(buildCancelText(booking)));
    } catch (e) {
      results.push({ ok: false, channel: "telegram", error: e.message });
    }

    if (ALSO_LINE) {
      try {
        const lineResults = await pushToOwners(buildCancelFlex(booking));
        lineResults.forEach(r => results.push({ ...r, channel: "line" }));
      } catch (e) {
        results.push({ ok: false, channel: "line", error: e.message });
      }
    }

    const okCount = results.filter(r => r.ok).length;
    if (okCount === 0) {
      const msg = results.map(r => `[${r.channel}] ${r.error}`).join(" | ") || "無可用通知管道";
      return res.status(500).json({ error: msg });
    }

    res.status(200).json({
      ok: true,
      sent: okCount,
      channels: results.filter(r => r.ok).map(r => r.channel),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
