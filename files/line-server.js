/**
 * line-server.js
 * JE染燙快剪屋 × LINE 通知中繼伺服器
 * 部署至 Railway (免費) → https://railway.app
 *
 * 環境變數（在 Railway Dashboard → Variables 設定）：
 *   LINE_CHANNEL_ACCESS_TOKEN  你的 LINE OA Channel Access Token
 *   LINE_NOTIFY_TOKEN          LINE Notify Token（店主即時通知用）
 *   ALLOWED_ORIGIN             你的前端網址，例如 https://xxx.github.io
 *   PORT                       Railway 自動注入，不需手動填
 */

const express = require("express");
const axios   = require("axios");
const cors    = require("cors");
const app     = express();

// ── CORS：只允許你的前端網址 ──────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "*",
  methods: ["POST", "GET", "OPTIONS"],
}));
app.use(express.json());

const LINE_API   = "https://api.line.me/v2/bot/message/push";
const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const NOTIFY_TOKEN = process.env.LINE_NOTIFY_TOKEN;

// ── 通知模板 ──────────────────────────────────────────────
function buildFlexMessage(type, booking, svcName, stylistName, svcDuration, svcPrice, salonName) {

  const STATUS_MAP = {
    confirm:  { label:"✅ 預約確認",     color:"#06C755", alt:"您的預約已確認" },
    reminder: { label:"⏰ 預約提醒",     color:"#c8a97e", alt:"明日預約提醒" },
    cancel:   { label:"❌ 預約取消通知", color:"#e05050", alt:"預約已取消" },
    test:     { label:"🔔 測試通知",     color:"#7a9aaa", alt:"這是測試訊息" },
  };
  const st = STATUS_MAP[type] || STATUS_MAP.confirm;

  const rows = [
    ["服務項目", `${svcName}（${svcDuration}分鐘）`],
    ["設計師",   stylistName],
    ["預約日期", booking.date],
    ["預約時間", booking.time],
    ["費用",     svcPrice],
    ...(booking.notes ? [["備注", booking.notes]] : []),
  ];

  return {
    type: "flex",
    altText: st.alt,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box", layout: "horizontal",
        backgroundColor: "#0d0b08",
        paddingAll: "14px",
        contents: [
          {
            type: "text", text: salonName,
            size: "xxs", color: "#7a6a5a", flex: 1,
          },
          {
            type: "text", text: st.label,
            size: "sm", color: st.color, align: "end",
            weight: "bold",
          },
        ],
      },
      body: {
        type: "box", layout: "vertical",
        backgroundColor: "#12100d",
        paddingAll: "14px", spacing: "xs",
        contents: [
          { type: "separator", color: "#2a2018", margin: "none" },
          ...rows.map(([k, v]) => ({
            type: "box", layout: "horizontal", margin: "sm",
            contents: [
              { type: "text", text: k, size: "xxs", color: "#5a4a3a", flex: 2 },
              { type: "text", text: v, size: "xs",  color: "#e8ddd0", flex: 3, wrap: true },
            ],
          })),
          { type: "separator", color: "#2a2018", margin: "sm" },
          {
            type: "text",
            text: type === "cancel"
              ? "如需重新預約，請點選下方按鈕"
              : type === "reminder"
              ? "明日請準時到店，期待您的到來 🙏"
              : "我們將盡快為您服務，有任何問題請聯繫我們",
            size: "xxs", color: "#5a4a3a", wrap: true, margin: "sm",
          },
        ],
      },
      footer: {
        type: "box", layout: "vertical",
        backgroundColor: "#0d0b08",
        paddingAll: "10px", spacing: "sm",
        contents: [
          {
            type: "button", style: "primary",
            color: type === "cancel" ? "#c8a97e" : "#06C755",
            height: "sm",
            action: {
              type: "uri",
              label: type === "cancel" ? "重新預約" : "查看我的預約",
              uri: `https://line.me/R/ti/p/${process.env.LINE_OA_ID || "@je_salon"}`,
            },
          },
        ],
      },
    },
  };
}

