import React, { useState, useEffect, useMemo, useCallback } from "react";

/* ── Error Boundary ─────────────────────────────────────── */
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error:null }; }
  static getDerivedStateFromError(e) { return { error:e }; }
  componentDidCatch(e) { console.error("APP CRASH:", e.message, e.stack); }
  render() {
    if (this.state.error) return (
      <div style={{ padding:"1.5rem", margin:"1rem", background:"#fff0f0", border:"1px solid #f0b0b0", borderRadius:8, fontFamily:"monospace", fontSize:13 }}>
        <b>❌ 發生錯誤，請截圖回報：</b><br/>
        <span style={{ color:"#c00" }}>{this.state.error.message}</span>
      </div>
    );
    return this.props.children;
  }
}


/* ═══════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════ */
const SALON = {
  name: "JE染燙快剪屋",
  address: "台中市西屯區太原路一段53號",
  phone: "0981425802",
  mapQuery: "台中市西屯區太原路一段53號",
  lineOaId: "@658qpvwi",
  // 每日營業時間（分鐘制）: 0=日 1=一 2=二 3=三 4=四 5=五 6=六
  dayHours: {
    0: { open:600, close:1200 },   // 日 10:00-20:00
    1: { open:600, close:1170 },   // 一 10:00-19:30
    2: { open:600, close:1170 },   // 二 10:00-19:30
    3: { open:600, close:1170 },   // 三 10:00-19:30
    4: { open:600, close:1260 },   // 四 10:00-21:00
    5: { open:600, close:1260 },   // 五 10:00-21:00
    6: { open:600, close:1260 },   // 六 10:00-21:00
  },
  hours: { open: 10, close: 21 }, // ALL_SLOTS 最大範圍用
  slotMinutes: 15,
};

const DEFAULT_SERVICES = [
  { id:"shampoo",   zh:"洗髮",    en:"Shampoo",      icon:"🚿", duration:15,  price:"$100",    priceNote:"",     category:"基本",  color:"#7a9aaa", desc:"深層清潔頭皮，舒壓按摩洗髮" },
  { id:"cut",       zh:"剪髮",    en:"Haircut",       icon:"✂️", duration:15,  price:"$180",    priceNote:"",     category:"基本",  color:"#a0c4b8", desc:"量身剪裁，依臉形與需求設計造型" },
  { id:"spa",       zh:"SPA洗",   en:"SPA Wash",      icon:"🐱", duration:30,  price:"$300",    priceNote:"",     category:"技術",  color:"#c4bc9a", desc:"精油頭皮按摩洗髮" },
  { id:"perm",      zh:"燙髮",    en:"Perm",          icon:"〰",  duration:480, price:"$600",    priceNote:"起",   category:"技術",  color:"#c8a97e", desc:"熱塑燙、冷燙、巴西燙等多種選擇" },
  { id:"color",     zh:"染髮",    en:"Hair Color",    icon:"🎨", duration:150, price:"$500",    priceNote:"起",   category:"技術",  color:"#b8a0c4", desc:"全染、挑染、補染髮根" },
  { id:"treatment", zh:"護髮",    en:"Treatment",     icon:"✨", duration:30,  price:"$500",    priceNote:"起",   category:"養護",  color:"#c4a0a0", desc:"深層修護、蛋白質補充、光澤修復" },
];
let SERVICES = DEFAULT_SERVICES; // overridden dynamically

const DEFAULT_STYLISTS = [
  {
    id:"ken",    name:"獻爸",  title:"院長・技術總監", photo:null,
    icon:"👨‍🦱", exp:"10年",   specialty:["剪髮","燙髮","染髮","SPA洗","護髮","洗髮"],
    color:"#c4835a", bio:"20年精湛技藝，擅長男士精緻剪裁與女士創意造型，每位客人都是藝術作品。",
    workDays:[1,2,3,4,5,6], // Mon-Sat (0=Sun)
  },
  {
    id:"mei",    name:"闆娘",  title:"染髮專師", photo:null,
    icon:"👩‍🦰", exp:"20年",    specialty:["染髮","護髮","洗髮","剪髮"],
    color:"#b8a0c4", bio:"色彩魔法師，精通日系霧感色、歐美挑染與各式漸層染色技術。",
    workDays:[2,3,4,5,6,0],
  },
  {
    id:"kai",    name:"Nancy",  title:"剪髮設計師", photo:null,
    icon:"👨‍🎨", exp:"6年",    specialty:["剪髮","SPA洗","洗髮"],
    color:"#a0c4b8", bio:"刀工精準俐落，男士 Fade 刀法專家，也擅長女士俐落短髮造型。",
    workDays:[1,3,4,5,6,0],
  },
  {
    id:"yu",     name:"Blackey",  title:"燙髮・護髮師", photo:null,
    icon:"👩‍🦱", exp:"5年",    specialty:["燙髮","護髮","染髮","SPA洗","洗髮"],
    color:"#c4a0a0", bio:"燙髮技術扎實，護髮療程細心，讓每位客人的頭髮健康又有光澤。",
    workDays:[1,2,4,5,6,0],
  },
];

let STYLISTS = DEFAULT_STYLISTS; // overridden in SalonApp scope

const WEEK_DAYS = ["日","一","二","三","四","五","六"];
const STATUS_COLOR = { confirmed:"#a0c4b8", pending:"#c4bc9a", cancelled:"#c4a0a0" };
const STATUS_LABEL = { confirmed:"已確認", pending:"待確認", cancelled:"已取消" };

/* ═══════════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════════ */
function generateSlots(open, close, slotMin) {
  const slots = [];
  for (let h = open; h < close; h++) {
    for (let m = 0; m < 60; m += slotMin) {
      slots.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
    }
  }
  return slots;
}

function slotToMinutes(t) {
  const [h,m] = t.split(":").map(Number);
  return h * 60 + m;
}

function isSlotAvailable(slot, stylistId, date, bookings, serviceDuration) {
  const slotMins  = slotToMinutes(slot);
  const slotEnd   = slotMins + serviceDuration;
  const dateStr   = formatDate(date);
  return !bookings.some(b => {
    if (b.stylistId !== stylistId || b.date !== dateStr || b.status === "cancelled") return false;
    const bStart = slotToMinutes(b.time);
    const svc    = SERVICES.find(s => s.id === b.serviceId);
    const bEnd   = bStart + (svc?.duration || 60);
    return slotMins < bEnd && slotEnd > bStart;
  });
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function parseDate(str) {
  const [y,m,d] = str.split("-").map(Number);
  return new Date(y, m-1, d);
}

function displayDate(d) {
  if (!d) return "";
  const date = typeof d === "string" ? parseDate(d) : d;
  return `${date.getFullYear()}/${String(date.getMonth()+1).padStart(2,"0")}/${String(date.getDate()).padStart(2,"0")} (${WEEK_DAYS[date.getDay()]})`;
}

function getDayHours(date) {
  const d = typeof date === "string" ? parseDate(date) : date;
  return (SALON.dayHours && SALON.dayHours[d.getDay()]) || { open:600, close:1260 };
}
function minsToTime(m) {
  return String(Math.floor(m/60)).padStart(2,"0") + ":" + String(m%60).padStart(2,"0");
}
function isStylistAvailable(stylist, date, scheduleOverrides) {
  const dateStr = formatDate(date);
  const override = scheduleOverrides?.[stylist.id];
  // Check specific holiday dates first
  if (override?.holidays?.includes(dateStr)) return false;
  // Check work days (use override if available, else default)
  const workDays = override?.workDays ?? stylist.workDays;
  return workDays.includes(date.getDay());
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,6).toUpperCase();
}

const ALL_SLOTS = generateSlots(SALON.hours.open, SALON.hours.close, SALON.slotMinutes);

/* ═══════════════════════════════════════════════════════════
   STORAGE HOOK
═══════════════════════════════════════════════════════════ */
function useBookings() {
  const [bookings, setBookings] = useState([]);
  const [loaded, setLoaded]     = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("je_bookings");
        if (res?.value) setBookings(JSON.parse(res.value));
      } catch (_) {}
      setLoaded(true);
    })();
  }, []);

  // persist helper — always reads freshest state via functional update
  const persist = useCallback((updater) => {
    setBookings(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try {
        if (window.storage) {
          window.storage.set("je_bookings", JSON.stringify(next)).catch(() => {});
        }
      } catch (_) {}
      return next;
    });
  }, []);

  const addBooking    = useCallback((b)         => persist(prev => [...prev, { ...b, id: genId(), status:"pending", createdAt: new Date().toISOString() }]), [persist]);
  const updateStatus  = useCallback((id, status) => persist(prev => prev.map(b => b.id === id ? { ...b, status } : b)), [persist]);
  const deleteBooking = useCallback((id)         => persist(prev => prev.filter(b => b.id !== id)), [persist]);

  return { bookings, loaded, addBooking, updateStatus, deleteBooking };
}

/* ═══════════════════════════════════════════════════════════
   LINE SETTINGS HOOK
═══════════════════════════════════════════════════════════ */
function useLINESettings() {
  const [settings, setSettings] = useState({ webhookUrl:"", token:"", ownerNotify:true });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("je_line_settings");
        if (res?.value) setSettings(JSON.parse(res.value));
      } catch(_) {}
      setLoaded(true);
    })();
  }, []);

  const save = async (next) => {
    setSettings(next);
    try { await window.storage.set("je_line_settings", JSON.stringify(next)); } catch(_) {}
  };

  return { settings, loaded, save };
}

/* LINE 通知發送（透過自架 line-server.js 中繼） */
async function sendLINENotify({ webhookUrl, type, booking, svc, stylist }) {
  if (!webhookUrl) return { ok:false, msg:"未設定 Webhook URL" };
  try {
    const res = await fetch(`${webhookUrl}/notify`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ type, booking, svcName:svc?.zh, stylistName:stylist?.name,
        svcDuration:svc?.duration, svcPrice:`${svc?.price}${svc?.priceNote||""}`,
        salonName: SALON.name }),
    });
    const data = await res.json();
    return data;
  } catch(e) {
    return { ok:false, msg:e.message };
  }
}

/* ═══════════════════════════════════════════════════════════
   STYLIST SETTINGS HOOK (photos + schedule overrides)
═══════════════════════════════════════════════════════════ */
function useStylistSettings() {
  const [settings, setSettings] = useState({});
  const [photosLoaded, setPhotosLoaded] = useState(false);

  // Load: photos stored separately (avoid 5MB limit), schedule in main key
  useEffect(() => {
    (async () => {
      try {
        // Load schedule settings
        const res = await window.storage.get("je_stylist_sched");
        const sched = res?.value ? JSON.parse(res.value) : {};
        // Load photos per stylist
        const photoMap = {};
        for (const st of DEFAULT_STYLISTS) {
          try {
            const pr = await window.storage.get("je_photo_" + st.id);
            if (pr?.value) photoMap[st.id] = pr.value;
          } catch (_) {}
        }
        // Merge
        const merged = {};
        for (const st of DEFAULT_STYLISTS) {
          merged[st.id] = { ...(sched[st.id]||{}), photo: photoMap[st.id] || null };
        }
        setSettings(merged);
      } catch (_) {}
      setPhotosLoaded(true);
    })();
  }, []);

  // Save schedule (no photos in this key)
  const saveSchedule = async (next) => {
    const schedOnly = {};
    for (const id of Object.keys(next)) {
      const { photo: _p, ...rest } = next[id] || {};
      schedOnly[id] = rest;
    }
    try { await window.storage.set("je_stylist_sched", JSON.stringify(schedOnly)); } catch (_) {}
  };

  const setPhoto = async (id, dataUrl) => {
    // Save photo in its own key (prevents overwrite race)
    try { await window.storage.set("je_photo_" + id, dataUrl); } catch (_) {}
    setSettings(prev => ({ ...prev, [id]: { ...(prev[id]||{}), photo: dataUrl } }));
  };

  const setWorkDays = (id, days) => {
    setSettings(prev => {
      const next = { ...prev, [id]: { ...(prev[id]||{}), workDays: days } };
      saveSchedule(next);
      return next;
    });
  };

  const addHoliday = (id, dateStr) => {
    setSettings(prev => {
      const cur = prev[id]?.holidays || [];
      if (cur.includes(dateStr)) return prev;
      const next = { ...prev, [id]: { ...(prev[id]||{}), holidays: [...cur, dateStr].sort() } };
      saveSchedule(next);
      return next;
    });
  };

  const removeHoliday = (id, dateStr) => {
    setSettings(prev => {
      const cur = prev[id]?.holidays || [];
      const next = { ...prev, [id]: { ...(prev[id]||{}), holidays: cur.filter(d => d !== dateStr) } };
      saveSchedule(next);
      return next;
    });
  };

  const getEffective = (stylist) => ({
    photo:    settings[stylist.id]?.photo    ?? null,
    workDays: settings[stylist.id]?.workDays ?? stylist.workDays,
    holidays: settings[stylist.id]?.holidays ?? [],
  });

  return { settings, photosLoaded, setPhoto, setWorkDays, addHoliday, removeHoliday, getEffective };
}

/* ═══════════════════════════════════════════════════════════
   SALON SETTINGS HOOK (logo)
═══════════════════════════════════════════════════════════ */
function useSalonSettings() {
  const [logo, setLogoState] = useState(null);
  const [loaded, setLoaded]  = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("je_salon_logo");
        if (res?.value) setLogoState(res.value);
      } catch (_) {}
      setLoaded(true);
    })();
  }, []);

  const setLogo = async (dataUrl) => {
    setLogoState(dataUrl);
    try { await window.storage.set("je_salon_logo", dataUrl); } catch (_) {}
  };

  const removeLogo = async () => {
    setLogoState(null);
    try { await window.storage.delete("je_salon_logo"); } catch (_) {}
  };

  return { logo, loaded, setLogo, removeLogo };
}

/* ═══════════════════════════════════════════════════════════
   DYNAMIC STYLISTS HOOK
═══════════════════════════════════════════════════════════ */
function useStylists() {
  const [stylists, setStylists] = useState(DEFAULT_STYLISTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("je_stylists");
        if (res?.value) {
          const stored = JSON.parse(res.value);
          if (Array.isArray(stored) && stored.length > 0) setStylists(stored);
        }
      } catch (_) {}
      setLoaded(true);
    })();
  }, []);

  const save = async (next) => {
    setStylists(next);
    try { await window.storage.set("je_stylists", JSON.stringify(next)); } catch (_) {}
  };

  const addStylist = (stylist) => save([...stylists, { ...stylist, id: "st_" + Date.now() }]);

  const deleteStylist = (id) => save(stylists.filter(s => s.id !== id));

  const updateStylist = (id, patch) => save(stylists.map(s => s.id === id ? { ...s, ...patch } : s));

  return { stylists, loaded, addStylist, deleteStylist, updateStylist };
}

/* ═══════════════════════════════════════════════════════════
   DYNAMIC SERVICES HOOK (editable pricing & duration)
═══════════════════════════════════════════════════════════ */
function useServices() {
  const [services, setServices] = useState(DEFAULT_SERVICES);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("je_services");
        if (res?.value) {
          const stored = JSON.parse(res.value);
          if (Array.isArray(stored) && stored.length > 0) setServices(stored);
        }
      } catch (_) {}
    })();
  }, []);

  const save = async (next) => {
    setServices(next);
    try { await window.storage.set("je_services", JSON.stringify(next)); } catch (_) {}
  };

  const updateService = (id, patch) => save(services.map(s => s.id === id ? { ...s, ...patch } : s));

  const addService    = (svc)  => save([...services, svc]);
  const deleteService = (id)   => save(services.filter(s => s.id !== id));

  return { services, updateService, addService, deleteService };
}

