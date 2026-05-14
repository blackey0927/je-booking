/**
 * api/notify-cancel.js
 * POST /api/notify-cancel — 取消預約 LINE 通知
 */
import { pushToOwners, buildCancelFlex } from "./_line-utils.js";

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
    const results = await pushToOwners(buildCancelFlex(booking));
    const failed  = results.filter(r => !r.ok);
    if (failed.length > 0) return res.status(500).json({ error: failed.map(r => r.error).join(" | ") });
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
