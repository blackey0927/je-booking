/**
 * api/notify-new.js
 * POST /api/notify-new — 新預約 LINE 通知
 */

const { pushToOwners, buildNewBookingFlex } = require("./_line-utils");

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://je-booking.vercel.app";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")    return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { booking, svcName, stylistName, cancelUrl } = req.body || {};
    if (!booking) return res.status(400).json({ error: "booking 欄位必填" });

    console.log(`[notify-new] ${booking.customerName} ${booking.date} ${booking.time}`);
    const results = await pushToOwners(
      buildNewBookingFlex(booking, svcName, stylistName, cancelUrl)
    );
    const failed = results.filter(r => !r.ok);

    if (failed.length > 0) {
      const errMsg = failed.map(r => r.error).join(" | ");
      console.error("[notify-new] 失敗:", errMsg);
      return res.status(500).json({ error: errMsg });
    }
    console.log(`[notify-new] 成功 → ${results.length} 位店主`);
    res.status(200).json({ ok: true, sent: results.length });
  } catch (e) {
    console.error("[notify-new]", e.message);
    res.status(500).json({ error: e.message });
  }
};
