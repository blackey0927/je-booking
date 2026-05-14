/**
 * api/health.js
 * GET /api/health — 健康狀態檢查
 */

const { TOKEN, OWNER_IDS } = require("./_line-utils");

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://je-booking.vercel.app";

module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  res.status(200).json({
    ok:            true,
    ts:            new Date().toISOString(),
    token:         TOKEN ? `已設定 (${TOKEN.length}字)` : "❌ 未設定",
    ownerIds:      OWNER_IDS.length > 0
                     ? OWNER_IDS.map(id => "..." + id.slice(-8))
                     : "❌ 未設定",
    allowedOrigin: ALLOWED_ORIGIN,
  });
};
