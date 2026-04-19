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
  { id:"cut_male",   zh:"男子剪髮",  en:"Men's Haircut",    icon:"✂️", duration:15,  price:"$180",  priceNote:"",   category:"基本", color:"#a0c4b8", desc:"男士精緻剪裁，Fade 刀法、造型設計" },
  { id:"rinse",      zh:"一般沖洗",  en:"Rinse",            icon:"🚿", duration:10,  price:"$50",   priceNote:"",   category:"基本", color:"#7a9aaa", desc:"沖洗頭髮，藥後沖洗使用" },
  { id:"cut_female", zh:"女子剪髮",  en:"Women's Haircut",  icon:"✂️", duration:20,  price:"$230",  priceNote:"起", category:"基本", color:"#a0c4b8", desc:"量身剪裁，依臉形與需求設計造型" },
  { id:"cut_bang",   zh:"修瀏海",    en:"Bang Trim",        icon:"✂️", duration:10,  price:"$80",   priceNote:"",   category:"基本", color:"#a0c4b8", desc:"快速修剪瀏海，保持清爽俐落" },
  { id:"shampoo",    zh:"精緻洗髮",  en:"Shampoo",          icon:"🚿", duration:15,  price:"$100",  priceNote:"",   category:"基本", color:"#7a9aaa", desc:"深層清潔頭皮，按摩洗髮" },
  { id:"eyebrow",    zh:"修眉",      en:"Eyebrow Trim",     icon:"💅", duration:10,  price:"$50",   priceNote:"",   category:"基本", color:"#c4bc9a", desc:"修整眉型，讓五官更立體精緻" },
  { id:"spa",        zh:"SPA洗",     en:"SPA Wash",         icon:"🐱", duration:30,  price:"$300",  priceNote:"",   category:"技術", color:"#c4bc9a", desc:"精油頭皮按摩洗髮" },
  { id:"perm",       zh:"燙髮",      en:"Perm",             icon:"〰",  duration:240, price:"$600",  priceNote:"起", category:"技術", color:"#c8a97e", desc:"熱塑燙、冷燙、巴西燙等多種選擇" },
  { id:"color",      zh:"染髮",      en:"Hair Color",       icon:"🎨", duration:150, price:"$500",  priceNote:"起", category:"技術", color:"#b8a0c4", desc:"全染、挑染、補染髮根" },
  { id:"treatment",  zh:"護髮",      en:"Treatment",        icon:"✨", duration:30,  price:"$500",  priceNote:"起", category:"養護", color:"#c4a0a0", desc:"深層修護、蛋白質補充、光澤修復" },
];
let SERVICES = DEFAULT_SERVICES; // overridden dynamically

const DEFAULT_STYLISTS = [
  {
    id:"ken",    name:"獻爸",  title:"院長・技術總監", photo:null,
    icon:"👨‍🦱", exp:"10年",   specialty:["洗髮","SPA洗","護髮"],
    color:"#c4835a", bio:"20年精湛技藝，擅長男士精緻剪裁與女士創意造型，每位客人都是藝術作品。",
    workDays:[1,2,3,4,5,6],
  },
  {
    id:"mei",    name:"闆娘",  title:"染髮專師", photo:null,
    icon:"👩‍🦰", exp:"20年",   specialty:["男子剪髮","女子剪髮","修瀏海","修眉","洗髮","SPA洗","燙髮","染髮","護髮"],
    color:"#b8a0c4", bio:"色彩魔法師，精通日系霧感色、歐美挑染與各式漸層染色技術。",
    workDays:[2,3,4,5,6,0],
  },
  {
    id:"kai",    name:"Nancy",  title:"剪髮設計師", photo:null,
    icon:"👨‍🎨", exp:"6年",    specialty:["男子剪髮","女子剪髮","修瀏海","修眉","洗髮","SPA洗","燙髮","染髮","護髮"],
    color:"#a0c4b8", bio:"刀工精準俐落，男士 Fade 刀法專家，也擅長女士俐落短髮造型。",
    workDays:[1,3,4,5,6,0],
  },
  {
    id:"yu",     name:"Blackey",  title:"燙髮・護髮師", photo:null,
    icon:"👩‍🦱", exp:"5年",    specialty:["洗髮","SPA洗","染髮","護髮"],
    color:"#c4a0a0", bio:"燙髮技術扎實，護髮療程細心，讓每位客人的頭髮健康又有光澤。",
    workDays:[1,2,4,5,6,0],
  },
];

let STYLISTS = DEFAULT_STYLISTS; // overridden in SalonApp scope

// Returns array of service objects for a booking (supports single serviceId and multi serviceIds)
function getBookingSvcs(booking, svcs) {
  const list = svcs || SERVICES;
  const ids = (booking.serviceIds && booking.serviceIds.length > 0)
    ? booking.serviceIds
    : (booking.serviceId ? [booking.serviceId] : []);
  return ids.map(id => list.find(s => s.id === id)).filter(Boolean);
}

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
   STORAGE SHIM
═══════════════════════════════════════════════════════════ */
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    get: (key) => { try { const v=localStorage.getItem(key); return Promise.resolve(v!==null?{key,value:v}:null); } catch(e){return Promise.reject(e);} },
    set: (key, value) => { try { localStorage.setItem(key,value); return Promise.resolve({key,value}); } catch(e){return Promise.reject(e);} },
    delete: (key) => { try { localStorage.removeItem(key); return Promise.resolve({key,deleted:true}); } catch(e){return Promise.reject(e);} },
    list: (prefix) => { try { const keys=Object.keys(localStorage).filter(k=>prefix?k.startsWith(prefix):true); return Promise.resolve({keys}); } catch(e){return Promise.reject(e);} },
  };
}

