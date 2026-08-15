/**
 * api/cron-remind.js
 * GET /api/cron-remind — 前一天提醒（由 Vercel Cron 每晚觸發）
 *
 * 兩條線：
 *   1) 店家版：明日預約清單 → Telegram（涵蓋全部，零 LINE 額度）
 *   2) 顧客版：個別提醒 → LINE push（僅限有填 U 開頭 userId 的預約，每筆 1 則）
 *
 * 環境變數：
 *   CRON_SECRET            必填，防止端點被外部亂打
 *   TELEGRAM_BOT_TOKEN     Telegram 通知
 *   TELEGRAM_CHAT_ID
 *   LINE_CHANNEL_ACCESS_TOKEN  顧客 LINE 提醒（沒設定就只跑店家版）
 *   FIREBASE_DB_URL        選填，預設為 je-booking 的 RTDB 位址
 *   REMIND_CUSTOMERS       選填，設為 "false" 可只跑店家版、完全不用 LINE 額度
 */
import { tgSend, esc } from "./_telegram.js";
import { linePost, TOKEN as LINE_TOKEN } from "./_line-utils.js";

const DB_URL = (process.env.FIREBASE_DB_URL ||
  "https://je-booking-default-rtdb.asia-southeast1.firebasedatabase.app").replace(/\/$/, "");

const REMIND_CUSTOMERS = String(process.env.REMIND_CUSTOMERS || "true").toLowerCase() !== "false";

const SALON_NAME = "JE染燙快剪屋";
const SALON_ADDR = "台中市西屯區太原路一段77號";

/* ── Firebase REST helpers ───────────────────────────── */
async function fbGet(path) {
  const r = await fetch(`${DB_URL}/${path}.json`);
  if (!r.ok) throw new Error(`Firebase GET ${path} → HTTP ${r.status}`);
  return r.json();
}
async function fbPatch(path, data) {
  const r = await fetch(`${DB_URL}/${path}.json`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`Firebase PATCH ${path} → HTTP ${r.status}`);
  return r.json();
}

