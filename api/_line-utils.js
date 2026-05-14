/**
 * api/_line-utils.js — 共用工具
 */
import https  from "https";
import crypto from "crypto";

export const TOKEN     = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
export const SECRET    = process.env.LINE_CHANNEL_SECRET       || "";
export const OWNER_IDS = (process.env.OWNER_USER_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean);

export function linePost(path, body) {
  return new Promise((resolve, reject) => {
    const buf = Buffer.from(JSON.stringify(body));
    const req = https.request({
      hostname: "api.line.me", path, method: "POST",
      headers: {
        "Content-Type":   "application/json",
        "Content-Length": buf.length,
        "Authorization":  `Bearer ${TOKEN}`,
      },
    }, res => {
      let d = "";
      res.on("data", c => (d += c));
      res.on("end",  () => resolve({ status: res.statusCode, body: d }));
    });
    req.on("error", reject);
    req.write(buf); req.end();
  });
}

export async function pushToOwners(messages) {
  if (!TOKEN)                throw new Error("LINE_CHANNEL_ACCESS_TOKEN 未設定");
  if (OWNER_IDS.length === 0) throw new Error("OWNER_USER_IDS 未設定或為空");
  const msgArr = Array.isArray(messages) ? messages : [messages];
  const results = [];
  for (const uid of OWNER_IDS) {
    try {
      const r = await linePost("/v2/bot/message/push", { to: uid, messages: msgArr });
      if (r.status === 200) {
        results.push({ uid, ok: true });
      } else {
        let detail = r.body;
        try { detail = JSON.parse(r.body).message || r.body; } catch (_) {}
        results.push({ uid, ok: false, error: `HTTP ${r.status}: ${detail}` });
      }
    } catch (e) {
      results.push({ uid, ok: false, error: e.message });
    }
  }
  return results;
}

export async function replyToUser(replyToken, messages) {
  if (!TOKEN) return;
  try {
    await linePost("/v2/bot/message/reply", {
      replyToken,
      messages: Array.isArray(messages) ? messages : [messages],
    });
  } catch (e) { console.error("[reply]", e.message); }
}

export function verifySignature(rawBody, signature) {
  if (!SECRET) return true;
  return crypto.createHmac("SHA256", SECRET).update(rawBody).digest("base64") === signature;
}

function row(label, value) {
  return {
    type: "box", layout: "horizontal",
    contents: [
      { type: "text", text: label, color: "#a0948d", size: "sm", flex: 2 },
      { type: "text", text: String(value || "—"), size: "sm", flex: 5, wrap: true },
    ],
  };
}

export function buildNewBookingFlex(booking, svcName, stylistName, cancelUrl) {
  const rows = [
    row("服務",   svcName),
    row("設計師", stylistName),
    row("日期",   `${booking.date || ""} ${booking.time || ""}`),
    row("顧客",   booking.customerName),
    row("電話",   booking.customerPhone),
  ];
  if (booking.notes)  rows.push(row("備注",    booking.notes));
  if (booking.lineId) rows.push(row("LINE ID", booking.lineId));
  return {
    type: "flex",
    altText: `✦ 新預約：${booking.customerName || ""} ${booking.date || ""} ${booking.time || ""}`,
    contents: {
      type: "bubble",
      header: {
        type: "box", layout: "vertical", backgroundColor: "#c4835a", paddingAll: "14px",
        contents: [{ type: "text", text: "✦ 新預約通知", color: "#ffffff", weight: "bold", size: "md" }],
      },
      body: { type: "box", layout: "vertical", spacing: "sm", paddingAll: "14px", contents: rows },
      ...(cancelUrl ? { footer: { type: "box", layout: "vertical", paddingAll: "10px",
        contents: [{ type: "button", style: "secondary", height: "sm",
          action: { type: "uri", label: "顧客取消預約連結", uri: cancelUrl } }] } } : {}),
    },
  };
}

export function buildCancelFlex(booking) {
  return {
    type: "flex",
    altText: `⚠️ 預約取消：${booking.customerName || ""} ${booking.date || ""} ${booking.time || ""}`,
    contents: {
      type: "bubble",
      header: {
        type: "box", layout: "vertical", backgroundColor: "#c44a3a", paddingAll: "14px",
        contents: [{ type: "text", text: "⚠️ 預約已取消", color: "#ffffff", weight: "bold", size: "md" }],
      },
      body: {
        type: "box", layout: "vertical", spacing: "sm", paddingAll: "14px",
        contents: [
          row("顧客", booking.customerName),
          row("電話", booking.customerPhone),
          row("日期", `${booking.date || ""} ${booking.time || ""}`),
        ],
      },
    },
  };
}