function compressImage(dataUrl, maxPx=400, quality=0.75) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx/Math.max(img.width,img.height));
      const w=Math.round(img.width*scale), h=Math.round(img.height*scale);
      const canvas=document.createElement("canvas"); canvas.width=w; canvas.height=h;
      canvas.getContext("2d").drawImage(img,0,0,w,h);
      resolve(canvas.toDataURL("image/jpeg",quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

const PHOTO_DEFAULTS = {
  ken:  "data:image/jpeg;base64,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",
  mei:  "data:image/jpeg;base64,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",
  kai:  "data:image/jpeg;base64,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",
  yu:   "data:image/jpeg;base64,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",
  logo: "data:image/jpeg;base64,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",
};

/* ═══════════════════════════════════════════════════════════
   STORAGE HOOK
═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   FIREBASE CONFIG  ← 填入你的 Firebase 專案資料
   步驟：
   1. 前往 https://console.firebase.google.com 建立專案
   2. 新增 Web App，複製 firebaseConfig 物件
   3. 啟用 Realtime Database（選 asia-east1 或 us-central1）
   4. Database 規則暫設為允許讀寫（測試用）：
      { "rules": { ".read": true, ".write": true } }
═══════════════════════════════════════════════════════════ */
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDJBAU3lbT0r15eKN3iCuWQ0a1Hk9pq3WY",
  authDomain:        "je-booking.firebaseapp.com",
  databaseURL:       "https://je-booking-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "je-booking",
  storageBucket:     "je-booking.firebasestorage.app",
  messagingSenderId: "336138875920",
  appId:             "1:336138875920:web:feded62fcee81f322f4695",
  measurementId:     "G-TYWTMHRWC5",
};
const FIREBASE_READY = !FIREBASE_CONFIG.apiKey.startsWith("YOUR_");

let _firebaseDB   = null;
let _fbLoading    = false;
let _fbCallbacks  = [];

async function getFirebaseDB() {
  if (_firebaseDB) return _firebaseDB;
  if (!FIREBASE_READY) return null;
  if (_fbLoading) return new Promise(r => _fbCallbacks.push(r));
  _fbLoading = true;
  try {
    const [{ initializeApp, getApps }, { getDatabase }] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js"),
    ]);
    const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];
    _firebaseDB = getDatabase(app);
    _fbCallbacks.forEach(r => r(_firebaseDB));
    _fbCallbacks = [];
    return _firebaseDB;
  } catch (e) {
    console.warn("Firebase 初始化失敗，使用本機備援:", e.message);
    _fbCallbacks.forEach(r => r(null));
    _fbCallbacks = [];
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════
   useBookings — Firebase Realtime Database（跨裝置即時同步）
   未設定 Firebase 時自動降級使用 localStorage
═══════════════════════════════════════════════════════════ */
function useBookings() {
  const [bookings, setBookings] = useState([]);
  const [loaded, setLoaded]     = useState(false);
  const [fbReady, setFbReady]   = useState(false);

  // ── 初始化：嘗試連接 Firebase，否則用 localStorage ──
  useEffect(() => {
    let unsub = null;

    (async () => {
      const db = await getFirebaseDB();

      if (db) {
        // Firebase 模式：即時監聽
        const { ref, onValue } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js");
        const dbRef = ref(db, "je_bookings");
        unsub = onValue(dbRef, (snapshot) => {
          const val = snapshot.val();
          const arr = val
            ? Object.values(val).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            : [];
          setBookings(arr);
          setFbReady(true);
          setLoaded(true);
        }, (err) => {
          console.warn("Firebase 讀取失敗:", err.message);
          setLoaded(true);
        });
      } else {
        // 本機備援模式
        try {
          const res = await window.storage.get("je_bookings");
          if (res?.value) setBookings(JSON.parse(res.value));
        } catch (_) {}
        setLoaded(true);
      }
    })();

    return () => { if (typeof unsub === "function") unsub(); };
  }, []);

  // ── 新增預約 ──
  const addBooking = useCallback(async (b) => {
    const booking = { ...b, id: genId(), status: "pending", createdAt: new Date().toISOString() };
    const db = await getFirebaseDB();
    if (db) {
      const { ref, set } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js");
      await set(ref(db, `je_bookings/${booking.id}`), booking);
      // Firebase onValue 會自動更新 state，不需手動 setBookings
    } else {
      setBookings(prev => {
        const next = [...prev, booking];
        window.storage?.set("je_bookings", JSON.stringify(next)).catch(() => {});
        return next;
      });
    }
  }, []);

  // ── 更新狀態 ──
  const updateStatus = useCallback(async (id, status) => {
    const db = await getFirebaseDB();
    if (db) {
      const { ref, update } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js");
      await update(ref(db, `je_bookings/${id}`), { status });
    } else {
      setBookings(prev => {
        const next = prev.map(b => b.id === id ? { ...b, status } : b);
        window.storage?.set("je_bookings", JSON.stringify(next)).catch(() => {});
        return next;
      });
    }
  }, []);

  // ── 刪除預約 ──
  const deleteBooking = useCallback(async (id) => {
    const db = await getFirebaseDB();
    if (db) {
      const { ref, remove } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js");
      await remove(ref(db, `je_bookings/${id}`));
    } else {
      setBookings(prev => {
        const next = prev.filter(b => b.id !== id);
        window.storage?.set("je_bookings", JSON.stringify(next)).catch(() => {});
        return next;
      });
    }
  }, []);

  return { bookings, loaded, fbReady, addBooking, updateStatus, deleteBooking };
}

/* ═══════════════════════════════════════════════════════════
   LINE SETTINGS HOOK
═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   FIREBASE SYNC HELPERS（所有 Hook 共用）
═══════════════════════════════════════════════════════════ */
async function fbWrite(path, data) {
  const db = await getFirebaseDB();
  if (db) {
    const { ref, set } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js");
    try { await set(ref(db, path), data); } catch(e) { console.warn("fbWrite:", e.message); }
  } else {
    try { await window.storage?.set(path.replace(/\//g,"_"), JSON.stringify(data)); } catch(_) {}
  }
}

function fbListen(path, onData) {
  const unsubRef = { current: null };
  (async () => {
    const db = await getFirebaseDB();
    if (db) {
      const { ref, onValue } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js");
      unsubRef.current = onValue(ref(db, path), snap => onData(snap.val()), () => onData(null));
    } else {
      try {
        const res = await window.storage?.get(path.replace(/\//g,"_"));
        if (res?.value) {
          try { onData(JSON.parse(res.value)); }
          catch(_) { onData(null); } // 非 JSON 格式，忽略舊資料
        } else {
          onData(null);
        }
      } catch(_) { onData(null); }
    }
  })();
  return () => { if (typeof unsubRef.current === "function") unsubRef.current(); };
}

/* ═══════════════════════════════════════════════════════════
   LINE SETTINGS HOOK
═══════════════════════════════════════════════════════════ */
function useLINESettings() {
  const [settings, setSettings] = useState({ webhookUrl:"", token:"", ownerNotify:true });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    return fbListen("je_line_settings", val => {
      if (val) setSettings(val);
      setLoaded(true);
    });
  }, []);

  const save = (next) => { setSettings(next); fbWrite("je_line_settings", next); };
  return { settings, loaded, save };
}

/* LINE 通知發送（透過自架 line-server.js 中繼） */
async function sendLINENotify({ webhookUrl, type, booking, svc, stylist }) {
  if (!webhookUrl) return { ok:false, msg:"未設定 Webhook URL" };
  try {
    const notifyUrl = webhookUrl.replace(/\/notify\/?$/, '') + '/notify';
    const res = await fetch(notifyUrl, {
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

  useEffect(() => {
    const unsubSched = fbListen("je_stylist_sched", sched => {
      setSettings(prev => {
        const merged = {};
        for (const st of DEFAULT_STYLISTS) {
          merged[st.id] = { ...(sched?.[st.id]||{}), photo: prev[st.id]?.photo || PHOTO_DEFAULTS[st.id] || null };
        }
        return merged;
      });
    });

    const unsubPhotos = fbListen("je_stylist_photos", photos => {
      setSettings(prev => {
        const merged = { ...prev };
        for (const st of DEFAULT_STYLISTS) {
          merged[st.id] = { ...(merged[st.id]||{}), photo: photos?.[st.id] || PHOTO_DEFAULTS[st.id] || null };
        }
        return merged;
      });
      setPhotosLoaded(true);
    });

    return () => { unsubSched(); unsubPhotos(); };
  }, []);

  const saveSchedule = (next) => {
    const schedOnly = {};
    for (const id of Object.keys(next)) {
      const { photo: _p, ...rest } = next[id] || {};
      schedOnly[id] = rest;
    }
    fbWrite("je_stylist_sched", schedOnly);
  };

  const setPhoto = async (id, dataUrl) => {
    const compressed = await compressImage(dataUrl, 400, 0.75);
    setSettings(prev => ({ ...prev, [id]: { ...(prev[id]||{}), photo: compressed } }));
    const db = await getFirebaseDB();
    if (db) {
      const { ref, get, set } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js");
      const snap = await get(ref(db, "je_stylist_photos"));
      await set(ref(db, "je_stylist_photos"), { ...(snap.val()||{}), [id]: compressed });
    } else {
      try { await window.storage?.set("je_photo_" + id, compressed); } catch(_) {}
    }
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
    return fbListen("je_salon_logo", val => {
      setLogoState(val || PHOTO_DEFAULTS.logo || null);
      setLoaded(true);
    });
  }, []);

  const setLogo = async (dataUrl) => {
    const compressed = await compressImage(dataUrl, 300, 0.8);
    setLogoState(compressed);
    fbWrite("je_salon_logo", compressed);
  };

  const removeLogo = () => { setLogoState(null); fbWrite("je_salon_logo", null); };

  return { logo, loaded, setLogo, removeLogo };
}

/* ═══════════════════════════════════════════════════════════
   DYNAMIC STYLISTS HOOK
═══════════════════════════════════════════════════════════ */
function useStylists() {
  const [stylists, setStylists] = useState(DEFAULT_STYLISTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    return fbListen("je_stylists", val => {
      if (Array.isArray(val) && val.length > 0) setStylists(val);
      setLoaded(true);
    });
  }, []);

  const save = (next) => { setStylists(next); fbWrite("je_stylists", next); };

  const addStylist    = (s)        => save([...stylists, { ...s, id: "st_" + Date.now() }]);
  const deleteStylist = (id)       => save(stylists.filter(s => s.id !== id));
  const updateStylist = (id, patch)=> save(stylists.map(s => s.id === id ? { ...s, ...patch } : s));

  return { stylists, loaded, addStylist, deleteStylist, updateStylist };
}

/* ═══════════════════════════════════════════════════════════
   DYNAMIC SERVICES HOOK
═══════════════════════════════════════════════════════════ */
function useServices() {
  const [services, setServices] = useState(DEFAULT_SERVICES);

  useEffect(() => {
    return fbListen("je_services", val => {
      if (Array.isArray(val) && val.length > 0) setServices(val);
    });
  }, []);

  const save = (next) => { setServices(next); fbWrite("je_services", next); };

  const updateService = (id, patch) => save(services.map(s => s.id === id ? { ...s, ...patch } : s));
  const addService    = (svc)        => save([...services, svc]);
  const deleteService = (id)         => save(services.filter(s => s.id !== id));

  return { services, updateService, addService, deleteService };
}

/* ═══════════════════════════════════════════════════════════
   CUSTOMERS HOOK
═══════════════════════════════════════════════════════════ */
function useCustomers() {
  const [customers, setCustomers] = useState({});

  useEffect(() => {
    return fbListen("je_customers", val => {
      if (val && typeof val === "object") setCustomers(val);
    });
  }, []);

  const upsertFromBooking = (booking, svcName, stylistName) => {
    if (!booking || !booking.customerPhone) return;
    const key = booking.customerPhone.replace(/[-\s]/g, "");
    const ids = (booking.serviceIds?.length > 0) ? booking.serviceIds : (booking.serviceId ? [booking.serviceId] : []);
    const price = ids.reduce((sum, id) => {
      const s = SERVICES.find(x => x.id === id) || DEFAULT_SERVICES.find(x => x.id === id);
      return sum + (s ? parseInt((s.price||"0").replace(/[^0-9]/g,""),10)||0 : 0);
    }, 0);
    setCustomers(prev => {
      const existing = prev[key] || { phone: booking.customerPhone, name: booking.customerName, lineId: booking.lineId||"", firstVisit: booking.date, visits: 0, totalSpend: 0, history: [] };
      const record = { date: booking.date, time: booking.time, service: svcName, stylist: stylistName, bookingId: booking.id || genId() };
      const next = { ...prev, [key]: { ...existing, name: booking.customerName, lineId: booking.lineId||existing.lineId||"", lastVisit: booking.date, visits: (existing.visits||0)+1, totalSpend: (existing.totalSpend||0)+price, history: [record,...(existing.history||[])].slice(0,50) } };
      fbWrite("je_customers", next);
      return next;
    });
  };

  const deleteCustomer = (key) => {
    setCustomers(prev => {
      const next = {...prev}; delete next[key];
      fbWrite("je_customers", next);
      return next;
    });
  };

  return { customers, upsertFromBooking, deleteCustomer };
}

/* ═══════════════════════════════════════════════════════════
   ADMIN AUTH (PIN lock for management tabs)
═══════════════════════════════════════════════════════════ */
const ADMIN_TABS = new Set(["calendar","schedule","stylists","customers","line"]);
const DEFAULT_PIN = "0000";

function useAdminAuth() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin]           = useState(DEFAULT_PIN);

  useEffect(() => {
    return fbListen("je_admin_pin", val => {
      if (val) setPin(val);
    });
  }, []);

  const unlock    = (input) => { if (input === pin) { setUnlocked(true); return true; } return false; };
  const lock      = () => setUnlocked(false);
  const changePin = (newPin) => { setPin(newPin); fbWrite("je_admin_pin", newPin); };

  return { unlocked, unlock, lock, pin, changePin };
}

/* Hidden long-press entry to admin — hold 3 seconds */
function AdminSecretEntry({ onEnter, adminAuth, isMobile, todayCount, pendingCount }) {
  const rafRef = React.useRef(null);
  const startRef = React.useRef(null);
  const [pressing, setPressing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const HOLD_MS = 3000;
  const startPress = () => {
    if (adminAuth.unlocked) { onEnter(); return; }
    setPressing(true); startRef.current = Date.now();
    const tick = () => {
      const pct = Math.min((Date.now()-startRef.current)/HOLD_MS,1);
      setProgress(pct);
      if (pct < 1) rafRef.current = requestAnimationFrame(tick);
      else { setPressing(false); setProgress(0); onEnter(); }
    };
    rafRef.current = requestAnimationFrame(tick);
  };
  const cancelPress = () => { cancelAnimationFrame(rafRef.current); setPressing(false); setProgress(0); };
  return (
    <div style={{ display:"flex", gap:".5rem", alignItems:"center" }}>
      <div onMouseDown={startPress} onMouseUp={cancelPress} onMouseLeave={cancelPress}
        onTouchStart={e=>{e.preventDefault();startPress();}} onTouchEnd={cancelPress} onTouchCancel={cancelPress}
        style={{ position:"relative", padding:".3rem .75rem", borderRadius:20, background:"var(--copper-bg)", border:`1px solid ${pressing?"var(--copper)":"var(--copper-bd)"}`, display:"flex", alignItems:"center", gap:".45rem", cursor:"pointer", userSelect:"none", WebkitUserSelect:"none", overflow:"hidden" }}>
        {pressing && <div style={{ position:"absolute", inset:0, background:"var(--copper)", opacity:.15, width:`${progress*100}%`, borderRadius:20 }}/>}
        <span style={{ fontSize:isMobile?"1rem":".95rem", fontFamily:"'Cormorant Garamond'", fontWeight:600, color:"var(--copper)", lineHeight:1, position:"relative" }}>{todayCount}</span>
        <span style={{ fontSize:".70rem", color:"var(--copper)", letterSpacing:".06em", position:"relative" }}>今日預約</span>
      </div>
      {pendingCount>0 && (
        <div style={{ padding:".3rem .65rem", borderRadius:20, background:"rgba(196,164,120,.1)", border:"1px solid rgba(196,164,120,.3)", fontSize:".84rem", color:"#a07840" }}>
          待確認 {pendingCount}
        </div>
      )}
    </div>
  );
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
  // step -1 = LINE 設定前置步驟, 0 = 選服務, 1 = 選設計師, ...
  const [step, setStep] = useState(-1);
  const [sel, setSel]   = useState({ services:[], stylist:null, date:null, time:null });
  const [form, setForm] = useState({ name:"", phone:"", lineId:"", notes:"" });
  const [done, setDone] = useState(null);
  const [calDate, setCalDate] = useState(() => { const d=new Date(); return {y:d.getFullYear(),m:d.getMonth()}; });
  const [showManual, setShowManual] = useState(false);
  const [lineIdInput, setLineIdInput] = useState("");
  const [linePasted, setLinePasted]   = useState(false);

  const today = new Date(); today.setHours(0,0,0,0);

  // Use prop-passed lists so updates are reactive
  const SERVICES_LOCAL = services;
  const STYLISTS_LOCAL  = stylists;
  const selSvcs        = SERVICES_LOCAL.filter(s => sel.services.includes(s.id));
  const svcObj         = selSvcs[0] || null; // primary (for backward compat)
  const totalDuration  = selSvcs.reduce((sum, s) => sum + (s.duration || 0), 0);
  const stylistObj     = STYLISTS_LOCAL.find(s=>s.id===sel.stylist);

  const availableSlots = useMemo(() => {
    if (!sel.stylist || !sel.date || sel.services.length === 0) return [];
    const dh       = getDayHours(sel.date);
    const isToday  = formatDate(sel.date) === formatDate(new Date());
    const nowMins  = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : 0;
    return ALL_SLOTS.filter(slot => {
      const slotMins = slotToMinutes(slot);
      if (slotMins < dh.open) return false;
      if (slotMins + totalDuration > dh.close) return false;
      // Block past slots for today (add 15min buffer)
      if (isToday && slotMins < nowMins + 15) return false;
      return isSlotAvailable(slot, sel.stylist, sel.date, bookings, totalDuration);
    });
  }, [sel.stylist, sel.date, sel.services, bookings, totalDuration]);

  const reset = () => { setStep(-1); setSel({services:[],stylist:null,date:null,time:null}); setForm({name:"",phone:"",lineId:"",notes:""}); setDone(null); setLineIdInput(""); setLinePasted(false); };

  const confirmBook = () => {
    const booking = {
      serviceId:  sel.services[0] || "",   // primary for backward compat
      serviceIds: sel.services,             // multi-service array
      stylistId: sel.stylist,
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

      {/* ── STEP -1: LINE 設定（前置，可略過）── */}
      {step===-1 && (
        <div style={{ animation:"fadeUp .35s ease both" }}>
          {/* 標題 */}
          <div style={{ textAlign:"center", marginBottom:"1.8rem" }}>
            <div style={{ fontSize:"2.2rem", marginBottom:".5rem" }}>💬</div>
            <h2 style={{ ...h2Style, marginBottom:".35rem" }}>開始預約前</h2>
            <p style={{ fontSize:".88rem", color:"var(--ink3)", lineHeight:1.7 }}>
              建議先完成 LINE 通知設定，預約確認、提醒訊息會直接傳到您的 LINE
            </p>
          </div>

          {/* 步驟卡片 */}
          <div style={{ background:"var(--card)", border:"1px solid var(--line)", borderRadius:"var(--r)", overflow:"hidden", marginBottom:"1rem" }}>
            {/* Step A */}
            <div style={{ padding:"1rem 1.1rem", borderBottom:"1px solid var(--line)", display:"flex", gap:".85rem", alignItems:"flex-start" }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(6,199,85,.12)", border:"1px solid rgba(6,199,85,.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".78rem", fontWeight:700, color:"#06C755", flexShrink:0, marginTop:".1rem" }}>1</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:".9rem", fontWeight:600, color:"var(--ink)", marginBottom:".3rem" }}>加入 LINE 官方帳號</div>
                <div style={{ fontSize:".82rem", color:"var(--ink3)", lineHeight:1.65, marginBottom:".6rem" }}>
                  點擊下方按鈕加入好友，或搜尋 <b style={{ color:"var(--ink2)" }}>{SALON.lineOaId}</b>
                </div>
                <a href={`https://line.me/R/ti/p/${SALON.lineOaId}`} target="_blank" rel="noreferrer"
                  style={{ display:"inline-flex", alignItems:"center", gap:".4rem", padding:".42rem .9rem", background:"#06C755", color:"#fff", borderRadius:20, fontSize:".82rem", fontWeight:600, textDecoration:"none" }}>
                  <span style={{ fontSize:".95rem" }}>💬</span> 加入 LINE 好友
                </a>
              </div>
            </div>
            {/* Step B */}
            <div style={{ padding:"1rem 1.1rem", borderBottom:"1px solid var(--line)", display:"flex", gap:".85rem", alignItems:"flex-start" }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(6,199,85,.12)", border:"1px solid rgba(6,199,85,.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:".78rem", fontWeight:700, color:"#06C755", flexShrink:0, marginTop:".1rem" }}>2</div>
              <div>
                <div style={{ fontSize:".9rem", fontWeight:600, color:"var(--ink)", marginBottom:".3rem" }}>傳送「查詢我的預約」</div>
                <div style={{ fontSize:".82rem", color:"var(--ink3)", lineHeight:1.65 }}>
                  在 LINE 聊天室傳送這句話，bot 會立即回覆您的 userId（U 開頭 33 碼）
                </div>
              </div>
            </div>
            {/* Step C — userId input */}
            <div style={{ padding:"1rem 1.1rem" }}>
              <div style={{ display:"flex", gap:".85rem", alignItems:"flex-start" }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background: linePasted?"rgba(6,199,85,.12)":"rgba(196,131,90,.1)", border:`1px solid ${linePasted?"rgba(6,199,85,.3)":"var(--copper-bd)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:".78rem", fontWeight:700, color:linePasted?"#06C755":"var(--copper)", flexShrink:0, marginTop:".1rem" }}>
                  {linePasted ? "✓" : "3"}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:".9rem", fontWeight:600, color:"var(--ink)", marginBottom:".3rem" }}>貼上您的 userId</div>
                  <div style={{ fontSize:".82rem", color:"var(--ink3)", marginBottom:".6rem" }}>複製 bot 回覆的 U 開頭 33 碼，貼到下方欄位</div>
                  {/* 大輸入框 + 貼上按鈕 */}
                  <div style={{ display:"flex", gap:".5rem", alignItems:"stretch" }}>
                    <input
                      type="text"
                      value={lineIdInput}
                      onChange={e => {
                        const v = e.target.value.trim();
                        setLineIdInput(v);
                        setLinePasted(/^U[0-9a-zA-Z]{32}$/.test(v));
                      }}
                      placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      style={{
                        flex:1, padding:".65rem .8rem",
                        fontSize: isMobile?".78rem":".85rem",
                        fontFamily:"'DM Mono',monospace",
                        letterSpacing:".04em",
                        background:"var(--bg2)", border:`1.5px solid ${linePasted?"rgba(6,199,85,.5)":"var(--line)"}`,
                        borderRadius:"var(--r-sm)", color:"var(--ink)",
                        outline:"none", transition:"border .2s",
                      }}
                    />
                    {navigator.clipboard && (
                      <button onClick={async()=>{
                        try {
                          const text = await navigator.clipboard.readText();
                          const v = text.trim();
                          setLineIdInput(v);
                          setLinePasted(/^U[0-9a-zA-Z]{32}$/.test(v));
                        } catch(_) {}
                      }}
                        style={{ padding:".65rem .9rem", borderRadius:"var(--r-sm)", border:"1px solid var(--line)", background:"var(--card)", color:"var(--ink2)", fontSize:".82rem", cursor:"pointer", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:".3rem" }}>
                        📋 貼上
                      </button>
                    )}
                  </div>
                  {linePasted && (
                    <div style={{ marginTop:".4rem", fontSize:".76rem", color:"#06C755", display:"flex", alignItems:"center", gap:".3rem" }}>
                      ✅ userId 格式正確，已準備好接收通知
                    </div>
                  )}
                  {lineIdInput && !linePasted && (
                    <div style={{ marginTop:".4rem", fontSize:".76rem", color:"#c46060" }}>
                      ⚠️ 格式不符（需為 U 開頭 33 碼），請重新確認
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 操作按鈕 */}
          <div style={{ display:"flex", flexDirection:"column", gap:".6rem" }}>
            <button onClick={()=>{
              if (linePasted) setForm(p=>({...p, lineId: lineIdInput}));
              setStep(0);
            }}
              className="btn-copper"
              style={{ padding:".78rem 1rem", fontSize:".95rem", letterSpacing:".08em" }}>
              {linePasted ? "✓ 已設定 LINE，開始預約 →" : "略過，直接開始預約 →"}
            </button>
            {!linePasted && (
              <p style={{ textAlign:"center", fontSize:".76rem", color:"var(--ink4)", margin:0 }}>
                不需要 LINE 通知也可以正常預約
              </p>
            )}
          </div>
        </div>
      )}

      {/* 步驟列（step >= 0 時才顯示）*/}
      {step >= 0 && (
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
      )}

      {/* ── STEP 0: Service ── */}
      {step===0 && (
        <div>
          <h2 style={h2Style}>選擇服務項目</h2>
          <p style={{ fontSize:".84rem", color:"var(--ink3)", marginBottom:"1rem", marginTop:"-.5rem" }}>可複選多項加值服務 ✦</p>
          <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr 1fr":"repeat(3,1fr)", gap:isMobile?".75rem":"1rem" }}>
            {SERVICES_LOCAL.map((svc,si) => {
              const active = sel.services.includes(svc.id);
              return (
                <button key={svc.id} onClick={()=>setSel(p=>{
                  const next = p.services.includes(svc.id)
                    ? p.services.filter(id=>id!==svc.id)
                    : [...p.services, svc.id];
                  return {...p, services:next, stylist:null, date:null, time:null};
                })}
                  className={`svc-card fade-up fade-up-${Math.min(si+1,6)}${active?" active":""}`}
                  style={{ display:"flex", flexDirection:"column", gap:0, padding:0, textAlign:"left", WebkitTapHighlightColor:"transparent" }}>
                  <div className="accent-bar"/>
                  <div style={{ padding:isMobile?".85rem .9rem .65rem":"1rem 1.1rem .8rem", borderBottom:"1px solid var(--line)", flex:1 }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:".55rem" }}>
                      <span style={{ fontSize:isMobile?"1.25rem":"1.45rem", lineHeight:1 }}>{svc.icon}</span>
                      <div style={{ display:"flex", gap:".3rem", alignItems:"center" }}>
                        {active && <span style={{ fontSize:".7rem", background:"var(--copper)", color:"#fff", borderRadius:"50%", width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>✓</span>}
                        <span style={{ fontSize:".86rem", padding:".15rem .45rem", borderRadius:20, background:active?`rgba(${hexToRgb(svc.color)},.12)`:"var(--bg2)", color:active?svc.color:"var(--ink3)", border:`1px solid ${active?`rgba(${hexToRgb(svc.color)},.25)`:"var(--line)"}`, letterSpacing:".04em" }}>{svc.category}</span>
                      </div>
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
          {/* Selected summary bar */}
          {sel.services.length > 0 && (
            <div style={{ marginTop:"1rem", padding:".65rem 1rem", background:"var(--copper-bg)", border:"1px solid var(--copper-bd)", borderRadius:"var(--r-sm)", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:".4rem" }}>
              <div style={{ fontSize:".84rem", color:"var(--copper)" }}>
                已選：{selSvcs.map(s=>s.zh).join("・")}
              </div>
              <div style={{ fontSize:".78rem", color:"var(--ink3)", fontFamily:"'DM Mono',monospace" }}>
                合計 {totalDuration}min
              </div>
            </div>
          )}
          <NavBtns onNext={()=>setStep(1)} nextDisabled={sel.services.length===0} isMobile={isMobile}/>
        </div>
      )}

      {/* ── STEP 1: Stylist ── */}
      {step===1 && (
        <div>
          <h2 style={h2Style}>選擇設計師</h2>
          <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr 1fr":"1fr 1fr", gap:".7rem", marginBottom:".7rem" }}>
            {STYLISTS_LOCAL.map(st => {
              const canDoSvc = sel.services.every(id => {
                const s = SERVICES_LOCAL.find(x => x.id === id);
                return s && st.specialty.includes(s.zh);
              });
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
                ["✂️", "服務", selSvcs.length > 0 ? selSvcs.map(s=>`${s.zh}（${s.duration}分）`).join(" ＋ ") : "—", "var(--copper)"],
                [stylistObj?.icon||"👤", "設計師", `${stylistObj?.name}・${stylistObj?.title}`, stylistObj?.color],
                ["📅", "日期", displayDate(sel.date), "var(--copper)"],
                ["⏰", "時間", sel.time, "var(--copper)"],
                ["⏱", "總時長", `${totalDuration} 分鐘`, "var(--copper)"],
                ["💰", "費用", selSvcs.map(s=>`${s.price}${s.priceNote}`).join(" ＋ "), "var(--copper)"],
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
          ].map(([label,key,type,ph,req])=>(
            <div key={key} style={{ marginBottom:".75rem" }}>
              <label className="field-label">{label}</label>
              <input type={type} placeholder={ph} value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
                className="field-input"
              />
            </div>
          ))}
          {/* LINE ID 欄位 — 已在前置步驟設定，這裡僅供確認/修改 */}
          <div style={{ marginBottom:".75rem" }}>
            <label className="field-label">
              LINE ID（選填）
              {form.lineId && <span style={{ marginLeft:".5rem", fontSize:".7rem", color:"#06C755", fontWeight:400 }}>✅ 已設定，可收到通知</span>}
            </label>
            <div style={{ display:"flex", gap:".5rem", alignItems:"stretch" }}>
              <input type="text"
                placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={form.lineId}
                onChange={e=>setForm(p=>({...p,lineId:e.target.value.trim()}))}
                style={{
                  flex:1, padding:".65rem .8rem",
                  fontSize:isMobile?".78rem":".85rem",
                  fontFamily:"'DM Mono',monospace", letterSpacing:".03em",
                  background:"var(--bg2)", border:`1.5px solid ${/^U[0-9a-zA-Z]{32}$/.test(form.lineId)?"rgba(6,199,85,.5)":"var(--line)"}`,
                  borderRadius:"var(--r-sm)", color:"var(--ink)", outline:"none",
                }}
              />
              {navigator.clipboard && (
                <button onClick={async()=>{
                  try {
                    const text = await navigator.clipboard.readText();
                    setForm(p=>({...p, lineId:text.trim()}));
                  } catch(_) {}
                }}
                  style={{ padding:".65rem .9rem", borderRadius:"var(--r-sm)", border:"1px solid var(--line)", background:"var(--card)", color:"var(--ink2)", fontSize:".82rem", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                  📋 貼上
                </button>
              )}
            </div>
            {!form.lineId && (
              <div style={{ marginTop:".35rem", fontSize:".74rem", color:"var(--ink4)", lineHeight:1.6 }}>
                未設定？<a href={`https://line.me/R/ti/p/${SALON.lineOaId}`} target="_blank" rel="noreferrer" style={{ color:"#06C755", textDecoration:"none", fontWeight:600 }}>加入 {SALON.lineOaId}</a>，傳送「查詢我的預約」取得 userId 後貼上
              </div>
            )}
          </div>
          {/* 備注欄位 */}
          {[
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
              ["服務",    (done.serviceIds||[done.serviceId]).map(id=>SERVICES_LOCAL.find(s=>s.id===id)?.zh||id).join("・")],
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
    serviceIds:["cut_male"], stylistId: STYLISTS[0].id,
    date: today, time:"10:00",
    customerName:"", customerPhone:"", notes:"", lineId:"",
  });
  const [saved, setSaved] = useState(false);

  const selSvcsM    = SERVICES.filter(s => form.serviceIds.includes(s.id));
  const svcObj      = selSvcsM[0] || null;
  const totalDurM   = selSvcsM.reduce((sum,s)=>sum+(s.duration||0),0);
  const stylistObj  = STYLISTS.find(s => s.id === form.stylistId);

  const dh = useMemo(() => {
    try { return getDayHours(parseDate(form.date)); } catch(_) { return {open:600,close:1260}; }
  }, [form.date]);

  const slots = useMemo(() => {
    if (!form.serviceIds.length || !form.stylistId || !form.date) return [];
    return ALL_SLOTS.filter(slot => {
      const sm = slotToMinutes(slot);
      if (sm < dh.open || sm + totalDurM > dh.close) return false;
      return isSlotAvailable(slot, form.stylistId, parseDate(form.date), bookings, totalDurM);
    });
  }, [form.serviceIds, form.stylistId, form.date, bookings, dh, totalDurM]);

  const handleSubmit = () => {
    if (!form.customerName || !form.customerPhone || !form.time) return;
    onBook({
      serviceId:  form.serviceIds[0] || "", // primary
      serviceIds: form.serviceIds,
      stylistId: form.stylistId,
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
            <label className="field-label">服務項目（可複選）</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:".4rem" }}>
              {SERVICES.map(svc=>{
                const on = form.serviceIds.includes(svc.id);
                return (
                  <button key={svc.id} onClick={()=>setForm(p=>({
                    ...p,
                    serviceIds: on ? p.serviceIds.filter(id=>id!==svc.id) : [...p.serviceIds, svc.id],
                    time:""
                  }))}
                    style={{ padding:".32rem .75rem", borderRadius:"var(--r-sm)", border:`1px solid ${on?"var(--copper)":"var(--line)"}`, background:on?"var(--copper-bg)":"var(--card)", color:on?"var(--copper)":"var(--ink2)", fontSize:".87rem", cursor:"pointer" }}>
                    {on && <span style={{ marginRight:".2rem" }}>✓</span>}{svc.icon} {svc.zh}
                  </button>
                );
              })}
            </div>
            {selSvcsM.length > 0 && (
              <div style={{ marginTop:".4rem", fontSize:".78rem", color:"var(--ink3)" }}>
                合計 {totalDurM} 分鐘
              </div>
            )}
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
            <input value={form.lineId} onChange={e=>setForm(p=>({...p,lineId:e.target.value}))} placeholder="U 開頭的 userId，例如：Uab12cd34ef56..." className="field-input"/>
            <div style={{ marginTop:".35rem", padding:".45rem .7rem", background:"rgba(6,199,85,.06)", border:"1px solid rgba(6,199,85,.2)", borderRadius:6, fontSize:".74rem", color:"#3a7a50", lineHeight:1.65 }}>
              💬 需填入 U 開頭的 userId 才可推播通知。引導顧客加入&nbsp;
              <a href={`https://line.me/R/ti/p/${SALON.lineOaId}`} target="_blank" rel="noreferrer"
                style={{ color:"#06C755", fontWeight:600, textDecoration:"none" }}>{SALON.lineOaId}</a>
              ，傳送「<b>查詢我的預約</b>」即可取得。
            </div>
          </div>
          <div>
            <label className="field-label">備注</label>
            <input value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="特殊需求或備注" className="field-input"/>
          </div>

          {/* Summary */}
          {form.customerName && form.time && (
            <div style={{ padding:".75rem 1rem", background:"var(--bg2)", borderRadius:"var(--r-sm)", border:"1px solid var(--line)", fontSize:".87rem", color:"var(--ink2)", lineHeight:1.8 }}>
              📋 {form.date} {form.time}｜{selSvcsM.map(s=>s.zh).join("・")}（{totalDurM}min）｜{stylistObj?.name}｜{form.customerName}
            </div>
          )}

          <button onClick={handleSubmit}
            disabled={!form.customerName||!form.customerPhone||!form.time||form.serviceIds.length===0}
            className="btn-copper"
            style={{ opacity:(!form.customerName||!form.customerPhone||!form.time||form.serviceIds.length===0)?.38:1, cursor:(!form.customerName||!form.customerPhone||!form.time||form.serviceIds.length===0)?"not-allowed":"pointer", fontSize:"1.32rem", letterSpacing:".12em" }}>
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
                  const svcList = booking ? getBookingSvcs(booking, SERVICES) : [];
                  const svc     = svcList[0] || null;
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
                          <div style={{ fontWeight:600 }}>{svcList.map(s=>s.zh).join("・") || svc?.zh}</div>
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
                  {isEditing
                    ? SERVICES.map(svc=>{
                        const on = (st.specialty||[]).includes(svc.zh);
                        return (
                          <span key={svc.id} onClick={()=>handleEditSpecialty(svc.zh)}
                            style={{ fontSize:".84rem", padding:".1rem .42rem", borderRadius:20, background:on?`rgba(${hexToRgb(st.color||"#c4835a")},.08)`:"rgba(0,0,0,.04)", color:on?st.color||"var(--copper)":"var(--ink4)", border:`1px solid ${on?`rgba(${hexToRgb(st.color||"#c4835a")},.2)`:"var(--line)"}`, cursor:"pointer", opacity:on?1:.45, transition:"all .15s" }}>
                            {svc.icon} {svc.zh}
                          </span>
                        );
                      })
                    : SERVICES.filter(svc=>(st.specialty||[]).includes(svc.zh)).map(svc=>(
                        <span key={svc.id}
                          style={{ fontSize:".84rem", padding:".1rem .42rem", borderRadius:20, background:`rgba(${hexToRgb(st.color||"#c4835a")},.08)`, color:st.color||"var(--copper)", border:`1px solid rgba(${hexToRgb(st.color||"#c4835a")},.2)` }}>
                          {svc.icon} {svc.zh}
                        </span>
                      ))
                  }
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

      {/* Header row — 新增服務 only visible when admin unlocked */}
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:"1rem" }}>
        {servicesMgr ? (
          <button onClick={()=>setShowAdd(true)} className="btn-copper" style={{ padding:".38rem .9rem", fontSize:".78rem", letterSpacing:".08em" }}>
            ＋ 新增服務
          </button>
        ) : (
          <button disabled title="請先解鎖管理後台"
            style={{ padding:".38rem .9rem", fontSize:".78rem", letterSpacing:".08em", borderRadius:20, border:"1px solid var(--line)", background:"var(--bg2)", color:"var(--ink4)", cursor:"not-allowed", display:"flex", alignItems:"center", gap:".3rem" }}>
            🔒 新增服務
          </button>
        )}
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
  const svcs  = getBookingSvcs(booking, SERVICES);
  const svc   = svcs[0] || null;  // primary (icon/color)
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
          <div style={{ fontSize:".94rem", color:"var(--ink)", fontWeight:600 }}>{svcs.map(s=>s.zh).join("・") || booking.serviceId}</div>
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
          ["費用", svcs.map(s=>`${s.price}${s.priceNote||""}`).join(" ＋ ") || "—"],
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
  const { bookings, loaded, fbReady, addBooking, updateStatus, deleteBooking } = useBookings();
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
      const svcs    = getBookingSvcs(booking, servicesMgr.services || DEFAULT_SERVICES);
      const svcName = svcs.map(s=>s.zh).join("・") || booking.serviceId || "";
      const stylist = (stylistsMgr.stylists || DEFAULT_STYLISTS).find(s => s.id === booking.stylistId);
      addBooking(booking);
      customerMgr.upsertFromBooking(booking, svcName, stylist?.name||"");
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
            <AdminSecretEntry onEnter={()=>setTab("calendar")} adminAuth={adminAuth} isMobile={isMobile} todayCount={todayBookings.length} pendingCount={pendingCount}/>
            {/* Firebase 連線狀態 */}
            <div title={FIREBASE_READY ? (fbReady ? "雲端同步正常" : "連線中…") : "未設定 Firebase（本機模式）"}
              style={{ width:28, height:28, borderRadius:"50%", background: FIREBASE_READY ? (fbReady?"rgba(99,179,237,.15)":"rgba(200,200,200,.2)") : "rgba(196,188,154,.1)", border:`1px solid ${FIREBASE_READY?(fbReady?"rgba(99,179,237,.5)":"rgba(180,180,180,.4)"):"rgba(196,188,154,.3)"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:".7rem" }}>
              {FIREBASE_READY
                ? <span style={{ width:7, height:7, borderRadius:"50%", background: fbReady?"#63b3ed":"#ccc", display:"inline-block", animation: fbReady?"none":"pulse 1.5s infinite" }}/>
                : <span style={{ color:"#c4bc9a", fontSize:"10px" }}>☁</span>
              }
            </div>
            {lineSettings?.webhookUrl && (
              <div style={{ width:28, height:28, borderRadius:"50%", background:"rgba(6,199,85,.1)", border:"1px solid rgba(6,199,85,.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:"#06C755", display:"inline-block" }}/>
              </div>
            )}
            {adminAuth.unlocked && (
              <button onClick={()=>{ adminAuth.lock(); setTab("book"); }}
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
          {TABS.filter(t => !ADMIN_TABS.has(t.id) || adminAuth.unlocked).map(t=>(
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
              {tab==="services" && <ServicesMenu isMobile={isMobile} servicesMgr={adminAuth.unlocked ? servicesMgr : null}/>}
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