/* ═══════════════════════════════════════════════════════════
   CUSTOMERS HOOK
═══════════════════════════════════════════════════════════ */
function useCustomers() {
  const [customers, setCustomers] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("je_customers");
        if (res?.value) setCustomers(JSON.parse(res.value));
      } catch (_) {}
    })();
  }, []);

  const save = (next) => {
    setCustomers(next);
    try {
      if (window.storage) window.storage.set("je_customers", JSON.stringify(next)).catch(()=>{});
    } catch (_) {}
  };

  // Called on every successful booking
  const upsertFromBooking = (booking, svcName, stylistName) => {
    if (!booking || !booking.customerPhone) return;
    const key = booking.customerPhone.replace(/[-\s]/g, "");
    // Capture price BEFORE entering state updater (avoid closure over mutable SERVICES)
    const svc = SERVICES.find(s => s.id === booking.serviceId) || DEFAULT_SERVICES.find(s => s.id === booking.serviceId);
    const price = svc ? parseInt((svc.price||"0").replace(/[^0-9]/g,""),10)||0 : 0;
    setCustomers(prev => {
      const existing = prev[key] || { phone: booking.customerPhone, name: booking.customerName, lineId: booking.lineId||"", firstVisit: booking.date, visits: 0, totalSpend: 0, history: [] };
      const record = { date: booking.date, time: booking.time, service: svcName, stylist: stylistName, bookingId: booking.id || genId() };
      const next = {
        ...prev,
        [key]: {
          ...existing,
          name:       booking.customerName,
          lineId:     booking.lineId || existing.lineId || "",
          lastVisit:  booking.date,
          visits:     (existing.visits||0) + 1,
          totalSpend: (existing.totalSpend||0) + price,
          history:    [record, ...(existing.history||[])].slice(0,50),
        }
      };
      save(next);
      return next;
    });
  };

  const deleteCustomer = (key) => {
    setCustomers(prev => {
      const next = {...prev};
      delete next[key];
      save(next);
      return next;
    });
  };

  return { customers, upsertFromBooking, deleteCustomer };
}

/* ═══════════════════════════════════════════════════════════
   ADMIN AUTH (PIN lock for management tabs)
═══════════════════════════════════════════════════════════ */
const ADMIN_TABS = new Set(["calendar","schedule","stylists","customers","line"]);
const DEFAULT_PIN = "0000"; // ← 預設密碼，可在 LINE 設定頁更改

function useAdminAuth() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin]           = useState(DEFAULT_PIN);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("je_admin_pin");
        if (res?.value) setPin(res.value);
      } catch (_) {}
    })();
  }, []);

  const unlock = (input) => {
    if (input === pin) { setUnlocked(true); return true; }
    return false;
  };
  const lock   = () => setUnlocked(false);
  const changePin = async (newPin) => {
    setPin(newPin);
    try { await window.storage.set("je_admin_pin", newPin); } catch (_) {}
  };

  return { unlocked, unlock, lock, pin, changePin };
}