/* ── 台北時區的「明天」日期字串 ───────────────────────── */
function tomorrowTaipei() {
  const now = new Date();
  // 轉成台北當地時間再 +1 天
  const tpe = new Date(now.getTime() + 8 * 3600 * 1000);
  tpe.setUTCDate(tpe.getUTCDate() + 1);
  const y = tpe.getUTCFullYear();
  const m = String(tpe.getUTCMonth() + 1).padStart(2, "0");
  const d = String(tpe.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"];
function weekdayOf(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** 合法的 LINE userId（U + 32 碼十六進位） */
function isLineUserId(v) {
  return typeof v === "string" && /^U[0-9a-f]{32}$/i.test(v.trim());
}

/* ── 顧客提醒的 LINE Flex ────────────────────────────── */
function buildReminderFlex(booking, svcName, stylistName) {
  const row = (label, value) => ({
    type: "box", layout: "horizontal",
    contents: [
      { type: "text", text: label, color: "#a0948d", size: "sm", flex: 2 },
      { type: "text", text: String(value || "—"), size: "sm", flex: 5, wrap: true },
    ],
  });
  const rows = [
    row("時間",   `明天 ${booking.time || ""}`),
    row("服務",   svcName),
    row("設計師", stylistName),
    row("地址",   SALON_ADDR),
  ];
  return {
    type: "flex",
    altText: `⏰ 提醒：明天 ${booking.time || ""} 於 ${SALON_NAME} 有預約`,
    contents: {
      type: "bubble",
      header: {
        type: "box", layout: "vertical", backgroundColor: "#c8a97e", paddingAll: "14px",
        contents: [{ type: "text", text: "⏰ 明日預約提醒", color: "#ffffff", weight: "bold", size: "md" }],
      },
      body: {
        type: "box", layout: "vertical", spacing: "sm", paddingAll: "14px",
        contents: [
          { type: "text", text: `${booking.customerName || ""} 您好`, size: "sm", color: "#6a5f58", wrap: true },
          { type: "separator", margin: "md" },
          { type: "box", layout: "vertical", spacing: "sm", margin: "md", contents: rows },
        ],
      },
      footer: {
        type: "box", layout: "vertical", paddingAll: "10px",
        contents: [{ type: "text", text: "如需改期或取消，請提前告知，感謝您 🙏",
          size: "xs", color: "#a0948d", wrap: true, align: "center" }],
      },
    },
  };
}

/* ── 主流程 ──────────────────────────────────────────── */
export default async function handler(req, res) {
  // 驗證來源：Vercel Cron 會帶 Authorization: Bearer <CRON_SECRET>
  const secret = process.env.CRON_SECRET || "";
  const auth   = req.headers.authorization || "";
  const key    = (req.query && req.query.key) || "";
  if (!secret || (auth !== `Bearer ${secret}` && key !== secret)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const date = (req.query && req.query.date) || tomorrowTaipei();
  const dryRun = String((req.query && req.query.dry) || "") === "1";

  try {
    const [bookingsRaw, servicesRaw, stylistsRaw] = await Promise.all([
      fbGet("je_bookings"),
      fbGet("je_services").catch(() => null),
      fbGet("je_stylists").catch(() => null),
    ]);

    const services = Array.isArray(servicesRaw) ? servicesRaw : Object.values(servicesRaw || {});
    const stylists = Array.isArray(stylistsRaw) ? stylistsRaw : Object.values(stylistsRaw || {});
    const svcName = (b) => (b.serviceIds || [b.serviceId])
      .map(id => services.find(s => s && s.id === id)?.zh || id)
      .filter(Boolean).join("・");
    const stylistName = (b) => stylists.find(s => s && s.id === b.stylistId)?.name || b.stylistId || "";

    const all = Object.entries(bookingsRaw || {}).map(([id, b]) => ({ ...b, id: b.id || id }));
    const list = all
      .filter(b => b.date === date && b.status !== "cancelled")
      .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));

    /* ── 1) 店家版清單 → Telegram ── */
    let tgResult = { ok: false, error: "未執行" };
    const header = `📋 <b>明日預約清單</b>　${esc(date)}（${weekdayOf(date)}）`;

    if (list.length === 0) {
      const emptyBody = `${header}\n\n明天沒有預約 ☕`;
      if (!dryRun) tgResult = await tgSend(emptyBody);
      else tgResult = { ok: true, preview: emptyBody };
    } else {
      const lines = list.map((b, i) => {
        const parts = [
          `<b>${esc(b.time || "??:??")}</b>`,
          esc(b.customerName || "（未填姓名）"),
          esc(stylistName(b)),
        ];
        let s = `${i + 1}. ${parts.join("　")}`;
        s += `\n　　${esc(svcName(b) || "—")}`;
        if (b.customerPhone) s += `　📞 ${esc(b.customerPhone)}`;
        if (b.notes)        s += `\n　　📝 ${esc(b.notes)}`;
        if (b.isGroup)      s += `\n　　👨‍👩‍👧 家庭預約（${b.groupSize || "?"}人）`;
        return s;
      });
      const body = [header, "", `共 <b>${list.length}</b> 筆`, "", ...lines].join("\n");
      if (!dryRun) tgResult = await tgSend(body);
      else tgResult = { ok: true, preview: body };
    }

    /* ── 2) 顧客版 LINE 提醒 ── */
    const customer = { sent: 0, skipped: 0, failed: [] };

    if (REMIND_CUSTOMERS && LINE_TOKEN) {
      for (const b of list) {
        if (!isLineUserId(b.lineId)) { customer.skipped++; continue; }
        if (b.remindedAt)            { customer.skipped++; continue; }
        if (b.isGroup && !b.isGroupPrimary) { customer.skipped++; continue; }
        if (dryRun)                  { customer.sent++;    continue; }

        try {
          const r = await linePost("/v2/bot/message/push", {
            to: b.lineId.trim(),
            messages: [buildReminderFlex(b, svcName(b), stylistName(b))],
          });
          if (r.status === 200) {
            customer.sent++;
            await fbPatch(`je_bookings/${b.id}`, { remindedAt: new Date().toISOString() });
          } else {
            let detail = r.body;
            try { detail = JSON.parse(r.body).message || r.body; } catch (_) {}
            customer.failed.push(`${b.id}: HTTP ${r.status} ${detail}`);
          }
        } catch (e) {
          customer.failed.push(`${b.id}: ${e.message}`);
        }
      }
    } else {
      customer.skipped = list.length;
    }

    res.status(200).json({
      ok: true,
      date,
      dryRun,
      total: list.length,
      telegram: tgResult,
      customerLine: customer,
    });
  } catch (e) {
    // 失敗時也丟一則到群組，才不會靜悄悄壞掉
    try { await tgSend(`❌ <b>明日提醒排程失敗</b>\n\n${esc(e.message)}`); } catch (_) {}
    res.status(500).json({ error: e.message });
  }
}
