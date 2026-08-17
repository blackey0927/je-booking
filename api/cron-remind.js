/**
 * api/cron-remind.js
 * GET /api/cron-remind — 預約提醒（由 Vercel Cron 觸發）
 *
 * 兩條線，各自獨立排程（用 ?mode= 區分）：
 *   1) mode=admin    店家版：當日預約清單 → Telegram（零 LINE 額度）
 *                    台北 00:05 觸發。因系統禁止當日預約，跨過午夜後名單才定案，
 *                    不會漏掉前一天 20:00–24:00 之間進來的預約。
 *   2) mode=customer 顧客版：個別提醒 → LINE push（僅限有填 U 開頭 userId 的預約）
 *                    台北 20:00 觸發，提醒「明天」的預約，維持原行為。
 *
 * 未指定 mode 時預設兩條都跑（保留手動呼叫 / 舊排程的相容性）。
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

/* ── 台北時區日期字串（offsetDays=0 今天 / 1 明天）────── */
function taipeiDate(offsetDays = 0) {
  const now = new Date();
  // 先轉成台北當地時間，再位移天數
  const tpe = new Date(now.getTime() + 8 * 3600 * 1000);
  tpe.setUTCDate(tpe.getUTCDate() + offsetDays);
  const y = tpe.getUTCFullYear();
  const m = String(tpe.getUTCMonth() + 1).padStart(2, "0");
  const d = String(tpe.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
const todayTaipei    = () => taipeiDate(0);
const tomorrowTaipei = () => taipeiDate(1);

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

  // mode=admin（店家清單）/ customer（顧客提醒）/ both（預設，兩者都跑）
  const mode = String((req.query && req.query.mode) || "both").toLowerCase();
  if (!["admin", "customer", "both"].includes(mode)) {
    return res.status(400).json({ error: `Unknown mode: ${mode}` });
  }
  const runAdmin    = mode === "admin"    || mode === "both";
  const runCustomer = mode === "customer" || mode === "both";

  const dryRun = String((req.query && req.query.dry) || "") === "1";

  // 店家清單看「今天」（午夜後名單已定案）；顧客提醒看「明天」
  // ?date= 可手動指定，會同時套用到兩條線，方便補發與測試
  const forced       = (req.query && req.query.date) || "";
  const adminDate    = forced || todayTaipei();
  const customerDate = forced || tomorrowTaipei();
  const date         = runAdmin ? adminDate : customerDate;

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
    const pickFor = (d) => all
      .filter(b => b.date === d && b.status !== "cancelled")
      .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));

    const adminList    = runAdmin    ? pickFor(adminDate)    : [];
    const customerList = runCustomer ? pickFor(customerDate) : [];
    const list = adminList;

    /* ── 1) 店家版清單 → Telegram ── */
    let tgResult = { ok: false, error: "未執行" };
    const header = `📋 <b>今日預約清單</b>　${esc(adminDate)}（${weekdayOf(adminDate)}）`;

    if (!runAdmin) {
      tgResult = { ok: true, skipped: "mode 未包含 admin" };
    } else if (adminList.length === 0) {
      if (!dryRun) tgResult = await tgSend(`${header}\n\n今天沒有預約 ☕`);
      else tgResult = { ok: true, preview: `${header}\n\n今天沒有預約 ☕` };
    } else {
      const lines = adminList.map((b, i) => {
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
      const body = [header, "", `共 <b>${adminList.length}</b> 筆`, "", ...lines].join("\n");
      if (!dryRun) tgResult = await tgSend(body);
      else tgResult = { ok: true, preview: body };
    }

    /* ── 2) 顧客版 LINE 提醒 ── */
    const customer = { sent: 0, skipped: 0, failed: [] };

    if (runCustomer && REMIND_CUSTOMERS && LINE_TOKEN) {
      for (const b of customerList) {
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
      customer.skipped = customerList.length;
    }

    res.status(200).json({
      ok: true,
      mode,
      dryRun,
      admin:    { date: adminDate,    total: adminList.length,    ran: runAdmin },
      customer: { date: customerDate, total: customerList.length, ran: runCustomer },
      date,
      total: adminList.length,
      telegram: tgResult,
      customerLine: customer,
    });
  } catch (e) {
    // 失敗時也丟一則到群組，才不會靜悄悄壞掉
    try { await tgSend(`❌ <b>預約提醒排程失敗</b>（mode=${esc(mode)}）\n\n${esc(e.message)}`); } catch (_) {}
    res.status(500).json({ error: e.message });
  }
}
