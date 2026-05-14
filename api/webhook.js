/**
 * api/webhook.js
 * POST /api/webhook — LINE Messaging API Webhook
 *
 * 必須關閉 Vercel 預設的 body parser，才能取得 raw body 做簽章驗證
 */

const { verifySignature, replyToUser } = require("./_line-utils");

// ⚠️ 關鍵設定：關閉 Vercel 內建的 JSON body parser
export const config = {
  api: { bodyParser: false },
};

// 手動讀取 raw body
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data",  chunk => chunks.push(chunk));
    req.on("end",   ()    => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  // LINE webhook 只允許 POST
  if (req.method !== "POST") return res.status(405).end();

  // 先回 200，LINE 要求在 1 秒內回應
  res.status(200).end();

  try {
    const rawBody = await getRawBody(req);
    const sig     = req.headers["x-line-signature"];

    if (!verifySignature(rawBody, sig)) {
      console.warn("[webhook] 簽章驗證失敗");
      return;
    }

    const body   = JSON.parse(rawBody.toString());
    const events = body.events || [];

    for (const event of events) {
      if (event.type !== "message" || event.message?.type !== "text") continue;
      const text = (event.message.text || "").trim();

      if (text === "取消" || text === "取消預約") {
        await replyToUser(event.replyToken, {
          type: "text",
          text: "如需取消預約，請使用預約確認信中的取消連結，或致電 📞 0981-425-802",
        });
      } else if (text === "查詢" || text === "查詢預約" || text === "查詢我的預約") {
        await replyToUser(event.replyToken, {
          type: "text",
          text: "請至預約網站查詢：https://je-booking.vercel.app\n如需協助請致電 📞 0981-425-802",
        });
      } else {
        await replyToUser(event.replyToken, {
          type: "text",
          text: "您好！如需預約：https://je-booking.vercel.app\n如需取消請致電 📞 0981-425-802",
        });
      }
    }
  } catch (e) {
    console.error("[webhook]", e.message);
  }
};