function AdminLockScreen({ onUnlock, isMobile }) {
  const [input, setInput]   = useState("");
  const [error, setError]   = useState(false);
  const [shake, setShake]   = useState(false);

  const tryUnlock = () => {
    const ok = onUnlock(input);
    if (!ok) {
      setError(true); setShake(true); setInput("");
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setError(false), 1500);
    }
  };

  const digits = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", paddingTop:"3rem", paddingBottom:"4rem" }}>
      <div style={{ width:56, height:56, borderRadius:"50%", background:"var(--copper-bg)", border:"1px solid var(--copper-bd)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"1.5rem" }}>
        <span style={{ fontSize:"1.5rem" }}>🔒</span>
      </div>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.38rem", color:"var(--ink)", marginBottom:".4rem" }}>管理後台</div>
      <div style={{ fontSize:".84rem", color:"var(--ink3)", marginBottom:"2rem" }}>請輸入 4 位數密碼</div>

      {/* PIN dots */}
      <div style={{ display:"flex", gap:".75rem", marginBottom:"2rem",
        animation: shake ? "shake .4s ease" : "none" }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ width:14, height:14, borderRadius:"50%",
            background: i < input.length ? (error ? "#c46060" : "var(--copper)") : "var(--line)",
            transition:"background .15s", border:"1px solid "+(i < input.length ? (error?"#c46060":"var(--copper)") : "var(--line)") }}/>
        ))}
      </div>

      {/* Numpad */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:".6rem", width:isMobile?220:240 }}>
        {digits.map((d, i) => (
          <button key={i} disabled={d===""} onClick={() => {
            if (d === "⌫") { setInput(p => p.slice(0,-1)); return; }
            if (input.length >= 4) return;
            const next = input + d;
            setInput(next);
            if (next.length === 4) setTimeout(() => {
              const ok = onUnlock(next);
              if (!ok) {
                setError(true); setShake(true); setInput("");
                setTimeout(() => setShake(false), 500);
                setTimeout(() => setError(false), 1500);
              }
            }, 120);
          }}
          style={{
            height:52, borderRadius:"var(--r-sm)", border:"1px solid var(--line)",
            background: d===""?"transparent":"var(--card)",
            color:"var(--ink)", fontSize:"1.32rem", fontWeight:500,
            cursor: d===""?"default":"pointer",
            boxShadow: d===""?"none":"var(--shadow)",
            transition:"all .12s",
            opacity: d===""?0:1,
          }}>
            {d}
          </button>
        ))}
      </div>

      <div style={{ marginTop:"1.2rem", fontSize:".86rem", color:"var(--ink4)" }}>預設密碼 0000・可在 LINE 設定頁更改</div>

      <style>{`@keyframes shake{0%,100%{transform:none}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BOOKING FLOW (5 steps)
═══════════════════════════════════════════════════════════ */
function BookingFlow({ bookings, onBook, isMobile, stylistSettings, stylists=DEFAULT_STYLISTS, services=DEFAULT_SERVICES }) {
  const [step, setStep] = useState(0);
  const [sel, setSel]   = useState({ service:null, stylist:null, date:null, time:null });
  const [form, setForm] = useState({ name:"", phone:"", lineId:"", notes:"" });
  const [done, setDone] = useState(null);
  const [calDate, setCalDate] = useState(() => { const d=new Date(); return {y:d.getFullYear(),m:d.getMonth()}; });
  const [showManual, setShowManual] = useState(false); // ← hook moved to top

  const today = new Date(); today.setHours(0,0,0,0);

  // Use prop-passed lists so updates are reactive
  const SERVICES_LOCAL = services;
  const STYLISTS_LOCAL  = stylists;
  const svcObj     = SERVICES_LOCAL.find(s=>s.id===sel.service);
  const stylistObj = STYLISTS_LOCAL.find(s=>s.id===sel.stylist);

  const availableSlots = useMemo(() => {
    if (!sel.stylist || !sel.date || !svcObj) return [];
    const dh       = getDayHours(sel.date);
    const isToday  = formatDate(sel.date) === formatDate(new Date());
    const nowMins  = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : 0;
    return ALL_SLOTS.filter(slot => {
      const slotMins = slotToMinutes(slot);
      if (slotMins < dh.open) return false;
      if (slotMins + svcObj.duration > dh.close) return false;
      // Block past slots for today (add 15min buffer)
      if (isToday && slotMins < nowMins + 15) return false;
      return isSlotAvailable(slot, sel.stylist, sel.date, bookings, svcObj.duration);
    });
  }, [sel.stylist, sel.date, sel.service, bookings]);

  const reset = () => { setStep(0); setSel({service:null,stylist:null,date:null,time:null}); setForm({name:"",phone:"",lineId:"",notes:""}); setDone(null); };

  const confirmBook = () => {
    const booking = {
      serviceId: sel.service, stylistId: sel.stylist,
      date: formatDate(sel.date), time: sel.time,
      customerName: form.name, customerPhone: form.phone, lineId: form.lineId, notes: form.notes,
    };
    onBook(booking);
    setDone(booking);
    setStep(4);
  };

  const STEPS = ["選服務","選設計師","選時間","確認","完成"];

  const card = (children, extra={}) => (
    <div style={{ background:"rgba(255,255,255,1)", border:"1px solid rgba(0,0,0,.08)", borderRadius:10, overflow:"hidden", ...extra }}>
      {children}
    </div>
  );

  /* Calendar for step 2 */
  const daysInMonth = getDaysInMonth(calDate.y, calDate.m);
  const firstDay    = getFirstDayOfMonth(calDate.y, calDate.m);

  return (
    <div style={{ maxWidth:600, margin:"0 auto" }}>
      {/* Step bar */}
      <div style={{ marginBottom:"2rem" }}>
        <div style={{ display:"flex", alignItems:"flex-start", position:"relative", padding:"0 8%" }}>
          <div style={{ position:"absolute", left:"8%", right:"8%", top:13, height:1, background:"var(--line)", zIndex:0 }}/>
          <div style={{ position:"absolute", left:"8%", top:13, height:1, background:"var(--copper)", zIndex:1, width:`${Math.min(step/(STEPS.length-1)*100,100)}%`, transition:"width .4s ease" }}/>
          {STEPS.map((s,i) => {
            const done=step>i, active=step===i;
            return (
              <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:".4rem", position:"relative", zIndex:2 }}>
                <div style={{ width:isMobile?24:28, height:isMobile?24:28, borderRadius:"50%", background:done?"var(--copper)":active?"var(--card)":"var(--card)", border:`2px solid ${done||active?"var(--copper)":"var(--line)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:isMobile?".5rem":".55rem", color:done?"#fff":active?"var(--copper)":"var(--ink4)", fontWeight:600, transition:"all .3s", boxShadow:active?"0 0 0 4px var(--copper-bg)":"none" }}>{done?"✓":i+1}</div>
                <span style={{ fontSize:isMobile?".5rem":".6rem", color:done||active?"var(--copper)":"var(--ink4)", fontWeight:active||done?500:400, whiteSpace:"nowrap", textAlign:"center" }}>{s}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── STEP 0: Service ── */}
      {step===0 && (
        <div>
          <h2 style={h2Style}>選擇服務項目</h2>
          <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr 1fr":"repeat(3,1fr)", gap:isMobile?".75rem":"1rem" }}>
            {SERVICES_LOCAL.map((svc,si) => {
              const active = sel.service===svc.id;
              return (
                <button key={svc.id} onClick={()=>setSel(p=>({...p,service:svc.id}))}
                  className={`svc-card fade-up fade-up-${Math.min(si+1,6)}${active?" active":""}`}
                  style={{ display:"flex", flexDirection:"column", gap:0, padding:0, textAlign:"left", WebkitTapHighlightColor:"transparent" }}>
                  <div className="accent-bar"/>
                  <div style={{ padding:isMobile?".85rem .9rem .65rem":"1rem 1.1rem .8rem", borderBottom:"1px solid var(--line)", flex:1 }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:".55rem" }}>
                      <span style={{ fontSize:isMobile?"1.25rem":"1.45rem", lineHeight:1 }}>{svc.icon}</span>
                      <span style={{ fontSize:".86rem", padding:".15rem .45rem", borderRadius:20, background:active?`rgba(${hexToRgb(svc.color)},.12)`:"var(--bg2)", color:active?svc.color:"var(--ink3)", border:`1px solid ${active?`rgba(${hexToRgb(svc.color)},.25)`:"var(--line)"}`, letterSpacing:".04em" }}>{svc.category}</span>
                    </div>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:isMobile?".9rem":"1rem", fontWeight:500, color:active?"var(--copper)":"var(--ink)", marginBottom:".35rem" }}>{svc.zh}</div>
                    <div style={{ fontSize:".84rem", color:"var(--ink3)", lineHeight:1.62 }}>{svc.desc}</div>
                  </div>
                  <div style={{ padding:isMobile?".55rem .9rem":".65rem 1.1rem", display:"flex", alignItems:"center", justifyContent:"space-between", background:active?"var(--copper-bg)":"var(--bg)", transition:"background .2s" }}>
                    <span style={{ fontSize:".70rem", color:"var(--ink3)", fontFamily:"'DM Mono',monospace" }}>{svc.duration}min</span>
                    <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:isMobile?".92rem":".98rem", fontWeight:600, color:active?"var(--copper)":svc.color }}>{svc.price}<span style={{ fontSize:".75em", fontWeight:400 }}>{svc.priceNote}</span></span>
                  </div>
                </button>
              );
            })}
          </div>
          <NavBtns onNext={()=>setStep(1)} nextDisabled={!sel.service} isMobile={isMobile}/>
        </div>
      )}

      {/* ── STEP 1: Stylist ── */}
      {step===1 && (
        <div>
          <h2 style={h2Style}>選擇設計師</h2>
          <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr 1fr":"1fr 1fr", gap:".7rem", marginBottom:".7rem" }}>
            {STYLISTS_LOCAL.map(st => {
              const canDoSvc = st.specialty.includes(svcObj?.zh);
              const active   = sel.stylist===st.id;
              return (
                <button key={st.id} onClick={()=>canDoSvc&&setSel(p=>({...p,stylist:st.id,date:null,time:null}))}
                  className={`stylist-card${active?" active":""}${!canDoSvc?" disabled":""}`}
                  style={{
                    display:"flex", flexDirection:"column", gap:".45rem", padding:".95rem .95rem", textAlign:"left",
                    cursor:canDoSvc?"pointer":"not-allowed",
                    opacity:canDoSvc?1:.35,
                    WebkitTapHighlightColor:"transparent",
                  }}>
                  <div style={{ display:"flex", alignItems:"center", gap:".6rem" }}>
                    <div style={{ width:38, height:38, borderRadius:"50%", overflow:"hidden", border:`1px solid rgba(${hexToRgb(st.color)},.25)`, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:`rgba(${hexToRgb(st.color)},.07)` }}>
                      {stylistSettings?.[st.id]?.photo
                        ? <img src={stylistSettings[st.id].photo} alt={st.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                        : <span style={{ fontSize:"1.55rem", lineHeight:1 }}>{st.icon}</span>
                      }
                    </div>
                    <div>
                      <div style={{ fontSize:"1.02rem", fontWeight:600, color:"var(--ink)" }}>{st.name}</div>
                      <div style={{ fontSize:".70rem", color:st.color }}>{st.title}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:".86rem", color:"#666666", lineHeight:1.6 }}>{st.bio}</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:".22rem", marginTop:".1rem" }}>
                    {st.specialty.map(sp=>(
                      <span key={sp} style={{ fontSize:".64rem", padding:".08rem .38rem", borderRadius:20, background:`rgba(${hexToRgb(st.color)},.08)`, color:st.color, border:`1px solid rgba(${hexToRgb(st.color)},.2)` }}>{sp}</span>
                    ))}
                  </div>
                  <div style={{ fontSize:".70rem", color:"#999999" }}>
                    上班：{WEEK_DAYS.filter((_,i)=>st.workDays.includes(i)).join("・")}
                  </div>
                </button>
              );
            })}
          </div>
          <NavBtns onBack={()=>setStep(0)} onNext={()=>setStep(2)} nextDisabled={!sel.stylist} isMobile={isMobile}/>
        </div>
      )}

      {/* ── STEP 2: Date + Time ── */}
      {step===2 && (
        <div>
          <h2 style={h2Style}>選擇日期與時間</h2>
          {/* Mini calendar */}
          {card(
            <div style={{ padding:"1rem" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:".8rem" }}>
                <button onClick={()=>setCalDate(p=>{ const d=new Date(p.y,p.m-1,1); return {y:d.getFullYear(),m:d.getMonth()}; })} style={arrowBtn}>‹</button>
                <span style={{ fontSize:"1.32rem", color:"var(--copper)", fontFamily:"'Cormorant Garamond'" }}>{calDate.y}年 {calDate.m+1}月</span>
                <button onClick={()=>setCalDate(p=>{ const d=new Date(p.y,p.m+1,1); return {y:d.getFullYear(),m:d.getMonth()}; })} style={arrowBtn}>›</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:".15rem", marginBottom:".3rem" }}>
                {WEEK_DAYS.map(d=><div key={d} style={{ textAlign:"center", fontSize:".84rem", color:"#999999", padding:".2rem" }}>{d}</div>)}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:".15rem" }}>
                {Array(firstDay).fill(null).map((_,i)=><div key={`e${i}`}/>)}
                {Array(daysInMonth).fill(null).map((_,i)=>{
                  const day = i+1;
                  const d   = new Date(calDate.y, calDate.m, day);
                  d.setHours(0,0,0,0);
                  const isPast      = d < today;
                  const isAvailable = isStylistAvailable(stylistObj, d, stylistSettings);
                  const isSelected  = sel.date && formatDate(d)===formatDate(sel.date);
                  const isToday     = formatDate(d)===formatDate(today);
                  return (
                    <button key={day} disabled={isPast||!isAvailable}
                      onClick={()=>setSel(p=>({...p,date:d,time:null}))}
                      style={{
                        aspectRatio:"1", borderRadius:"50%", border:"none",
                        background: isSelected?"var(--copper)":isToday?"rgba(200,169,126,.2)":"transparent",
                        color: isSelected?"#ffffff":isPast?"#cccccc":!isAvailable?"#cccccc":"var(--ink)",
                        fontSize: isMobile?".7rem":".75rem", cursor:isPast||!isAvailable?"default":"pointer",
                        fontWeight: isToday&&!isSelected?700:400, transition:"all .15s",
                        position:"relative",
                      }}>
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          , { marginBottom:".8rem" })}

          {/* Time slots */}
          {sel.date && (
            <div>
              <div style={{ fontSize:"1.32rem", letterSpacing:".18em", color:"#666666", textTransform:"uppercase", marginBottom:".5rem" }}>
                {displayDate(sel.date)} 可用時段
              </div>
              {availableSlots.length === 0
                ? <div style={{ padding:"1.5rem", textAlign:"center", fontSize:"1.32rem", color:"#999999", background:"rgba(0,0,0,.04)", borderRadius:8 }}>
                    此日無可用時段，請選擇其他日期
                  </div>
                : <div style={{ display:"flex", flexWrap:"wrap", gap:".4rem" }}>
                    {availableSlots.map(slot=>(
                      <button key={slot} onClick={()=>setSel(p=>({...p,time:slot}))}
                        className={`slot-btn${sel.time===slot?" active":""}`}>
                        {slot}
                      </button>
                    ))}
                  </div>
              }
            </div>
          )}
          <NavBtns onBack={()=>setStep(1)} onNext={()=>setStep(3)} nextDisabled={!sel.date||!sel.time} isMobile={isMobile}/>
        </div>
      )}

      {/* ── STEP 3: Form + Confirm ── */}
      {step===3 && (
        <div>
          <h2 style={h2Style}>填寫預約資料</h2>
          {/* Summary card */}
          {card(
            <div style={{ padding:"1rem 1.1rem" }}>
              <div style={{ fontSize:"1.32rem", letterSpacing:".18em", color:"#666666", textTransform:"uppercase", marginBottom:".6rem" }}>預約摘要</div>
              {[
                [svcObj?.icon||"✂", "服務", `${svcObj?.zh}（${svcObj?.duration}分鐘）`, svcObj?.color],
                [stylistObj?.icon||"👤", "設計師", `${stylistObj?.name}・${stylistObj?.title}`, stylistObj?.color],
                ["📅", "日期", displayDate(sel.date), "var(--copper)"],
                ["⏰", "時間", sel.time, "var(--copper)"],
                ["💰", "費用", `${svcObj?.price}${svcObj?.priceNote}`, svcObj?.color],
              ].map(([icon,label,val,color])=>(
                <div key={label} style={{ display:"flex", alignItems:"center", gap:".7rem", marginBottom:".5rem" }}>
                  <span style={{ width:28, height:28, borderRadius:"50%", background:`rgba(${hexToRgb(color||"var(--copper)")},.1)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:".96rem", flexShrink:0 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize:"1.32rem", color:"#999999", letterSpacing:".1em" }}>{label}</div>
                    <div style={{ fontSize:".8rem", color:"var(--ink)" }}>{val}</div>
                  </div>
                </div>
              ))}
            </div>
          , { marginBottom:".9rem" })}

          {/* Form */}
          {[
            ["姓名 *", "name", "text", "您的姓名", true],
            ["電話 *", "phone", "tel", "聯絡電話", true],
            ["LINE ID", "lineId", "text", "@您的LINE ID（選填，用於接收預約通知）", false],
            ["備注", "notes", "text", "特殊需求或備注（可留空）", false],
          ].map(([label,key,type,ph,req])=>(
            <div key={key} style={{ marginBottom:".75rem" }}>
              <label className="field-label">{label}</label>
              <input type={type} placeholder={ph} value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
                className="field-input"
              />
            </div>
          ))}
          <NavBtns onBack={()=>setStep(2)} onNext={confirmBook} nextLabel="確認預約 ✦" nextDisabled={!form.name||!form.phone} isMobile={isMobile}/>
        </div>
      )}

      {/* ── STEP 4: Done ── */}
      {step===4 && done && (
        <div style={{ textAlign:"center", padding:"2rem 1rem" }}>

          {/* Success icon */}
          <div style={{ width:72, height:72, borderRadius:"50%", background:"var(--copper-bg)", border:"2px solid var(--copper-bd)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 1.2rem", fontSize:"1.95rem" }}>🎉</div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:"2rem", fontWeight:500, color:"var(--copper)", marginBottom:".5rem" }}>預約成功</h2>
          <p style={{ fontSize:"1.1rem", color:"var(--ink2)", lineHeight:1.8, marginBottom:"1.5rem" }}>
            已收到您的預約申請，{SALON.name}將盡快與您確認
          </p>

          {/* Summary card — plain div, no card() helper */}
          <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:"var(--r)", marginBottom:"1.2rem", textAlign:"left", overflow:"hidden" }}>
            {[
              ["服務",    SERVICES_LOCAL.find(s=>s.id===done.serviceId)?.zh || done.serviceId],
              ["設計師",  STYLISTS_LOCAL.find(s=>s.id===done.stylistId)?.name || done.stylistId],
              ["日期",    `${displayDate(done.date)} (${done.time})`],
              ["姓名",    done.customerName],
              ["電話",    done.customerPhone],
              ...(done.lineId ? [["LINE ID", done.lineId]] : []),
            ].map(([k,v], i) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:".65rem 1rem", borderBottom: i < 4 ? "1px solid var(--line)" : "none", fontSize:"1rem" }}>
                <span style={{ color:"var(--ink3)", minWidth:70 }}>{k}</span>
                <span style={{ color:"var(--ink)", fontWeight:500, textAlign:"right" }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:".7rem", width:"100%", maxWidth:320, margin:"0 auto" }}>
            <a href={`https://line.me/R/ti/p/${SALON.lineOaId}`} target="_blank" rel="noreferrer"
              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:".5rem", width:"100%", padding:".75rem 1rem", background:"rgba(6,199,85,.08)", border:"1px solid rgba(6,199,85,.3)", borderRadius:"var(--r-sm)", color:"#06C755", fontSize:".9rem", fontWeight:600, textDecoration:"none" }}>
              <span style={{ fontSize:"1.1rem" }}>💬</span>
              加入 LINE 官方帳號，接收預約通知
            </a>
            <button onClick={reset} className="btn-ghost" style={{ width:"100%", padding:".72rem 1rem" }}>
              再次預約
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CALENDAR VIEW
═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   MANUAL BOOKING MODAL (for phone/walk-in bookings)
═══════════════════════════════════════════════════════════ */
function ManualBookingModal({ onBook, onClose, bookings, stylistSettings, isMobile, stylists=DEFAULT_STYLISTS }) {
  const today = formatDate(new Date());
  const [form, setForm] = useState({
    serviceId:"cut", stylistId: STYLISTS[0].id,
    date: today, time:"10:00",
    customerName:"", customerPhone:"", notes:"", lineId:"",
  });
  const [saved, setSaved] = useState(false);

  const svcObj     = SERVICES.find(s => s.id === form.serviceId);
  const stylistObj = STYLISTS.find(s => s.id === form.stylistId);

  const dh = useMemo(() => {
    try { return getDayHours(parseDate(form.date)); } catch(_) { return {open:600,close:1260}; }
  }, [form.date]);

  const slots = useMemo(() => {
    if (!form.serviceId || !form.stylistId || !form.date) return [];
    return ALL_SLOTS.filter(slot => {
      const sm = slotToMinutes(slot);
      if (sm < dh.open || sm + (svcObj?.duration||45) > dh.close) return false;
      return isSlotAvailable(slot, form.stylistId, parseDate(form.date), bookings, svcObj?.duration||45);
    });
  }, [form.serviceId, form.stylistId, form.date, bookings, dh]);

  const handleSubmit = () => {
    if (!form.customerName || !form.customerPhone || !form.time) return;
    onBook({
      serviceId: form.serviceId, stylistId: form.stylistId,
      date: form.date, time: form.time,
      customerName: form.customerName, customerPhone: form.customerPhone,
      lineId: form.lineId, notes: form.notes,
    });
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(28,24,22,.5)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:isMobile?"1rem":"1.5rem" }}
      onClick={e=>{ if(e.target===e.currentTarget)onClose(); }}>
      <div style={{ background:"var(--card)", borderRadius:"var(--r)", width:"100%", maxWidth:560, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(28,24,22,.25)" }}>
        {/* Header */}
        <div style={{ padding:"1.1rem 1.3rem", borderBottom:"1px solid var(--line)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.32rem", fontWeight:500, color:"var(--ink)" }}>手動新增預約</div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:"1.32rem", cursor:"pointer", color:"var(--ink3)", lineHeight:1 }}>✕</button>
        </div>
        <div style={{ padding:"1.1rem 1.3rem", display:"flex", flexDirection:"column", gap:".9rem" }}>

          {/* Service */}
          <div>
            <label className="field-label">服務項目</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:".4rem" }}>
              {SERVICES.map(svc=>(
                <button key={svc.id} onClick={()=>setForm(p=>({...p,serviceId:svc.id,time:""}))}
                  style={{ padding:".32rem .75rem", borderRadius:"var(--r-sm)", border:`1px solid ${form.serviceId===svc.id?"var(--copper)":"var(--line)"}`, background:form.serviceId===svc.id?"var(--copper-bg)":"var(--card)", color:form.serviceId===svc.id?"var(--copper)":"var(--ink2)", fontSize:".87rem", cursor:"pointer" }}>
                  {svc.icon} {svc.zh}
                </button>
              ))}
            </div>
          </div>

          {/* Stylist */}
          <div>
            <label className="field-label">設計師</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:".4rem" }}>
              {STYLISTS.map(st=>{
                const photo = stylistSettings?.[st.id]?.photo;
                return (
                  <button key={st.id} onClick={()=>setForm(p=>({...p,stylistId:st.id,time:""}))}
                    style={{ display:"flex", alignItems:"center", gap:".4rem", padding:".32rem .75rem", borderRadius:"var(--r-sm)", border:`1px solid ${form.stylistId===st.id?st.color:"var(--line)"}`, background:form.stylistId===st.id?`rgba(${hexToRgb(st.color)},.08)`:"var(--card)", color:form.stylistId===st.id?st.color:"var(--ink2)", fontSize:".87rem", cursor:"pointer" }}>
                    {photo ? <img src={photo} alt="" style={{ width:16,height:16,borderRadius:"50%",objectFit:"cover" }}/> : <span>{st.icon}</span>}
                    {st.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date + Time */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".7rem" }}>
            <div>
              <label className="field-label">日期</label>
              <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value,time:""}))} className="field-input" min={today}/>
            </div>
            <div>
              <label className="field-label">時段</label>
              <select value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))}
                className="field-input" style={{ cursor:"pointer" }}>
                <option value="">-- 選擇時段 --</option>
                {slots.map(s=><option key={s} value={s}>{s}</option>)}
                {/* Allow custom time even if not in slots (staff override) */}
                {form.time && !slots.includes(form.time) && <option value={form.time}>{form.time} (自訂)</option>}
              </select>
            </div>
          </div>

          {/* Custom time override */}
          <div>
            <label className="field-label">自訂時間（可不選時段直接輸入）</label>
            <input type="time" value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))} className="field-input" step={SALON.slotMinutes*60}/>
          </div>

          {/* Customer info */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".7rem" }}>
            <div>
              <label className="field-label">姓名 *</label>
              <input value={form.customerName} onChange={e=>setForm(p=>({...p,customerName:e.target.value}))} placeholder="顧客姓名" className="field-input"/>
            </div>
            <div>
              <label className="field-label">電話 *</label>
              <input value={form.customerPhone} onChange={e=>setForm(p=>({...p,customerPhone:e.target.value}))} placeholder="聯絡電話" className="field-input" type="tel"/>
            </div>
          </div>
          <div>
            <label className="field-label">LINE ID（選填）</label>
            <input value={form.lineId} onChange={e=>setForm(p=>({...p,lineId:e.target.value}))} placeholder="@lineID" className="field-input"/>
          </div>
          <div>
            <label className="field-label">備注</label>
            <input value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="特殊需求或備注" className="field-input"/>
          </div>

          {/* Summary */}
          {form.customerName && form.time && (
            <div style={{ padding:".75rem 1rem", background:"var(--bg2)", borderRadius:"var(--r-sm)", border:"1px solid var(--line)", fontSize:".87rem", color:"var(--ink2)", lineHeight:1.8 }}>
              📋 {form.date} {form.time}｜{svcObj?.zh}（{svcObj?.duration}min）｜{stylistObj?.name}｜{form.customerName}
            </div>
          )}

          <button onClick={handleSubmit}
            disabled={!form.customerName||!form.customerPhone||!form.time}
            className="btn-copper"
            style={{ opacity:(!form.customerName||!form.customerPhone||!form.time)?.38:1, cursor:(!form.customerName||!form.customerPhone||!form.time)?"not-allowed":"pointer", fontSize:"1.32rem", letterSpacing:".12em" }}>
            {saved ? "✓ 預約已建立！" : "確認新增預約"}
          </button>
        </div>
      </div>
    </div>
  );
}