// ── LINE Notify to owner ──────────────────────────────────
async function notifyOwner(type, booking, svcName, stylistName) {
  if (!NOTIFY_TOKEN) return;
  const icon = { confirm:"📌", reminder:"⏰", cancel:"❌", test:"🔔" }[type] || "📌";
  const msg  = [
    `\n${icon} ${type === "test" ? "測試通知" : type === "confirm" ? "已發送預約確認" : type === "cancel" ? "已發送取消通知" : "已發送提醒"}`,
    `顧客：${booking.customerName}（${booking.customerPhone}）`,
    `服務：${svcName} ／ ${stylistName}`,
    `時間：${booking.date} ${booking.time}`,
    ...(booking.lineId ? [`LINE：${booking.lineId}`] : []),
  ].join("\n");

  await axios.post(
    "https://notify-api.line.me/api/notify",
    new URLSearchParams({ message: msg }),
    { headers: { Authorization: `Bearer ${NOTIFY_TOKEN}`, "Content-Type": "application/x-www-form-urlencoded" } }
  );
}

// ── POST /notify ──────────────────────────────────────────
app.post("/notify", async (req, res) => {
  const { type, booking, svcName, stylistName, svcDuration, svcPrice, salonName } = req.body;

  if (!booking) return res.status(400).json({ ok: false, msg: "缺少 booking 資料" });
  if (!LINE_TOKEN) return res.status(500).json({ ok: false, msg: "伺服器未設定 LINE_CHANNEL_ACCESS_TOKEN" });

  const errors = [];

  // ── Push Flex Message to customer ──
  if (booking.lineId) {
    // booking.lineId is LINE ID (@handle), we need userId
    // If you store userId separately, use that instead
    // For LINE ID lookup, use LINE Login or OA follower search
    // Here we attempt push if lineId looks like a userId (starts with U)
    const lineUserId = booking.lineId.startsWith("U") ? booking.lineId : null;

    if (lineUserId) {
      try {
        await axios.post(
          LINE_API,
          {
            to: lineUserId,
            messages: [buildFlexMessage(type, booking, svcName, stylistName, svcDuration, svcPrice, salonName)],
          },
          { headers: { Authorization: `Bearer ${LINE_TOKEN}`, "Content-Type": "application/json" } }
        );
      } catch (e) {
        errors.push(`Flex push: ${e.response?.data?.message || e.message}`);
      }
    } else {
      // lineId is @handle, not userId — can't push directly
      // Log for manual follow-up
      errors.push(`lineId ${booking.lineId} 為 @handle，無法直接 Push，請引導顧客加入 OA 後系統可自動取得 userId`);
    }
  }

  // ── Notify owner via LINE Notify ──
  try {
    await notifyOwner(type, booking, svcName, stylistName);
  } catch (e) {
    errors.push(`Notify: ${e.message}`);
  }

  if (errors.length > 0) {
    return res.json({ ok: false, msg: errors.join(" / ") });
  }
  res.json({ ok: true, msg: "通知已發送" });
});

// ── GET /health ──────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    hasLineToken:  !!LINE_TOKEN,
    hasNotifyToken: !!NOTIFY_TOKEN,
    time: new Date().toISOString(),
  });
});

// ── Webhook (接收顧客訊息，記錄 userId) ─────────────────
const line = require("@line/bot-sdk");
const lineMiddleware = line.middleware({
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
});

// userId cache（實際應寫入 DB）
const userIdCache = {};

app.post("/webhook", lineMiddleware, async (req, res) => {
  res.status(200).end();
  const events = req.body.events || [];
  for (const event of events) {
    const userId = event.source?.userId;
    if (!userId) continue;

    // 自動捕捉 userId + profile
    try {
      const client = new line.messagingApi.MessagingApiClient({
        channelAccessToken: LINE_TOKEN,
      });
      const profile = await client.getProfile(userId);
      userIdCache[userId] = { displayName: profile.displayName, pictureUrl: profile.pictureUrl };
      console.log(`[Webhook] captured userId=${userId} name=${profile.displayName}`);
    } catch (_) {}

    // 回應查詢指令
    if (event.type === "message" && event.message?.text === "查詢我的預約") {
      const client = new line.messagingApi.MessagingApiClient({ channelAccessToken: LINE_TOKEN });
      await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: "text", text: `您的 LINE userId：\n${userId}\n\n請將此 ID 提供給店家，即可接收預約通知。` }],
      });
    }
  }
});

// ── GET /userid-lookup ─────────────────────────────────
// 查詢已追蹤的 userId cache（簡易版）
app.get("/userid-lookup", (req, res) => {
  res.json({ count: Object.keys(userIdCache).length, users: userIdCache });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[line-server] running on port ${PORT}`));
