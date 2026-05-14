/**
 * api/webhook.js
 * POST /api/webhook — LINE Messaging API Webhook
 */
import { verifySignature, replyToUser } from "./_line-utils.js";

export const config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data",  c => chunks.push(c));
    req.on("end",   () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  res.status(200).end();
  try {
    const rawBody = await getRawBody(req);
    const sig     = req.headers["x-line-signature"];
    if (!verifySignature(rawBody, sig)) { console.warn("[webhook] 簽章驗證失敗"); return; }
    const events = JSON.parse(rawBody.toString()).events || [];
    for (const event of events) {
      if (event.type !== "message" || event.message?.type !== "text") continue;
      const text = (event.message.text || "").trim();
      if (text === "取消" || text === "取消預約") {
        await replyToUser(event.replyToken, { type: "text", text: "如需取消預約，請使用預約確認信中的取消連結，或致電 📞 0981-425-802" });
      } else if (text === "查詢" || text === "查詢預約" || text === "查詢我的預約") {
        await replyToUser(event.replyToken, { type: "text", text: "請至預約網站查詢：https://je-booking.vercel.app\n如需協助請致電 📞 0981-425-802" });
      } else {
        await replyToUser(event.replyToken, { type: "text", text: "您好！如需預約：https://je-booking.vercel.app\n如需取消請致電 📞 0981-425-802" });
      }
    }
  } catch (e) { console.error("[webhook]", e.message); }
}