function CalendarView({ bookings, onUpdateStatus, onDelete, isMobile, lineSettings, stylistSettings, onAddBooking, stylists=DEFAULT_STYLISTS }) {
  const today = new Date();
  const [calDate, setCalDate] = useState({ y:today.getFullYear(), m:today.getMonth() });
  const [selectedDay, setSelectedDay] = useState(null);
  const [filterStylist, setFilterStylist] = useState("all");

  const [showManual, setShowManual] = useState(false);
  const daysInMonth = getDaysInMonth(calDate.y, calDate.m);
  const firstDay    = getFirstDayOfMonth(calDate.y, calDate.m);

  const filtered = bookings.filter(b => filterStylist==="all" || b.stylistId===filterStylist);

  const bookingsOnDay = (day) => {
    const dateStr = `${calDate.y}-${String(calDate.m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return filtered.filter(b => b.date===dateStr && b.status!=="cancelled");
  };

  const selectedBookings = selectedDay
    ? filtered.filter(b => {
        const dateStr = `${calDate.y}-${String(calDate.m+1).padStart(2,"0")}-${String(selectedDay).padStart(2,"0")}`;
        return b.date===dateStr;
      }).sort((a,b)=>a.time.localeCompare(b.time))
    : [];

  return (
    <div>
      {showManual && onAddBooking && (
        <ManualBookingModal onBook={(b)=>{onAddBooking(b);setShowManual(false);}} onClose={()=>setShowManual(false)} bookings={bookings} stylistSettings={stylistSettings} isMobile={isMobile}/>
      )}

      {/* Toolbar */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:".6rem", marginBottom:"1rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:".6rem" }}>
          <button onClick={()=>setCalDate(p=>{const d=new Date(p.y,p.m-1,1);return{y:d.getFullYear(),m:d.getMonth()}})} style={arrowBtn}>‹</button>
          <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.38rem", fontWeight:500, color:"var(--ink)", minWidth:110, textAlign:"center" }}>{calDate.y}年 {calDate.m+1}月</span>
          <button onClick={()=>setCalDate(p=>{const d=new Date(p.y,p.m+1,1);return{y:d.getFullYear(),m:d.getMonth()}})} style={arrowBtn}>›</button>
        </div>
        <div style={{ display:"flex", gap:".4rem", flexWrap:"wrap", alignItems:"center" }}>
          
          {onAddBooking && (
            <button onClick={()=>setShowManual(true)} className="btn-copper"
              style={{ padding:".32rem .85rem", fontSize:".84rem", letterSpacing:".08em", flexShrink:0 }}>
              ＋ 新增預約
            </button>
          )}
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:"var(--r)", overflow:"hidden", marginBottom:"1rem" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", background:"#f5f3f0" }}>
          {WEEK_DAYS.map(d=><div key={d} style={{ textAlign:"center", padding:".5rem .1rem", fontSize:".84rem", color:"var(--ink3)", borderBottom:"1px solid var(--line)" }}>{d}</div>)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
          {Array(firstDay).fill(null).map((_,i)=><div key={`e${i}`} style={{ borderRight:"1px solid rgba(0,0,0,.03)", borderBottom:"1px solid rgba(0,0,0,.03)", minHeight: isMobile?40:60 }}/>)}
          {Array(daysInMonth).fill(null).map((_,i)=>{
            const day  = i+1;
            const bk   = bookingsOnDay(day);
            const isToday = calDate.y===today.getFullYear() && calDate.m===today.getMonth() && day===today.getDate();
            const isSel   = selectedDay===day;
            return (
              <div key={day} onClick={()=>setSelectedDay(isSel?null:day)}
                style={{
                  minHeight: isMobile?40:60, padding:".3rem", cursor:"pointer",
                  borderRight:"1px solid rgba(0,0,0,.03)", borderBottom:"1px solid rgba(0,0,0,.03)",
                  background: isSel?"rgba(200,169,126,.08)":"transparent",
                  transition:"background .15s",
                }}>
                <div style={{ fontSize: isMobile?".65rem":".72rem", color:isToday?"var(--copper)":"#555555", fontWeight:isToday?700:400, marginBottom:".15rem" }}>{day}</div>
                {bk.slice(0,isMobile?1:3).map((b,bi)=>{
                  const st  = STYLISTS.find(s=>s.id===b.stylistId);
                  const svc = SERVICES.find(s=>s.id===b.serviceId);
                  return (
                    <div key={bi} style={{ fontSize:".86rem", padding:".08rem .25rem", borderRadius:3, marginBottom:".1rem", background:`rgba(${hexToRgb(st?.color||"var(--copper)")},.15)`, color:st?.color, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {b.time} {svc?.zh}
                    </div>
                  );
                })}
                {bk.length>(isMobile?1:3) && <div style={{ fontSize:".60rem", color:"#999999" }}>+{bk.length-(isMobile?1:3)}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div>
          <div style={{ fontSize:"1.32rem", letterSpacing:".18em", color:"#666666", textTransform:"uppercase", marginBottom:".6rem" }}>
            {calDate.m+1}/{selectedDay} 預約明細
          </div>
          {selectedBookings.length===0
            ? <div style={{ padding:"1.2rem", textAlign:"center", fontSize:"1.32rem", color:"#999999", background:"rgba(0,0,0,.04)", borderRadius:8 }}>當日無預約</div>
            : selectedBookings.map(b=><BookingCard key={b.id} booking={b} onUpdateStatus={onUpdateStatus} onDelete={onDelete} isMobile={isMobile} lineSettings={lineSettings} stylistSettings={stylistSettings} stylists={stylists}/>)
          }
        </div>
      )}
    </div>
  );
}

function ScheduleView({ bookings, isMobile, stylistSettings, onAddBooking, stylists=DEFAULT_STYLISTS }) {
  const today = new Date();
  // All hooks FIRST — before any derived state
  const [viewDate, setViewDate]           = useState(today);
  const [showManualSched, setShowManualSched] = useState(false);

  const dateStr    = formatDate(viewDate);
  const dayBookings = bookings
    .filter(b => b.date===dateStr && b.status!=="cancelled")
    .sort((a,b)=>a.time.localeCompare(b.time));

  const shiftDay = (n) => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + n);
    setViewDate(d);
  };

  const dh    = getDayHours(viewDate);
  const hours = Array.from({length: Math.ceil((dh.close - dh.open) / 60)}, (_,i) => Math.floor(dh.open/60) + i);

  return (
    <div>
      {showManualSched && onAddBooking && (
        <ManualBookingModal onBook={(b)=>{onAddBooking(b);setShowManualSched(false);}} onClose={()=>setShowManualSched(false)} bookings={bookings} stylistSettings={stylistSettings} isMobile={isMobile}/>
      )}
      {/* Date nav */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem", marginBottom:"1.2rem" }}>
        <button onClick={()=>shiftDay(-1)} style={arrowBtn}>‹</button>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.38rem", fontWeight:500, color:"var(--ink)" }}>{displayDate(viewDate)}</div>
          <div style={{ fontSize:".70rem", color:"#999999" }}>{dayBookings.length}筆預約</div>
        </div>
        <button onClick={()=>shiftDay(1)} style={arrowBtn}>›</button>
      </div>
      {onAddBooking && (
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:".8rem" }}>
          <button onClick={()=>setShowManualSched(true)} className="btn-copper" style={{ padding:".38rem .9rem", fontSize:".84rem", letterSpacing:".08em" }}>
            ＋ 新增預約
          </button>
        </div>
      )}

      {/* Time grid */}
      <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:"var(--r)", overflow:"hidden", boxShadow:"var(--shadow)" }}>
        {/* Header */}
        <div style={{ display:"grid", gridTemplateColumns:`60px repeat(${STYLISTS.length},1fr)`, borderBottom:"1px solid var(--line)", background:"var(--card)" }}>
          <div style={{ padding:".6rem .3rem", fontSize:"1.32rem", color:"var(--ink3)", textAlign:"center", display:"flex", alignItems:"center", justifyContent:"center" }}>時間</div>
          {STYLISTS.map(st=>{
            const photo = stylistSettings?.[st.id]?.photo;
            const isWorkToday = isStylistAvailable(st, viewDate, stylistSettings);
            return (
              <div key={st.id} style={{ padding:".65rem .3rem", borderLeft:"1px solid var(--line)", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:".3rem", opacity:isWorkToday?1:.45 }}>
                <div style={{ width:36, height:36, borderRadius:"50%", overflow:"hidden", border:`2px solid ${isWorkToday?`rgba(${hexToRgb(st.color)},.35)`:"var(--line)"}`, background:`rgba(${hexToRgb(st.color)},.08)`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {photo
                    ? <img src={photo} alt={st.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                    : <span style={{ fontSize:"1.38rem", lineHeight:1 }}>{st.icon}</span>
                  }
                </div>
                <div style={{ fontSize:".84rem", color:isWorkToday?st.color:"var(--ink3)", fontWeight:isWorkToday?500:400, whiteSpace:"nowrap" }}>{st.name}</div>
                {!isWorkToday && <div style={{ fontSize:".86rem", color:"var(--ink4)", letterSpacing:".06em" }}>休假</div>}
              </div>
            );
          })}
        </div>
        {/* Rows */}
        {hours.map(h=>(
          Array.from({length: 60/SALON.slotMinutes}, (_,mi)=>mi*SALON.slotMinutes).map(min=>{
            const slot = `${String(h).padStart(2,"0")}:${String(min).padStart(2,"0")}`;
            return (
              <div key={slot} style={{ display:"grid", gridTemplateColumns:`60px repeat(${STYLISTS.length},1fr)`, borderBottom:"1px solid rgba(0,0,0,.04)", minHeight:28 }}>
                <div style={{ padding:".3rem", fontSize:".84rem", color:"var(--ink3)", fontFamily:"'DM Mono',monospace", textAlign:"right", display:"flex", alignItems:"center", justifyContent:"flex-end", paddingRight:".5rem", borderRight:"1px solid var(--line)" }}>{slot}</div>
                {STYLISTS.map(st=>{
                  const booking = dayBookings.find(b=>b.stylistId===st.id && b.time===slot);
                  const svc     = booking ? SERVICES.find(s=>s.id===booking.serviceId) : null;
                  const isOff   = !isStylistAvailable(st, viewDate, stylistSettings);
                  return (
                    <div key={st.id} style={{
                      padding:".2rem .25rem", borderLeft:"1px solid rgba(0,0,0,.04)",
                      background: isOff?"var(--bg2)":booking?`rgba(${hexToRgb(st.color)},.1)`:"transparent",
                      overflow:"hidden",
                    }}>
                      {isOff && !booking && <div style={{ fontSize:".70rem", color:"#cccccc", textAlign:"center", marginTop:".3rem" }}>休</div>}
                      {booking && (
                        <div style={{ fontSize:".64rem", color:st.color, lineHeight:1.4 }}>
                          <div style={{ fontWeight:600 }}>{svc?.zh}</div>
                          <div style={{ color:"#666666" }}>{booking.customerName}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLIST ROSTER
═══════════════════════════════════════════════════════════ */
function StylistRoster({ bookings, isMobile, stylistMgr, stylistsMgr }) {
  const stylists   = stylistsMgr ? stylistsMgr.stylists : DEFAULT_STYLISTS;
  const today      = new Date();
  const todayStr   = formatDate(today);
  const [editId, setEditId]         = useState(null);
  const [holidayInput, setHolidayInput] = useState("");
  const [showAdd, setShowAdd]       = useState(false);
  const [newForm, setNewForm]       = useState({ name:"", title:"", exp:"", bio:"", color:"#c4835a", specialty:[], workDays:[1,2,3,4,5,6], icon:"💇" });

  const ICON_OPTIONS = ["💇","👨‍🎨","👩‍🎨","✂️","💈","👑","🌸","⭐"];
  const COLOR_OPTIONS = ["#c4835a","#a0c4b8","#b8a0c4","#c4a0a0","#7a9aaa","#c4bc9a","#a0b8c4","#b4c4a0"];

  const [editStylistId, setEditStylistId] = useState(null);
  const [editForm, setEditForm]           = useState({});

  const openEditStylist = (st) => {
    setEditStylistId(st.id);
    setEditForm({ name:st.name, title:st.title||"", exp:st.exp||"", bio:st.bio||"", color:st.color||"#c4835a", icon:st.icon||"💇", specialty:st.specialty||[] });
  };
  const saveEditStylist = () => {
    if (!editForm.name?.trim()) return;
    stylistsMgr?.updateStylist(editStylistId, { ...editForm });
    setEditStylistId(null);
  };

  const handleAddStylist = () => {
    if (!newForm.name.trim()) return;
    stylistsMgr.addStylist({ ...newForm, photo: null });
    setNewForm({ name:"", title:"", exp:"", bio:"", color:"#c4835a", specialty:[], workDays:[1,2,3,4,5,6], icon:"💇" });
    setShowAdd(false);
  };

  return (
    <div>
      {/* Add stylist modal */}
      {showAdd && (
        <div style={{ position:"fixed", inset:0, background:"rgba(28,24,22,.5)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:isMobile?"1rem":"1.5rem" }}
          onClick={e=>{ if(e.target===e.currentTarget)setShowAdd(false); }}>
          <div style={{ background:"var(--card)", borderRadius:"var(--r)", width:"100%", maxWidth:500, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(28,24,22,.2)" }}>
            <div style={{ padding:"1rem 1.2rem", borderBottom:"1px solid var(--line)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.32rem", fontWeight:500 }}>新增設計師</div>
              <button onClick={()=>setShowAdd(false)} style={{ background:"none", border:"none", fontSize:"1.32rem", cursor:"pointer", color:"var(--ink3)" }}>✕</button>
            </div>
            <div style={{ padding:"1rem 1.2rem", display:"flex", flexDirection:"column", gap:".8rem" }}>
              {/* Icon + Color */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".7rem" }}>
                <div>
                  <label className="field-label">頭像</label>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:".3rem" }}>
                    {ICON_OPTIONS.map(ic=>(
                      <button key={ic} onClick={()=>setNewForm(p=>({...p,icon:ic}))}
                        style={{ width:36, height:36, fontSize:"1.32rem", borderRadius:"var(--r-sm)", border:`2px solid ${newForm.icon===ic?"var(--copper)":"var(--line)"}`, background:newForm.icon===ic?"var(--copper-bg)":"transparent", cursor:"pointer" }}>
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="field-label">主題色</label>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:".3rem" }}>
                    {COLOR_OPTIONS.map(col=>(
                      <button key={col} onClick={()=>setNewForm(p=>({...p,color:col}))}
                        style={{ width:24, height:24, borderRadius:"50%", background:col, border:`3px solid ${newForm.color===col?"var(--ink)":"transparent"}`, cursor:"pointer" }}/>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".7rem" }}>
                <div><label className="field-label">姓名 *</label><input value={newForm.name} onChange={e=>setNewForm(p=>({...p,name:e.target.value}))} placeholder="設計師姓名" className="field-input"/></div>
                <div><label className="field-label">職稱</label><input value={newForm.title} onChange={e=>setNewForm(p=>({...p,title:e.target.value}))} placeholder="例：剪髮設計師" className="field-input"/></div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".7rem" }}>
                <div><label className="field-label">年資</label><input value={newForm.exp} onChange={e=>setNewForm(p=>({...p,exp:e.target.value}))} placeholder="例：5年" className="field-input"/></div>
              </div>
              <div><label className="field-label">個人簡介</label><input value={newForm.bio} onChange={e=>setNewForm(p=>({...p,bio:e.target.value}))} placeholder="簡短介紹" className="field-input"/></div>
              <div>
                <label className="field-label">專項服務（勾選）</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:".35rem" }}>
                  {SERVICES.map(svc=>{
                    const on = newForm.specialty.includes(svc.zh);
                    return (
                      <button key={svc.id} onClick={()=>setNewForm(p=>({...p,specialty: on?p.specialty.filter(s=>s!==svc.zh):[...p.specialty,svc.zh]}))}
                        style={{ padding:".28rem .65rem", borderRadius:20, fontSize:".84rem", border:`1px solid ${on?"var(--copper)":"var(--line)"}`, background:on?"var(--copper-bg)":"var(--card)", color:on?"var(--copper)":"var(--ink2)", cursor:"pointer" }}>
                        {svc.icon} {svc.zh}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="field-label">常規上班日</label>
                <div style={{ display:"flex", gap:".3rem" }}>
                  {["日","一","二","三","四","五","六"].map((d,i)=>{
                    const on = newForm.workDays.includes(i);
                    return (
                      <div key={i} onClick={()=>setNewForm(p=>({...p,workDays:on?p.workDays.filter(x=>x!==i):[...p.workDays,i].sort((a,b)=>a-b)}))}
                        style={{ width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.32rem", fontWeight:on?600:400, background:on?"var(--copper-bg)":"rgba(0,0,0,.04)", color:on?"var(--copper)":"var(--ink4)", border:`1px solid ${on?"var(--copper-bd)":"var(--line)"}`, cursor:"pointer" }}>
                        {d}
                      </div>
                    );
                  })}
                </div>
              </div>
              <button onClick={handleAddStylist} disabled={!newForm.name.trim()} className="btn-copper"
                style={{ opacity:newForm.name.trim()?1:.38, cursor:newForm.name.trim()?"pointer":"not-allowed" }}>
                確認新增
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit stylist modal */}
      {editStylistId && (
        <div style={{ position:"fixed", inset:0, background:"rgba(28,24,22,.5)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:isMobile?"1rem":"1.5rem" }}
          onClick={e=>{ if(e.target===e.currentTarget)setEditStylistId(null); }}>
          <div style={{ background:"var(--card)", borderRadius:"var(--r)", width:"100%", maxWidth:500, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(28,24,22,.2)" }}>
            <div style={{ padding:"1rem 1.2rem", borderBottom:"1px solid var(--line)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.32rem", fontWeight:500 }}>編輯設計師資料</div>
              <button onClick={()=>setEditStylistId(null)} style={{ background:"none", border:"none", fontSize:"1.32rem", cursor:"pointer", color:"var(--ink3)" }}>✕</button>
            </div>
            <div style={{ padding:"1rem 1.2rem", display:"flex", flexDirection:"column", gap:".8rem" }}>
              {/* Icon + Color */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".7rem" }}>
                <div>
                  <label className="field-label">頭像</label>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:".3rem" }}>
                    {ICON_OPTIONS.map(ic=>(
                      <button key={ic} onClick={()=>setEditForm(p=>({...p,icon:ic}))}
                        style={{ width:36, height:36, fontSize:"1.32rem", borderRadius:"var(--r-sm)", border:`2px solid ${editForm.icon===ic?"var(--copper)":"var(--line)"}`, background:editForm.icon===ic?"var(--copper-bg)":"transparent", cursor:"pointer" }}>
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="field-label">主題色</label>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:".3rem" }}>
                    {COLOR_OPTIONS.map(col=>(
                      <button key={col} onClick={()=>setEditForm(p=>({...p,color:col}))}
                        style={{ width:24, height:24, borderRadius:"50%", background:col, border:`3px solid ${editForm.color===col?"var(--ink)":"transparent"}`, cursor:"pointer" }}/>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".7rem" }}>
                <div><label className="field-label">姓名 *</label><input value={editForm.name||""} onChange={e=>setEditForm(p=>({...p,name:e.target.value}))} placeholder="設計師姓名" className="field-input"/></div>
                <div><label className="field-label">職稱</label><input value={editForm.title||""} onChange={e=>setEditForm(p=>({...p,title:e.target.value}))} placeholder="例：剪髮設計師" className="field-input"/></div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".7rem" }}>
                <div><label className="field-label">年資</label><input value={editForm.exp||""} onChange={e=>setEditForm(p=>({...p,exp:e.target.value}))} placeholder="例：5年" className="field-input"/></div>
              </div>
              <div><label className="field-label">個人簡介</label><textarea value={editForm.bio||""} onChange={e=>setEditForm(p=>({...p,bio:e.target.value}))} placeholder="簡短介紹" className="field-input" rows={3} style={{ resize:"vertical" }}/></div>
              <div>
                <label className="field-label">專項服務（勾選）</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:".35rem" }}>
                  {SERVICES.map(svc=>{
                    const on = (editForm.specialty||[]).includes(svc.zh);
                    return (
                      <button key={svc.id} onClick={()=>setEditForm(p=>({...p,specialty: on?p.specialty.filter(s=>s!==svc.zh):[...p.specialty,svc.zh]}))}
                        style={{ padding:".28rem .65rem", borderRadius:20, fontSize:".84rem", border:`1px solid ${on?"var(--copper)":"var(--line)"}`, background:on?"var(--copper-bg)":"var(--card)", color:on?"var(--copper)":"var(--ink2)", cursor:"pointer" }}>
                        {svc.icon} {svc.zh}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display:"flex", gap:".6rem", paddingTop:".4rem" }}>
                <button onClick={saveEditStylist} disabled={!editForm.name?.trim()} className="btn-copper"
                  style={{ flex:1, opacity:editForm.name?.trim()?1:.38, cursor:editForm.name?.trim()?"pointer":"not-allowed" }}>
                  儲存變更
                </button>
                <button onClick={()=>setEditStylistId(null)} className="btn-ghost" style={{ flex:"0 0 auto", padding:".72rem 1.2rem" }}>取消</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header: add stylist button */}
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:"1rem" }}>
        <button onClick={()=>setShowAdd(true)} className="btn-copper" style={{ padding:".38rem .9rem", fontSize:".87rem", letterSpacing:".08em" }}>
          ＋ 新增設計師
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:"1rem" }}>
        {stylists.map(st => {
          const eff          = stylistMgr?.getEffective ? stylistMgr.getEffective(st) : { photo:null, workDays:st.workDays, holidays:[] };
          const isWorkToday  = isStylistAvailable(st, today, stylistMgr?.settings);
          const todayCount   = bookings.filter(b=>b.stylistId===st.id&&b.date===todayStr&&b.status!=="cancelled").length;
          const totalCount   = bookings.filter(b=>b.stylistId===st.id&&b.status!=="cancelled").length;
          const isEditing    = editId === st.id;
          const upcomingHols = eff.holidays.filter(d => d >= todayStr).slice(0, 5);

          const handlePhotoUpload = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => stylistMgr?.setPhoto(st.id, ev.target.result);
            reader.readAsDataURL(file);
          };

          const toggleWorkDay = (day) => {
            const cur = [...eff.workDays];
            const idx = cur.indexOf(day);
            if (idx >= 0) cur.splice(idx,1); else cur.push(day);
            stylistMgr?.setWorkDays(st.id, cur.sort((a,b)=>a-b));
          };

          const handleAddHoliday = () => {
            if (!holidayInput) return;
            stylistMgr?.addHoliday(st.id, holidayInput);
            setHolidayInput("");
          };

          const handleEditSpecialty = (svcName) => {
            const cur = st.specialty || [];
            const next = cur.includes(svcName) ? cur.filter(s=>s!==svcName) : [...cur, svcName];
            stylistsMgr?.updateStylist(st.id, { specialty: next });
          };

          return (
            <div key={st.id} style={{ background:"var(--card)", border:`1px solid rgba(${hexToRgb(st.color||"#c4835a")},.2)`, borderRadius:"var(--r)", overflow:"hidden", boxShadow:"var(--shadow)" }}>
              {/* Header */}
              <div style={{ padding:"1rem", background:`rgba(${hexToRgb(st.color||"#c4835a")},.05)`, borderBottom:"1px solid var(--line)" }}>
                <div style={{ display:"flex", alignItems:"center", gap:".9rem" }}>
                  {/* Photo */}
                  <div style={{ position:"relative", flexShrink:0 }}>
                    <div style={{ width:60, height:60, borderRadius:"50%", overflow:"hidden", border:`2px solid rgba(${hexToRgb(st.color||"#c4835a")},.3)`, background:`rgba(${hexToRgb(st.color||"#c4835a")},.08)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {eff.photo ? <img src={eff.photo} alt={st.name} style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <span style={{ fontSize:"1.95rem", lineHeight:1 }}>{st.icon||"💇"}</span>}
                    </div>
                    <label style={{ position:"absolute", bottom:0, right:-2, width:20, height:20, borderRadius:"50%", background:st.color||"var(--copper)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:"1.32rem", color:"#fff", border:"2px solid #fff" }} title="上傳照片">
                      ＋<input type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhotoUpload}/>
                    </label>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.32rem", fontWeight:500, color:"var(--ink)" }}>{st.name}</div>
                    <div style={{ fontSize:".86rem", color:st.color||"var(--copper)" }}>{st.title}{st.exp?` · ${st.exp}經驗`:""}</div>
                    <div style={{ marginTop:".28rem" }}>
                      <span style={{ padding:".12rem .5rem", borderRadius:20, fontSize:".70rem", background:isWorkToday?"rgba(160,196,184,.15)":"rgba(196,160,160,.1)", color:isWorkToday?"#5a9a8a":"#a06060", border:`1px solid ${isWorkToday?"rgba(160,196,184,.3)":"rgba(196,160,160,.25)"}` }}>
                        {isWorkToday?"今日上班":"今日休假"}
                      </span>
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:".4rem" }}>
                    <button onClick={()=>setEditId(isEditing?null:st.id)}
                      style={{ padding:".28rem .7rem", borderRadius:20, fontSize:".84rem", background:isEditing?`rgba(${hexToRgb(st.color||"#c4835a")},.12)`:"rgba(0,0,0,.04)", color:isEditing?st.color||"var(--copper)":"var(--ink3)", border:`1px solid ${isEditing?`rgba(${hexToRgb(st.color||"#c4835a")},.35)`:"var(--line)"}`, cursor:"pointer" }}>
                      {isEditing?"完成":"✏ 排班"}
                    </button>
                    {stylistsMgr && (
                      <button onClick={()=>openEditStylist(st)}
                        style={{ padding:".28rem .7rem", borderRadius:20, fontSize:".72rem", background:"rgba(196,131,90,.08)", color:"var(--copper)", border:"1px solid rgba(196,131,90,.25)", cursor:"pointer" }}>
                        ✎ 編輯
                      </button>
                    )}
                    {stylistsMgr && (
                      <button onClick={()=>{
                        const isOriginal = !st.id.startsWith("st_");
                        const msg = isOriginal
                          ? `確定刪除預設設計師 ${st.name}？`
                          : `確定刪除 ${st.name}？`;
                        if(confirm(msg)) stylistsMgr.deleteStylist(st.id);
                      }}
                        style={{ padding:".28rem .7rem", borderRadius:20, fontSize:".72rem", background:"rgba(196,100,100,.08)", color:"#c46060", border:"1px solid rgba(196,100,100,.25)", cursor:"pointer" }}>
                        🗑 刪除
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio */}
              {st.bio && <div style={{ padding:".75rem 1rem", borderBottom:"1px solid var(--line)", fontSize:".71rem", color:"var(--ink2)", lineHeight:1.75 }}>{st.bio}</div>}

              {/* Specialty — editable */}
              <div style={{ padding:".65rem 1rem", borderBottom:"1px solid var(--line)" }}>
                <div style={{ fontSize:".64rem", letterSpacing:".2em", color:"var(--ink3)", textTransform:"uppercase", marginBottom:".42rem" }}>
                  {isEditing ? "點擊切換專項服務" : "專項服務"}
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:".24rem" }}>
                  {SERVICES.map(svc=>{
                    const on = (st.specialty||[]).includes(svc.zh);
                    return (
                      <span key={svc.id} onClick={()=>isEditing&&handleEditSpecialty(svc.zh)}
                        style={{ fontSize:".84rem", padding:".1rem .42rem", borderRadius:20, background:on?`rgba(${hexToRgb(st.color||"#c4835a")},.08)`:"rgba(0,0,0,.04)", color:on?st.color||"var(--copper)":"var(--ink4)", border:`1px solid ${on?`rgba(${hexToRgb(st.color||"#c4835a")},.2)`:"var(--line)"}`, cursor:isEditing?"pointer":"default", opacity:on||isEditing?1:.5, transition:"all .15s" }}>
                        {svc.icon} {svc.zh}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Work days */}
              <div style={{ padding:".65rem 1rem", borderBottom:"1px solid var(--line)" }}>
                <div style={{ fontSize:".64rem", letterSpacing:".2em", color:"var(--ink3)", textTransform:"uppercase", marginBottom:".42rem" }}>
                  {isEditing?"點擊切換上班日":"常規上班日"}
                </div>
                <div style={{ display:"flex", gap:".28rem" }}>
                  {["日","一","二","三","四","五","六"].map((d,i)=>{
                    const on = eff.workDays.includes(i);
                    return (
                      <div key={i} onClick={()=>isEditing&&toggleWorkDay(i)}
                        style={{ width:28, height:28, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".86rem", fontWeight:on?600:400, background:on?`rgba(${hexToRgb(st.color||"#c4835a")},.15)`:"rgba(0,0,0,.04)", color:on?st.color||"var(--copper)":"var(--ink4)", border:`1px solid ${on?`rgba(${hexToRgb(st.color||"#c4835a")},.4)`:"var(--line)"}`, cursor:isEditing?"pointer":"default", transition:"all .15s" }}>
                        {d}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Holiday editor */}
              {upcomingHols.length > 0 && !isEditing && (
                <div style={{ padding:".65rem 1rem", borderBottom:"1px solid var(--line)" }}>
                  <div style={{ fontSize:".64rem", letterSpacing:".2em", color:"var(--ink3)", textTransform:"uppercase", marginBottom:".38rem" }}>特休日期</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:".28rem" }}>
                    {upcomingHols.map(d=>(
                      <span key={d} style={{ fontSize:".86rem", padding:".12rem .5rem", borderRadius:20, background:"rgba(196,160,160,.1)", color:"#c46060", border:"1px solid rgba(196,160,160,.25)" }}>{d}</span>
                    ))}
                  </div>
                </div>
              )}
              {isEditing && (
                <div style={{ padding:".8rem 1rem", borderBottom:"1px solid var(--line)", background:"#faf8f5" }}>
                  <div style={{ fontSize:".64rem", letterSpacing:".2em", color:"var(--ink3)", textTransform:"uppercase", marginBottom:".5rem" }}>新增特休日期</div>
                  <div style={{ display:"flex", gap:".5rem", marginBottom:".55rem", flexWrap:"wrap" }}>
                    <input type="date" value={holidayInput} onChange={e=>setHolidayInput(e.target.value)}
                      style={{ padding:".38rem .65rem", border:"1px solid var(--line)", borderRadius:6, fontSize:".87rem", color:"var(--ink)", background:"#fff", outline:"none", flex:1, minWidth:130 }}/>
                    <button onClick={handleAddHoliday} disabled={!holidayInput}
                      style={{ padding:".38rem .9rem", background:"rgba(196,160,160,.12)", border:"1px solid rgba(196,160,160,.35)", borderRadius:6, color:"#c46060", fontSize:".84rem", cursor:holidayInput?"pointer":"not-allowed" }}>
                      ＋ 新增
                    </button>
                  </div>
                  {eff.holidays.length > 0 && (
                    <div style={{ maxHeight:140, overflowY:"auto" }}>
                      {[...eff.holidays].sort().map(d=>(
                        <div key={d} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:".28rem .6rem", borderRadius:6, background:"rgba(196,160,160,.08)", border:"1px solid rgba(196,160,160,.18)", marginBottom:".25rem" }}>
                          <span style={{ fontSize:".94rem", color: d < todayStr ? "var(--ink4)" : "#c46060" }}>
                            {d} {d >= todayStr && `(${["日","一","二","三","四","五","六"][parseDate(d).getDay()]})`}
                          </span>
                          <button onClick={()=>stylistMgr?.removeHoliday(st.id, d)} style={{ background:"none", border:"none", color:"#c46060", cursor:"pointer", fontSize:".87rem", padding:"0 .2rem" }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Stats */}
              <div style={{ padding:".65rem 1rem", display:"flex", gap:"1.2rem" }}>
                <div><div style={{ fontSize:".87rem", color:st.color||"var(--copper)", fontWeight:700 }}>{todayCount}</div><div style={{ fontSize:".64rem", color:"var(--ink3)" }}>今日</div></div>
                <div><div style={{ fontSize:".87rem", color:st.color||"var(--copper)", fontWeight:700 }}>{totalCount}</div><div style={{ fontSize:".64rem", color:"var(--ink3)" }}>總預約</div></div>
                <div><div style={{ fontSize:".87rem", color:"#c46060", fontWeight:700 }}>{eff.holidays.filter(d=>d>=todayStr).length}</div><div style={{ fontSize:".64rem", color:"var(--ink3)" }}>特休</div></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SERVICES MENU
═══════════════════════════════════════════════════════════ */
function ServicesMenu({ isMobile, servicesMgr }) {
  const services   = servicesMgr ? servicesMgr.services : SERVICES;
  const categories = [...new Set(services.map(s=>s.category))];
  const [editId, setEditId]   = useState(null);
  const [draft, setDraft]     = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [newSvc, setNewSvc]   = useState({ zh:"", desc:"", price:"", priceNote:"", duration:45, category:"基本", icon:"✂️", color:"#a0c4b8" });

  const ICON_OPTS = ["✂️","🚿","💆","〰","🎨","✨","💇","💅","🌸","⭐","💎","🔧"];
  const CAT_OPTS  = ["基本","套餐","技術","養護","特殊"];

  const startEdit = (svc) => {
    setEditId(svc.id);
    setDraft({ zh:svc.zh, desc:svc.desc, price:svc.price, priceNote:svc.priceNote||"", duration:svc.duration, category:svc.category, icon:svc.icon, color:svc.color });
  };
  const saveEdit = (id) => {
    servicesMgr?.updateService(id, { ...draft, duration:Number(draft.duration)||30 });
    setEditId(null);
  };
  const handleAdd = () => {
    if (!newSvc.zh.trim()) return;
    const id = "svc_" + Date.now();
    servicesMgr?.addService({ ...newSvc, id, en:newSvc.zh, duration:Number(newSvc.duration)||45 });
    setNewSvc({ zh:"", desc:"", price:"", priceNote:"", duration:45, category:"基本", icon:"✂️", color:"#a0c4b8" });
    setShowAdd(false);
  };

  return (
    <div>
      {/* Google Maps */}
      <div style={{ marginBottom:"1.4rem", borderRadius:10, overflow:"hidden", border:"1px solid var(--line)" }}>
        <div style={{ padding:".65rem 1rem", background:"var(--bg2)", borderBottom:"1px solid var(--line)", display:"flex", alignItems:"center", gap:".6rem" }}>
          <span>📍</span>
          <div>
            <div style={{ fontSize:".9rem", color:"var(--copper)", fontWeight:500 }}>{SALON.name}</div>
            <div style={{ fontSize:".74rem", color:"var(--ink3)" }}>{SALON.address}</div>
          </div>
        </div>
        <iframe title="salon-map"
          src={`https://maps.google.com/maps?q=${encodeURIComponent(SALON.mapQuery)}&output=embed&hl=zh-TW`}
          style={{ width:"100%", height: isMobile?200:280, border:"none", display:"block" }}
          loading="lazy"/>
      </div>

      {/* Header row */}
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:"1rem" }}>
        <button onClick={()=>setShowAdd(true)} className="btn-copper" style={{ padding:".38rem .9rem", fontSize:".78rem", letterSpacing:".08em" }}>
          ＋ 新增服務
        </button>
      </div>

      {/* Add service modal */}
      {showAdd && (
        <div style={{ position:"fixed", inset:0, background:"rgba(28,24,22,.5)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:isMobile?"1rem":"1.5rem" }}
          onClick={e=>{ if(e.target===e.currentTarget)setShowAdd(false); }}>
          <div style={{ background:"var(--card)", borderRadius:"var(--r)", width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(28,24,22,.2)" }}>
            <div style={{ padding:"1rem 1.2rem", borderBottom:"1px solid var(--line)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.15rem", fontWeight:500 }}>新增服務項目</div>
              <button onClick={()=>setShowAdd(false)} style={{ background:"none", border:"none", fontSize:"1.2rem", cursor:"pointer", color:"var(--ink3)" }}>✕</button>
            </div>
            <div style={{ padding:"1rem 1.2rem", display:"flex", flexDirection:"column", gap:".8rem" }}>
              <div>
                <label className="field-label">圖示</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:".35rem" }}>
                  {ICON_OPTS.map(ic=>(
                    <button key={ic} onClick={()=>setNewSvc(p=>({...p,icon:ic}))}
                      style={{ width:36, height:36, fontSize:"1.2rem", borderRadius:"var(--r-sm)", border:`2px solid ${newSvc.icon===ic?"var(--copper)":"var(--line)"}`, background:newSvc.icon===ic?"var(--copper-bg)":"transparent", cursor:"pointer" }}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".7rem" }}>
                <div>
                  <label className="field-label">服務名稱 *</label>
                  <input value={newSvc.zh} onChange={e=>setNewSvc(p=>({...p,zh:e.target.value}))} placeholder="例：護膚" className="field-input"/>
                </div>
                <div>
                  <label className="field-label">分類</label>
                  <select value={newSvc.category} onChange={e=>setNewSvc(p=>({...p,category:e.target.value}))} className="field-input" style={{ cursor:"pointer" }}>
                    {CAT_OPTS.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label">服務描述</label>
                <input value={newSvc.desc} onChange={e=>setNewSvc(p=>({...p,desc:e.target.value}))} placeholder="簡短說明" className="field-input"/>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:".7rem" }}>
                <div>
                  <label className="field-label">定價</label>
                  <input value={newSvc.price} onChange={e=>setNewSvc(p=>({...p,price:e.target.value}))} placeholder="$500" className="field-input"/>
                </div>
                <div>
                  <label className="field-label">備注</label>
                  <input value={newSvc.priceNote} onChange={e=>setNewSvc(p=>({...p,priceNote:e.target.value}))} placeholder="起" className="field-input"/>
                </div>
                <div>
                  <label className="field-label">時間(分鐘)</label>
                  <input type="number" min="5" step="5" value={newSvc.duration} onChange={e=>setNewSvc(p=>({...p,duration:e.target.value}))} className="field-input"/>
                </div>
              </div>
              <button onClick={handleAdd} disabled={!newSvc.zh.trim()} className="btn-copper"
                style={{ opacity:newSvc.zh.trim()?1:.38, cursor:newSvc.zh.trim()?"pointer":"not-allowed" }}>
                確認新增
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service list */}
      {categories.map(cat=>(
        <div key={cat} style={{ marginBottom:"1.4rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:".6rem", marginBottom:".8rem" }}>
            <div style={{ height:1, flex:1, background:"var(--line)" }}/>
            <span style={{ fontSize:".76rem", letterSpacing:".2em", color:"var(--copper)", textTransform:"uppercase", fontWeight:500 }}>{cat}</span>
            <div style={{ height:1, flex:1, background:"var(--line)" }}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:".85rem" }}>
            {services.filter(s=>s.category===cat).map(svc=>{
              const isEditing = editId === svc.id;
              return (
                <div key={svc.id} style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:"var(--r)", boxShadow:"var(--shadow)", overflow:"hidden" }}>
                  {/* View row */}
                  <div style={{ padding:"1rem 1.1rem", display:"flex", gap:".85rem", alignItems:"flex-start" }}>
                    <span style={{ fontSize:"1.6rem", lineHeight:1, flexShrink:0, marginTop:".1rem" }}>{svc.icon}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", marginBottom:".25rem" }}>
                        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1rem", fontWeight:500, color:"var(--ink)" }}>{svc.zh}</span>
                        <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:".95rem", color:"var(--copper)", fontWeight:600, flexShrink:0, marginLeft:".5rem" }}>
                          {svc.price}<span style={{ fontSize:".7em" }}>{svc.priceNote}</span>
                        </span>
                      </div>
                      {svc.desc && <div style={{ fontSize:".74rem", color:"var(--ink3)", lineHeight:1.6, marginBottom:".35rem" }}>{svc.desc}</div>}
                      <div style={{ display:"flex", gap:".6rem", flexWrap:"wrap", alignItems:"center" }}>
                        <span style={{ fontSize:".68rem", color:"var(--ink3)", fontFamily:"'DM Mono',monospace" }}>⏱ {svc.duration}min</span>
                        <span style={{ fontSize:".66rem", color:"var(--ink3)" }}>
                          可服務：{STYLISTS.filter(st=>(st.specialty||[]).includes(svc.zh)).map(st=>st.name).join("・")||"—"}
                        </span>
                      </div>
                    </div>
                    {servicesMgr && (
                      <div style={{ display:"flex", flexDirection:"column", gap:".3rem", flexShrink:0 }}>
                        <button onClick={()=>isEditing?saveEdit(svc.id):startEdit(svc)}
                          style={{ padding:".22rem .6rem", borderRadius:20, fontSize:".7rem", border:`1px solid ${isEditing?"var(--copper)":"var(--line)"}`, background:isEditing?"var(--copper-bg)":"transparent", color:isEditing?"var(--copper)":"var(--ink3)", cursor:"pointer", whiteSpace:"nowrap" }}>
                          {isEditing ? "✓ 儲存" : "✏ 編輯"}
                        </button>
                        {svc.id.startsWith("svc_") && (
                          <button onClick={()=>{ if(confirm(`刪除「${svc.zh}」？`)) servicesMgr.deleteService(svc.id); }}
                            style={{ padding:".22rem .6rem", borderRadius:20, fontSize:".7rem", border:"1px solid rgba(196,100,100,.25)", background:"rgba(196,100,100,.06)", color:"#c46060", cursor:"pointer" }}>
                            🗑 刪除
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Edit panel */}
                  {isEditing && (
                    <div style={{ padding:".8rem 1rem 1rem", borderTop:"1px solid var(--line)", background:"var(--bg2)" }}>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".55rem", marginBottom:".55rem" }}>
                        <div>
                          <label style={{ display:"block", fontSize:".66rem", color:"var(--ink3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:".2rem" }}>服務名稱</label>
                          <input value={draft.zh} onChange={e=>setDraft(p=>({...p,zh:e.target.value}))}
                            className="field-input" style={{ fontSize:".85rem" }}/>
                        </div>
                        <div>
                          <label style={{ display:"block", fontSize:".66rem", color:"var(--ink3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:".2rem" }}>圖示</label>
                          <select value={draft.icon} onChange={e=>setDraft(p=>({...p,icon:e.target.value}))} className="field-input" style={{ fontSize:"1rem", cursor:"pointer" }}>
                            {ICON_OPTS.map(ic=><option key={ic} value={ic}>{ic}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{ marginBottom:".55rem" }}>
                        <label style={{ display:"block", fontSize:".66rem", color:"var(--ink3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:".2rem" }}>描述</label>
                        <input value={draft.desc} onChange={e=>setDraft(p=>({...p,desc:e.target.value}))}
                          className="field-input" style={{ fontSize:".85rem" }} placeholder="服務說明"/>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:".55rem", marginBottom:".55rem" }}>
                        <div style={{ gridColumn:"1/3" }}>
                          <label style={{ display:"block", fontSize:".66rem", color:"var(--ink3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:".2rem" }}>定價</label>
                          <input value={draft.price} onChange={e=>setDraft(p=>({...p,price:e.target.value}))}
                            className="field-input" style={{ fontSize:".85rem" }} placeholder="$350"/>
                        </div>
                        <div>
                          <label style={{ display:"block", fontSize:".66rem", color:"var(--ink3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:".2rem" }}>備注</label>
                          <input value={draft.priceNote} onChange={e=>setDraft(p=>({...p,priceNote:e.target.value}))}
                            className="field-input" style={{ fontSize:".85rem" }} placeholder="起"/>
                        </div>
                        <div>
                          <label style={{ display:"block", fontSize:".66rem", color:"var(--ink3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:".2rem" }}>分鐘</label>
                          <input type="number" min="5" step="5" value={draft.duration} onChange={e=>setDraft(p=>({...p,duration:e.target.value}))}
                            className="field-input" style={{ fontSize:".85rem" }}/>
                        </div>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:".55rem" }}>
                        <div>
                          <label style={{ display:"block", fontSize:".66rem", color:"var(--ink3)", letterSpacing:".08em", textTransform:"uppercase", marginBottom:".2rem" }}>分類</label>
                          <select value={draft.category} onChange={e=>setDraft(p=>({...p,category:e.target.value}))} className="field-input" style={{ cursor:"pointer", fontSize:".85rem" }}>
                            {CAT_OPTS.map(cat=><option key={cat}>{cat}</option>)}
                          </select>
                        </div>
                        <div style={{ display:"flex", alignItems:"flex-end" }}>
                          <button onClick={()=>setEditId(null)} className="btn-ghost" style={{ width:"100%", padding:".42rem .6rem", fontSize:".78rem" }}>取消</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BOOKING CARD (shared)
═══════════════════════════════════════════════════════════ */
function BookingCard({ booking, onUpdateStatus, onDelete, isMobile, lineSettings, stylistSettings, stylists=DEFAULT_STYLISTS }) {
  const svc   = SERVICES.find(s=>s.id===booking.serviceId);
  const st    = stylists.find(s=>s.id===booking.stylistId);
  const photo = stylistSettings?.[st?.id]?.photo;
  const [confirm, setConfirm]     = useState(false);
  const [lineStatus, setLineStatus] = useState(null); // null | "sending" | "ok" | "err"
  const [lineMsg, setLineMsg]     = useState("");

  const handleLineNotify = async (type) => {
    setLineStatus("sending");
    const res = await sendLINENotify({
      webhookUrl: lineSettings?.webhookUrl,
      type, booking, svc, stylist:st,
    });
    setLineStatus(res.ok ? "ok" : "err");
    setLineMsg(res.msg || "");
    setTimeout(() => setLineStatus(null), 3500);
  };

  return (
    <div style={{ background:"#ffffff", border:`1px solid rgba(${hexToRgb(st?.color||"var(--copper)")},.35)`, borderRadius:8, overflow:"hidden", marginBottom:".6rem" }}>
      <div style={{ padding:".7rem .9rem", display:"flex", alignItems:"center", gap:".7rem", background:`rgba(${hexToRgb(st?.color||"var(--copper)")},.05)`, borderBottom:"1px solid rgba(0,0,0,.04)", flexWrap:"wrap" }}>
        <div style={{ display:"flex", alignItems:"center", gap:".5rem" }}>
          {photo
            ? <img src={photo} alt={st?.name} style={{ width:22, height:22, borderRadius:"50%", objectFit:"cover", border:`1px solid rgba(${hexToRgb(st?.color||"#c8a97e")},.3)`, flexShrink:0 }}/>
            : <span style={{ fontSize:"1.38rem" }}>{st?.icon}</span>
          }
          <span style={{ fontSize:"1.32rem" }}>{svc?.icon}</span>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:".94rem", color:"var(--ink)", fontWeight:600 }}>{svc?.zh}</div>
          <div style={{ fontSize:".86rem", color:st?.color }}>{st?.icon} {st?.name} · {booking.time}</div>
        </div>
        <span style={{ padding:".12rem .5rem", borderRadius:20, fontSize:".70rem", background:`rgba(${hexToRgb(STATUS_COLOR[booking.status])},.12)`, color:STATUS_COLOR[booking.status], border:`1px solid rgba(${hexToRgb(STATUS_COLOR[booking.status])},.25)` }}>
          {STATUS_LABEL[booking.status]}
        </span>
      </div>
      <div style={{ padding:".65rem .9rem", display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:".3rem .8rem" }}>
        {[
          ["顧客", booking.customerName],
          ["電話", booking.customerPhone],
          ...(booking.lineId?[["LINE ID", booking.lineId]]:[]),
          ["日期", displayDate(booking.date)],
          ["費用", `${svc?.price}${svc?.priceNote||""}`],
          ...(booking.notes?[["備注", booking.notes]]:[]),
        ].map(([k,v])=>(
          <div key={k} style={{ display:"flex", gap:".4rem", fontSize:".84rem" }}>
            <span style={{ color:"#999999", flexShrink:0 }}>{k}：</span>
            <span style={{ color: k==="LINE ID"?"#06C755":"#555555" }}>{v}</span>
          </div>
        ))}
      </div>
      {/* Actions */}
      {!confirm && (
        <div style={{ padding:".5rem .9rem", borderTop:"1px solid rgba(0,0,0,.04)", display:"flex", gap:".4rem", flexWrap:"wrap" }}>
          {booking.status==="pending" && (
            <button onClick={()=>onUpdateStatus(booking.id,"confirmed")} style={{ ...actionBtn, borderColor:"rgba(160,196,184,.4)", color:"#a0c4b8" }}>✓ 確認</button>
          )}
          {booking.status==="confirmed" && (
            <button onClick={()=>onUpdateStatus(booking.id,"pending")} style={{ ...actionBtn, borderColor:"rgba(196,188,154,.3)", color:"#c4bc9a" }}>待確認</button>
          )}
          {booking.status!=="cancelled" && (
            <button onClick={()=>onUpdateStatus(booking.id,"cancelled")} style={{ ...actionBtn, borderColor:"rgba(196,160,160,.3)", color:"#c4a0a0" }}>✕ 取消</button>
          )}
          <button onClick={()=>setConfirm(true)} style={{ ...actionBtn, borderColor:"rgba(196,160,160,.2)", color:"#6a4a4a" }}>刪除</button>
        </div>
      )}
      {/* LINE Notify row */}
      {!confirm && lineSettings?.webhookUrl && (
        <div style={{ padding:".45rem .9rem", borderTop:"1px solid rgba(6,199,85,.08)", display:"flex", alignItems:"center", gap:".4rem", flexWrap:"wrap", background:"#f5fbf7" }}>
          <span style={{ fontSize:".70rem", color:"rgba(6,199,85,.6)" }}>💬 LINE通知</span>
          {["confirm","reminder","cancel"].map(type=>{
            const labels = { confirm:"✓ 確認通知", reminder:"⏰ 提醒通知", cancel:"✕ 取消通知" };
            const colors = { confirm:"rgba(160,196,184,.5)", reminder:"rgba(196,188,154,.5)", cancel:"rgba(196,160,160,.5)" };
            return (
              <button key={type}
                disabled={lineStatus==="sending"}
                onClick={()=>handleLineNotify(type)}
                style={{ ...actionBtn, borderColor:colors[type], color:lineStatus==="sending"?"#4a4a4a":type==="confirm"?"#a0c4b8":type==="reminder"?"#c4bc9a":"#c4a0a0" }}>
                {labels[type]}
              </button>
            );
          })}
          {lineStatus==="sending" && <span style={{ fontSize:".84rem", color:"rgba(6,199,85,.7)" }}>發送中…</span>}
          {lineStatus==="ok"      && <span style={{ fontSize:".84rem", color:"#06C755" }}>✓ 已發送</span>}
          {lineStatus==="err"     && <span style={{ fontSize:".84rem", color:"#c4a0a0" }}>✕ {lineMsg}</span>}
        </div>
      )}
      {confirm && (
        <div style={{ padding:".5rem .9rem", borderTop:"1px solid rgba(0,0,0,.04)", display:"flex", alignItems:"center", gap:".6rem", background:"rgba(196,160,160,.05)" }}>
          <span style={{ fontSize:".94rem", color:"#c4a0a0", flex:1 }}>確定要刪除此預約？</span>
          <button onClick={()=>{ onDelete(booking.id); setConfirm(false); }} style={{ ...actionBtn, borderColor:"rgba(196,160,160,.5)", color:"#c4a0a0" }}>確定刪除</button>
          <button onClick={()=>setConfirm(false)} style={{ ...actionBtn }}>取消</button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SHARED STYLE HELPERS
═══════════════════════════════════════════════════════════ */
function hexToRgb(hex) {
  if (!hex || !hex.startsWith("#")) return "200,169,126";
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

const h2Style = { fontFamily:"'Playfair Display',serif", fontSize:"1.55rem", fontWeight:500, color:"var(--ink)", marginBottom:"1.2rem", letterSpacing:".01em" };
const arrowBtn = { background:"rgba(0,0,0,.04)", border:"1px solid rgba(0,0,0,.1)", color:"var(--copper)", width:32, height:32, borderRadius:"50%", cursor:"pointer", fontSize:"1.32rem", display:"flex", alignItems:"center", justifyContent:"center", touchAction:"manipulation", WebkitTapHighlightColor:"transparent" };
const primaryBtn = { padding:".75rem 1.8rem", background:"var(--copper)", border:"1px solid var(--copper)", color:"#ffffff", borderRadius:"var(--r-sm)", cursor:"pointer", fontFamily:"'Cormorant Garamond',serif", fontSize:"1.32rem", letterSpacing:".18em", touchAction:"manipulation", WebkitTapHighlightColor:"transparent", transition:"all .22s" };
const actionBtn = { padding:".22rem .65rem", background:"transparent", border:"1px solid rgba(0,0,0,.1)", color:"#888888", borderRadius:4, cursor:"pointer", fontSize:".86rem", touchAction:"manipulation", WebkitTapHighlightColor:"transparent" };

function NavBtns({ onBack, onNext, nextDisabled, nextLabel="下一步 →", isMobile }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", marginTop:"2rem", gap:".6rem" }}>
      {onBack
        ? <button onClick={onBack} className="btn-ghost" style={{ padding:isMobile?".65rem 1.1rem":".72rem 1.5rem" }}>← 返回</button>
        : <div/>
      }
      {onNext && (
        <button disabled={nextDisabled} onClick={onNext}
          className="btn-copper"
          style={{ opacity:nextDisabled?.38:1, cursor:nextDisabled?"not-allowed":"pointer", padding:isMobile?".7rem 1.5rem":".75rem 2.2rem", fontSize:isMobile?".88rem":"1rem" }}>
          {nextLabel}
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CUSTOMERS VIEW
═══════════════════════════════════════════════════════════ */
function CustomersView({ customers, onDelete, bookings, isMobile }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const list = Object.entries(customers)
    .map(([key, c]) => ({ key, ...c }))
    .filter(c => !search || c.name?.includes(search) || c.phone?.includes(search))
    .sort((a,b) => (b.lastVisit||"").localeCompare(a.lastVisit||""));

  const sel = selected ? customers[selected] : null;

  return (
    <div>
      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:".75rem", marginBottom:"1.4rem" }}>
        {[
          { label:"總客戶數", value:Object.keys(customers).length, color:"var(--copper)" },
          { label:"本月到訪", value:Object.values(customers).filter(c=>c.lastVisit?.startsWith(new Date().toISOString().slice(0,7))).length, color:"#7a9aaa" },
          { label:"累計預約", value:Object.values(customers).reduce((s,c)=>s+(c.visits||0),0), color:"#a0c4b8" },
        ].map(s=>(
          <div key={s.label} style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:"var(--r)", padding:"1rem", textAlign:"center", boxShadow:"var(--shadow)" }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.85rem", fontWeight:500, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:".84rem", color:"var(--ink3)", marginTop:".3rem", letterSpacing:".06em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position:"relative", marginBottom:"1rem" }}>
        <span style={{ position:"absolute", left:".8rem", top:"50%", transform:"translateY(-50%)", fontSize:"1.32rem", pointerEvents:"none" }}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="搜尋姓名或電話…"
          className="field-input" style={{ paddingLeft:"2.2rem" }}/>
      </div>

      {list.length === 0 && (
        <div style={{ textAlign:"center", padding:"3rem 1rem", color:"var(--ink3)", fontSize:".94rem", background:"var(--bg2)", borderRadius:"var(--r)", border:"1px solid var(--line)" }}>
          {search ? "找不到符合的客戶" : "尚無客戶資料，完成第一筆預約後自動建立"}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:".75rem" }}>
        {list.map(cu => {
          const isSel = selected === cu.key;
          return (
            <div key={cu.key} style={{ background:"var(--card)", border:`1px solid ${isSel?"var(--copper)":"var(--line)"}`, borderRadius:"var(--r)", overflow:"hidden", boxShadow:isSel?"0 0 0 3px var(--copper-bg), var(--shadow)":"var(--shadow)", transition:"all .2s", cursor:"pointer" }}
              onClick={()=>setSelected(isSel?null:cu.key)}>
              {/* Card header */}
              <div style={{ padding:".85rem 1rem", display:"flex", alignItems:"center", gap:".75rem" }}>
                <div style={{ width:40, height:40, borderRadius:"50%", background:"var(--copper-bg)", border:"1px solid var(--copper-bd)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.32rem", color:"var(--copper)", fontWeight:600 }}>{(cu.name||"?")[0]}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.32rem", fontWeight:500, color:"var(--ink)" }}>{cu.name}</div>
                  <div style={{ fontSize:"1.32rem", color:"var(--ink3)", marginTop:".1rem", fontFamily:"'DM Mono',monospace" }}>{cu.phone}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:".86rem", color:"var(--copper)", fontWeight:600 }}>{cu.visits||0} 次</div>
                  <div style={{ fontSize:".70rem", color:"var(--ink3)" }}>到訪</div>
                </div>
              </div>
              {/* Tags */}
              <div style={{ padding:".5rem 1rem", borderTop:"1px solid var(--line)", display:"flex", gap:".4rem", flexWrap:"wrap", alignItems:"center" }}>
                <span style={{ fontSize:".84rem", color:"var(--ink3)" }}>最後到訪 {cu.lastVisit||"—"}</span>
                {cu.lineId && <span style={{ fontSize:".70rem", padding:".1rem .45rem", borderRadius:20, background:"rgba(6,199,85,.08)", color:"#06C755", border:"1px solid rgba(6,199,85,.2)" }}>LINE</span>}
                {(cu.totalSpend||0)>0 && <span style={{ fontSize:".84rem", color:"var(--copper)", marginLeft:"auto", fontFamily:"'Cormorant Garamond',serif", fontWeight:600 }}>${(cu.totalSpend||0).toLocaleString()}</span>}
              </div>
              {/* Expanded history */}
              {isSel && cu.history?.length > 0 && (
                <div style={{ borderTop:"1px solid var(--line)", background:"var(--bg)" }}>
                  <div style={{ padding:".6rem 1rem .35rem", fontSize:"1.32rem", letterSpacing:".18em", color:"var(--ink3)", textTransform:"uppercase" }}>消費紀錄</div>
                  <div style={{ maxHeight:200, overflowY:"auto" }}>
                    {cu.history.map((h,i)=>(
                      <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:".42rem 1rem", borderBottom:"1px solid var(--line)", fontSize:".84rem" }}>
                        <div>
                          <span style={{ color:"var(--ink)", fontWeight:500 }}>{h.service}</span>
                          <span style={{ color:"var(--ink3)", marginLeft:".5rem" }}>✂ {h.stylist}</span>
                        </div>
                        <span style={{ color:"var(--ink3)", fontFamily:"'DM Mono',monospace", fontSize:".86rem" }}>{h.date} {h.time}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding:".65rem 1rem", display:"flex", justifyContent:"flex-end" }}>
                    <button onClick={e=>{e.stopPropagation();if(confirm("確定刪除此客戶資料？"))onDelete(cu.key);}}
                      style={{ padding:".28rem .7rem", background:"rgba(196,100,100,.08)", border:"1px solid rgba(196,100,100,.25)", borderRadius:"var(--r-sm)", fontSize:".86rem", color:"#c46060", cursor:"pointer" }}>
                      刪除客戶
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   LINE SETTINGS VIEW
═══════════════════════════════════════════════════════════ */
function LINESettingsView({ settings, onSave, bookings, isMobile, adminAuth }) {
  const [form, setForm] = useState({ ...settings });
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState(null);

  const handleSave = async () => {
    await onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTestStatus("testing");
    const res = await sendLINENotify({
      webhookUrl: form.webhookUrl,
      type: "test",
      booking: { customerName:"測試顧客", customerPhone:"0900-000-000", lineId:"", date: new Date().toISOString().slice(0,10), time:"10:00", notes:"這是測試通知" },
      svc: { zh:"剪髮", duration:45, price:"$350", priceNote:"" },
      stylist: { name:"獻爸" },
    });
    setTestStatus(res.ok ? "ok" : "err:" + res.msg);
    setTimeout(() => setTestStatus(null), 4000);
  };

  const hasLineCustomers = bookings.filter(b => b.lineId).length;
  const pendingNotify    = bookings.filter(b => b.status === "pending" && b.lineId).length;

  const inputStyle = {
    width:"100%", padding:".65rem .85rem",
    background:"rgba(0,0,0,.04)", border:"1px solid rgba(0,0,0,.1)",
    borderRadius:6, color:"var(--ink)", fontSize:".94rem", outline:"none",
    fontFamily:"'DM Sans',sans-serif", transition:"border-color .2s",
  };

  return (
    <div>
      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:".6rem", marginBottom:"1.4rem" }}>
        {[
          { label:"LINE 顧客", value:hasLineCustomers, color:"#06C755" },
          { label:"待通知",    value:pendingNotify,    color:"#c4bc9a" },
          { label:"Webhook",   value:form.webhookUrl?"已設定":"未設定", color:form.webhookUrl?"#a0c4b8":"#888888" },
        ].map(s=>(
          <div key={s.label} style={{ padding:".85rem .9rem", background:"rgba(255,255,255,1)", border:"1px solid rgba(0,0,0,.08)", borderRadius:8, textAlign:"center" }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"1.6rem", fontWeight:500, color:s.color, lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:".84rem", color:"#999999", marginTop:".3rem" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Setup card */}
      <div style={{ background:"#ffffff", border:"1px solid rgba(6,199,85,.4)", borderRadius:10, overflow:"hidden", marginBottom:"1rem" }}>
        <div style={{ padding:".65rem 1rem", background:"#f0faf4", borderBottom:"1px solid rgba(6,199,85,.2)", display:"flex", alignItems:"center", gap:".6rem" }}>
          <span style={{ fontSize:"1.32rem" }}>⚙️</span>
          <div>
            <div style={{ fontSize:".94rem", fontWeight:600, color:"var(--ink)" }}>LINE 通知設定</div>
            <div style={{ fontSize:".84rem", color:"#999999" }}>需搭配 line-server.js 部署至 Railway</div>
          </div>
        </div>
        <div style={{ padding:"1rem 1.1rem" }}>
          <div style={{ marginBottom:".85rem" }}>
            <label style={{ display:"block", fontSize:".86rem", color:"#666666", marginBottom:".35rem", letterSpacing:".08em" }}>
              Webhook URL <span style={{ color:"rgba(6,199,85,.8)" }}>*</span>
            </label>
            <input value={form.webhookUrl} onChange={e=>setForm(p=>({...p,webhookUrl:e.target.value}))}
              placeholder="https://your-app.railway.app" style={inputStyle}/>
            <div style={{ fontSize:".70rem", color:"#999999", marginTop:".25rem" }}>部署 line-server.js 後取得的網址</div>
          </div>
          <div style={{ marginBottom:"1rem" }}>
            <label style={{ display:"block", fontSize:".86rem", color:"#666666", marginBottom:".35rem", letterSpacing:".08em" }}>
              LINE OA ID（含@）
            </label>
            <input value={SALON.lineOaId} readOnly
              style={{ ...inputStyle, color:"#999999", cursor:"default" }}/>
            <div style={{ fontSize:".70rem", color:"#999999", marginTop:".25rem" }}>在 SALON 常數中設定，此為唯讀</div>
          </div>
          <div style={{ display:"flex", gap:".6rem" }}>
            <button onClick={handleSave}
              style={{ flex:1, padding:".65rem", background:saved?"rgba(6,199,85,.15)":"rgba(6,199,85,.08)", border:`1px solid rgba(6,199,85,${saved?".6":".35"})`, color:saved?"#06C755":"#5a6a5a", borderRadius:6, cursor:"pointer", fontSize:"1.32rem", transition:"all .2s" }}>
              {saved ? "✓ 已儲存" : "儲存設定"}
            </button>
            <button onClick={handleTest} disabled={!form.webhookUrl}
              style={{ padding:".65rem 1.1rem", background:"transparent", border:"1px solid rgba(0,0,0,.1)", color:"#888888", borderRadius:6, cursor:form.webhookUrl?"pointer":"not-allowed", fontSize:"1.32rem" }}>
              {testStatus==="testing" ? "測試中…" : testStatus?.startsWith("err") ? "✕ "+testStatus.slice(4) : testStatus==="ok" ? "✓ 成功" : "測試連線"}
            </button>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ background:"rgba(0,0,0,.02)", border:"1px solid rgba(0,0,0,.08)", borderRadius:10, overflow:"hidden", marginBottom:"1rem" }}>
        <div style={{ padding:".65rem 1rem", borderBottom:"1px solid rgba(0,0,0,.05)", fontSize:".86rem", letterSpacing:".15em", color:"#666666", textTransform:"uppercase" }}>運作流程</div>
        <div style={{ padding:".9rem 1rem" }}>
          {[
            { step:"1", icon:"📱", title:"顧客預約時填入 LINE ID", desc:"預約表單新增選填欄位「LINE ID」（@xxxxxx 格式），顧客自願填寫" },
            { step:"2", icon:"🔗", title:"管理後台點擊通知按鈕", desc:"在行事曆或管理頁面，每張預約卡片底部有「確認通知 / 提醒通知 / 取消通知」三個按鈕" },
            { step:"3", icon:"🖥", title:"Webhook 中繼至 LINE", desc:"請求送至你部署的 line-server.js，由伺服器端以 Channel Access Token 呼叫 LINE Messaging API" },
            { step:"4", icon:"💬", title:"顧客 LINE 收到 Flex Message", desc:"顧客的 LINE 收到精美的確認卡片，含服務/設計師/時間/費用資訊" },
          ].map(s=>(
            <div key={s.step} style={{ display:"flex", gap:".7rem", alignItems:"flex-start", marginBottom:".75rem" }}>
              <div style={{ width:26, height:26, borderRadius:"50%", background:"rgba(6,199,85,.1)", border:"1px solid rgba(6,199,85,.25)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".86rem", color:"#06C755", flexShrink:0 }}>{s.step}</div>
              <div>
                <div style={{ display:"flex", alignItems:"center", gap:".4rem", marginBottom:".18rem" }}>
                  <span>{s.icon}</span>
                  <span style={{ fontSize:"1.32rem", fontWeight:600, color:"var(--ink)" }}>{s.title}</span>
                </div>
                <div style={{ fontSize:"1.32rem", color:"#777777", lineHeight:1.65 }}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LINE customers list */}
      {hasLineCustomers > 0 && (
        <div style={{ background:"rgba(0,0,0,.02)", border:"1px solid rgba(6,199,85,.12)", borderRadius:10, overflow:"hidden" }}>
          <div style={{ padding:".65rem 1rem", borderBottom:"1px solid rgba(6,199,85,.1)", fontSize:".86rem", letterSpacing:".15em", color:"rgba(6,199,85,.7)", textTransform:"uppercase" }}>已留 LINE ID 顧客</div>
          <div style={{ padding:".7rem .9rem", display:"flex", flexDirection:"column", gap:".4rem" }}>
            {[...new Map(bookings.filter(b=>b.lineId).map(b=>[b.lineId, b])).values()].map(b=>(
              <div key={b.lineId} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:".45rem .6rem", background:"rgba(6,199,85,.04)", borderRadius:6, flexWrap:"wrap", gap:".4rem" }}>
                <div style={{ display:"flex", gap:".5rem", alignItems:"center" }}>
                  <span style={{ fontSize:".8rem" }}>💬</span>
                  <div>
                    <div style={{ fontSize:".86rem", color:"var(--ink)" }}>{b.customerName}</div>
                    <div style={{ fontSize:".86rem", color:"#06C755" }}>{b.lineId}</div>
                  </div>
                </div>
                <div style={{ fontSize:".84rem", color:"#999999" }}>{b.customerPhone}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════════ */
const TABS = [
  { id:"book",      label:"預約",   icon:"📝" },
  { id:"calendar",  label:"行事曆", icon:"📅" },
  { id:"schedule",  label:"時刻表", icon:"⏰" },
  { id:"stylists",  label:"設計師", icon:"💈" },
  { id:"services",  label:"服務",   icon:"✂️" },
  { id:"customers", label:"客戶",   icon:"👥" },
  { id:"line",      label:"LINE",   icon:"💬" },
];

export default function SalonApp() {
  const [tab, setTab]               = useState("book");
  const [isMobile, setIsMobile]     = useState(() => window.innerWidth < 640);
  const { bookings, loaded, addBooking, updateStatus, deleteBooking } = useBookings();
  const { settings: lineSettings, save: saveLineSettings } = useLINESettings();
  const stylistMgr   = useStylistSettings();
  const salonConfig  = useSalonSettings();
  const customerMgr  = useCustomers();
  const adminAuth    = useAdminAuth();
  const stylistsMgr  = useStylists();
  const STYLISTS     = stylistsMgr.stylists;
  const servicesMgr  = useServices();
  SERVICES = servicesMgr.services; // update for components that don't take prop

  // Wrap addBooking to also upsert customer
  const handleBook = (booking) => {
    try {
      const svc     = (servicesMgr.services || DEFAULT_SERVICES).find(s => s.id === booking.serviceId);
      const stylist = (stylistsMgr.stylists || DEFAULT_STYLISTS).find(s => s.id === booking.stylistId);
      addBooking(booking);
      customerMgr.upsertFromBooking(booking, svc?.zh||"", stylist?.name||"");
    } catch (e) {
      console.error("handleBook error:", e);
    }
  };

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const todayBookings = bookings.filter(b => b.date===formatDate(new Date()) && b.status!=="cancelled");
  const pendingCount  = bookings.filter(b => b.status==="pending").length;

  return (
    <ErrorBoundary>
    <div style={{ minHeight:"100vh", background:"var(--bg)", color:"var(--ink)", fontFamily:"'DM Sans',sans-serif" }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Playfair+Display:wght@400;500;600&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400&display=swap"/>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        :root {
          --bg:       #f8f5f1;
          --bg2:      #f2ede7;
          --card:     #ffffff;
          --ink:      #1c1816;
          --ink2:     #5a4e47;
          --ink3:     #a0948d;
          --ink4:     #c8bdb8;
          --copper:   #c4835a;
          --copper2:  #e8a87a;
          --copper-bg:rgba(196,131,90,.1);
          --copper-bd:rgba(196,131,90,.3);
          --line:     rgba(28,24,22,.09);
          --shadow:   0 2px 16px rgba(28,24,22,.07);
          --shadow-lg:0 8px 32px rgba(28,24,22,.1);
          --r:        10px;
          --r-sm:     6px;
        }
        body { background: var(--bg); color: var(--ink); font-size: 16px; font-family:'DM Sans',sans-serif; -webkit-font-smoothing:antialiased; }
        input, textarea { font-family:'DM Sans',sans-serif; }
        input::placeholder, textarea::placeholder { color: var(--ink4); }
        input:focus, textarea:focus { border-color: var(--copper) !important; outline: none; box-shadow: 0 0 0 3px rgba(196,131,90,.12); }
        button:disabled { opacity:.38; cursor:not-allowed !important; }
        button { font-family:'DM Sans',sans-serif; }
        .btn-copper {
          background: var(--copper);
          border: 1px solid var(--copper);
          color: #fff;
          border-radius: var(--r-sm);
          padding: .72rem 1.8rem;
          font-family: 'Cormorant Garamond', serif;
          font-size: 1rem;
          letter-spacing: .2em;
          cursor: pointer;
          transition: all .22s;
        }
        .btn-copper:hover:not(:disabled) { background:#b8733e; border-color:#b8733e; transform:translateY(-1px); box-shadow: var(--shadow); }
        .btn-ghost {
          background: transparent;
          border: 1px solid var(--line);
          color: var(--ink3);
          border-radius: var(--r-sm);
          padding: .72rem 1.4rem;
          font-family: 'DM Sans', sans-serif;
          font-size: .82rem;
          cursor: pointer;
          transition: all .18s;
        }
        .btn-ghost:hover:not(:disabled) { border-color: var(--ink4); color: var(--ink2); background: var(--bg2); }
        .svc-card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: var(--r);
          overflow: hidden;
          cursor: pointer;
          transition: box-shadow .22s, transform .22s, border-color .22s;
          position: relative;
        }
        .svc-card:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px); border-color: var(--copper-bd); }
        .svc-card.active { border-color: var(--copper); box-shadow: 0 0 0 3px rgba(196,131,90,.12); }
        .svc-card .accent-bar { position:absolute; top:0; left:0; bottom:0; width:3px; background:var(--copper); opacity:0; transition:opacity .22s; border-radius: 10px 0 0 10px; }
        .svc-card:hover .accent-bar, .svc-card.active .accent-bar { opacity:1; }
        .stylist-card {
          background: var(--card);
          border: 1px solid var(--line);
          border-radius: var(--r);
          overflow: hidden;
          cursor: pointer;
          transition: box-shadow .22s, transform .22s, border-color .22s;
        }
        .stylist-card:hover { box-shadow: var(--shadow); transform:translateY(-2px); border-color: var(--copper-bd); }
        .stylist-card.active { border-color: var(--copper); box-shadow: 0 0 0 3px rgba(196,131,90,.12); }
        .slot-btn {
          padding: .42rem .7rem;
          border-radius: var(--r-sm);
          border: 1px solid var(--line);
          background: var(--card);
          color: var(--ink2);
          font-size: .78rem;
          font-family: 'DM Mono', monospace;
          cursor: pointer;
          transition: all .16s;
        }
        .slot-btn:hover { border-color: var(--copper-bd); background: var(--copper-bg); color: var(--copper); }
        .slot-btn.active { background: var(--copper); border-color: var(--copper); color: #fff; font-weight:500; box-shadow: 0 2px 8px rgba(196,131,90,.3); }
        .field-label { display:block; font-size:.86rem; color:var(--ink3); margin-bottom:.35rem; letter-spacing:.08em; text-transform:uppercase; }
        .field-input {
          width:100%; padding:.68rem .9rem;
          background: var(--bg2);
          border: 1px solid transparent;
          border-radius: var(--r-sm);
          color: var(--ink);
          font-size: .85rem;
          transition: all .18s;
        }
        .field-input:hover { border-color: var(--line); background: var(--card); }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        .fade-up { animation: fadeUp .35s ease both; }
        .fade-up-1 { animation-delay:.05s }
        .fade-up-2 { animation-delay:.1s }
        .fade-up-3 { animation-delay:.15s }
        .fade-up-4 { animation-delay:.2s }
        .fade-up-5 { animation-delay:.25s }
        .fade-up-6 { animation-delay:.3s }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:var(--ink4); border-radius:2px; }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{ background:"rgba(248,245,241,.96)", backdropFilter:"blur(12px)", position:"sticky", top:0, zIndex:100, borderBottom:"1px solid var(--line)" }}>
        <div style={{ maxWidth:1000, margin:"0 auto", padding:isMobile?".75rem 1.1rem":"1rem 1.8rem", display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem" }}>
          {/* Brand */}
          <div style={{ display:"flex", alignItems:"center", gap:isMobile?".6rem":"1rem" }}>
            {/* Logo circle: click to upload */}
            <label style={{ cursor:"pointer", flexShrink:0, display:"block" }} title="點擊更換 LOGO">
              <div style={{ width:isMobile?36:44, height:isMobile?36:44, borderRadius:"50%", background:"var(--copper)", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", transition:"opacity .18s" }}
                onMouseEnter={e=>e.currentTarget.style.opacity=".8"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                {salonConfig.logo
                  ? <img src={salonConfig.logo} alt="logo" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                  : <span style={{ color:"#fff", fontSize:isMobile?".78rem":".9rem", fontFamily:"'Cormorant Garamond'", fontWeight:600, letterSpacing:".04em" }}>JE</span>
                }
              </div>
              <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{
                const file=e.target.files[0]; if(!file)return;
                const reader=new FileReader();
                reader.onload=ev=>salonConfig.setLogo(ev.target.result);
                reader.readAsDataURL(file);
              }}/>
            </label>
            <div>
              <div style={{ fontFamily:"'Cormorant Garamond'", fontSize:isMobile?"1.05rem":"1.25rem", fontWeight:400, letterSpacing:".22em", color:"var(--ink)", lineHeight:1.1 }}>
                {SALON.name}
              </div>
              {!isMobile && <div style={{ fontSize:".86rem", letterSpacing:".25em", color:"var(--ink3)", textTransform:"uppercase", marginTop:".18rem" }}>Hair Salon · Booking</div>}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display:"flex", gap:".5rem", alignItems:"center" }}>
            <div style={{ padding:".3rem .75rem", borderRadius:20, background:"var(--copper-bg)", border:"1px solid var(--copper-bd)", display:"flex", alignItems:"center", gap:".45rem" }}>
              <span style={{ fontSize:isMobile?"1rem":".95rem", fontFamily:"'Cormorant Garamond'", fontWeight:600, color:"var(--copper)", lineHeight:1 }}>{todayBookings.length}</span>
              <span style={{ fontSize:".70rem", color:"var(--copper)", letterSpacing:".06em" }}>今日預約</span>
            </div>
            {pendingCount>0 && (
              <div style={{ padding:".3rem .65rem", borderRadius:20, background:"rgba(196,164,120,.1)", border:"1px solid rgba(196,164,120,.3)", fontSize:".84rem", color:"#a07840" }}>
                待確認 {pendingCount}
              </div>
            )}
            {lineSettings?.webhookUrl && (
              <div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(6,199,85,.1)", border:"1px solid rgba(6,199,85,.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:"#06C755", display:"inline-block" }}/>
              </div>
            )}
            {ADMIN_TABS.has(tab) && adminAuth.unlocked && (
              <button onClick={adminAuth.lock}
                style={{ padding:".28rem .65rem", borderRadius:20, border:"1px solid var(--line)", background:"var(--card)", color:"var(--ink3)", fontSize:".86rem", cursor:"pointer", display:"flex", alignItems:"center", gap:".3rem", touchAction:"manipulation" }}>
                🔓 <span style={{ display:isMobile?"none":"inline" }}>鎖定</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── TAB NAV ── */}
      <nav style={{ background:"var(--card)", borderBottom:"1px solid var(--line)", position:"sticky", top: isMobile?57:67, zIndex:90 }}>
        <div style={{ maxWidth:1000, margin:"0 auto", padding:"0 "+(isMobile?"1.1rem":"1.8rem"), display:"flex", overflowX:"auto", scrollbarWidth:"none" }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{
                flex: isMobile?"none":1, minWidth:isMobile?52:0,
                padding: isMobile?".65rem .5rem":".75rem .9rem",
                border:"none", borderBottom:`2px solid ${tab===t.id?"var(--copper)":"transparent"}`,
                background:"transparent", cursor:"pointer",
                color: tab===t.id?"var(--copper)":"var(--ink3)",
                fontSize: isMobile?".62rem":".74rem",
                display:"flex", flexDirection: isMobile?"column":"row",
                alignItems:"center", justifyContent:"center",
                gap: isMobile?".18rem":".38rem",
                transition:"color .18s, border-color .18s",
                WebkitTapHighlightColor:"transparent",
                whiteSpace:"nowrap", fontWeight: tab===t.id?500:400,
              }}>
              <span style={{ fontSize: isMobile?".88rem":"1rem", opacity: tab===t.id?1:.65 }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* ── CONTENT ── */}
      <main style={{ maxWidth:1000, margin:"0 auto", padding:isMobile?"1.4rem 1.1rem 6rem":"2.2rem 1.8rem 5rem" }}>
        {!loaded
          ? <div style={{ textAlign:"center", padding:"4rem 1rem", color:"#999999", fontSize:"1.32rem" }}>載入中…</div>
          : <>
              {tab==="book"     && <ErrorBoundary><BookingFlow bookings={bookings} onBook={handleBook} isMobile={isMobile} stylistSettings={stylistMgr.settings} stylists={STYLISTS} services={SERVICES}/></ErrorBoundary>}
              {tab==="services" && <ServicesMenu isMobile={isMobile} servicesMgr={servicesMgr}/>}
              {ADMIN_TABS.has(tab) && (
                adminAuth.unlocked
                  ? <>
                      {tab==="calendar"  && <CalendarView bookings={bookings} onUpdateStatus={updateStatus} onDelete={deleteBooking} isMobile={isMobile} lineSettings={lineSettings} stylistSettings={stylistMgr.settings} onAddBooking={handleBook} stylists={STYLISTS}/>}
                      {tab==="schedule"  && <ScheduleView bookings={bookings} isMobile={isMobile} stylistSettings={stylistMgr.settings} onAddBooking={handleBook} stylists={STYLISTS}/>}
                      {tab==="stylists"  && <StylistRoster bookings={bookings} isMobile={isMobile} stylistMgr={stylistMgr} stylistsMgr={stylistsMgr}/>}
                      {tab==="customers" && <CustomersView customers={customerMgr.customers} onDelete={customerMgr.deleteCustomer} bookings={bookings} isMobile={isMobile}/>}
                      {tab==="line"      && <LINESettingsView settings={lineSettings} onSave={saveLineSettings} bookings={bookings} isMobile={isMobile} adminAuth={adminAuth}/>}
                    </>
                  : <AdminLockScreen onUnlock={adminAuth.unlock} isMobile={isMobile}/>
              )}
            </>
        }
      </main>

    </div>
    </ErrorBoundary>
  );
}
