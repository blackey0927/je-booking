/**
 * api/health.js
 * GET /api/health
 */
import { TOKEN, OWNER_IDS } from "./_line-utils.js";

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://je-booking.vercel.app";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  res.status(200).json({
    ok:        true,
    ts:        new Date().toISOString(),
    token:     TOKEN ? `已設定 (${TOKEN.length}字)` : "❌ 未設定",
    ownerIds:  OWNER_IDS.length > 0 ? OWNER_IDS.map(id => "..."+id.slice(-8)) : "❌ 未設定",
  });
}
