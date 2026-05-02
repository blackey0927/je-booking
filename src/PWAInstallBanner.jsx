/* ═══════════════════════════════════════════════════════
   PWAInstallBanner.jsx
   iOS / Android 雙平台「加入主畫面」引導元件
   用法：在 App.jsx 最頂層加入 <PWAInstallBanner />
   ═══════════════════════════════════════════════════════ */

import { useState, useEffect } from "react";

export default function PWAInstallBanner() {
  const [show, setShow]         = useState(false);   // 是否顯示 Banner
  const [platform, setPlatform] = useState(null);    // "ios" | "android"
  const [deferredPrompt, setDeferredPrompt] = useState(null); // Android 安裝事件

  useEffect(() => {
    /* 已經是獨立 App 模式（已安裝），不顯示 */
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    /* 曾經關閉過 Banner，7 天內不再顯示 */
    const dismissed = localStorage.getItem("pwa-banner-dismissed");
    if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    const ua = navigator.userAgent;

    /* Android：監聽 Chrome 的安裝事件 */
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform("android");
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    /* iOS：Safari 偵測 */
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua);
    if (isIOS && isSafari) {
      setPlatform("ios");
      setShow(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  /* Android：觸發原生安裝對話框 */
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferredPrompt(null);
  };

  /* 關閉 Banner，記住 7 天 */
  const handleDismiss = () => {
    localStorage.setItem("pwa-banner-dismissed", String(Date.now()));
    setShow(false);
  };

  if (!show) return null;

  return (
    <>
      {/* 遮罩（點外部關閉） */}
      <div onClick={handleDismiss} style={styles.overlay} />

      {/* Banner 主體 */}
      <div style={styles.banner}>
        {/* 關閉按鈕 */}
        <button onClick={handleDismiss} style={styles.closeBtn} aria-label="關閉">✕</button>

        {/* App 圖示 + 標題 */}
        <div style={styles.header}>
          <div style={styles.appIcon}>JE</div>
          <div>
            <div style={styles.appName}>JE染燙快剪屋</div>
            <div style={styles.appSub}>加入主畫面，預約更方便</div>
          </div>
        </div>

        {/* 分隔線 */}
        <div style={styles.divider} />

        {/* iOS 說明步驟 */}
        {platform === "ios" && (
          <div>
            <p style={styles.stepTitle}>安裝步驟（Safari）</p>
            <div style={styles.steps}>
              <Step num="1" text="點下方工具列的「分享」按鈕" icon="⬆️" />
              <Step num="2" text="向下滑，找到「加入主畫面」" icon="➕" />
              <Step num="3" text="點「新增」，圖示會出現在桌面" icon="✅" />
            </div>
            <div style={styles.iosNote}>
              ⚠️ 請確認使用 Safari 瀏覽器開啟
            </div>
          </div>
        )}

        {/* Android 安裝按鈕 */}
        {platform === "android" && (
          <div>
            <p style={styles.stepTitle}>一鍵安裝到手機主畫面</p>
            <p style={styles.androidDesc}>
              安裝後啟動速度更快，支援離線瀏覽，<br />
              使用體驗與原生 App 完全相同
            </p>
            <button onClick={handleInstall} style={styles.installBtn}>
              安裝 App
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/* ── 小元件：步驟列 ── */
function Step({ num, text, icon }) {
  return (
    <div style={styles.step}>
      <div style={styles.stepNum}>{num}</div>
      <span style={styles.stepText}>{icon} {text}</span>
    </div>
  );
}

/* ── 樣式（行內物件，不依賴外部 CSS） ── */
const styles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.45)",
    zIndex: 9998,
  },
  banner: {
    position: "fixed",
    bottom: 0, left: 0, right: 0,
    background: "#fff",
    borderRadius: "24px 24px 0 0",
    padding: "24px 20px 40px",
    zIndex: 9999,
    boxShadow: "0 -8px 40px rgba(74,53,38,0.18)",
    animation: "slideUp 0.3s ease-out",
    maxWidth: 480,
    margin: "0 auto",
  },
  closeBtn: {
    position: "absolute", top: 16, right: 16,
    background: "#f5ede4", border: "none",
    borderRadius: "50%", width: 32, height: 32,
    cursor: "pointer", fontSize: 14,
    color: "#7a5c3e", fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  header: {
    display: "flex", alignItems: "center", gap: 14,
    marginBottom: 16,
  },
  appIcon: {
    width: 56, height: 56, borderRadius: 14,
    background: "linear-gradient(135deg, #4a3526, #c9975a)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18, fontWeight: 900, color: "#fff",
    flexShrink: 0,
    boxShadow: "0 4px 14px rgba(201,151,90,0.4)",
  },
  appName: {
    fontSize: 16, fontWeight: 800,
    color: "#2c1810", marginBottom: 3,
  },
  appSub: {
    fontSize: 12, color: "#9e8270",
  },
  divider: {
    height: 1, background: "rgba(201,151,90,0.15)",
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 13, fontWeight: 800,
    color: "#4a3526", marginBottom: 12,
    letterSpacing: "0.04em",
  },
  steps: {
    display: "flex", flexDirection: "column", gap: 10,
    marginBottom: 14,
  },
  step: {
    display: "flex", alignItems: "center", gap: 10,
  },
  stepNum: {
    width: 24, height: 24, borderRadius: "50%",
    background: "linear-gradient(135deg, #c9975a, #e8c99a)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 800, color: "#fff",
    flexShrink: 0,
    boxShadow: "0 2px 8px rgba(201,151,90,0.35)",
  },
  stepText: {
    fontSize: 13, color: "#4a3526", lineHeight: 1.5,
  },
  iosNote: {
    background: "#fef9c3",
    borderRadius: 10, padding: "8px 12px",
    fontSize: 11, color: "#854d0e", fontWeight: 600,
  },
  androidDesc: {
    fontSize: 13, color: "#7a5c3e",
    lineHeight: 1.7, marginBottom: 16,
  },
  installBtn: {
    width: "100%",
    background: "linear-gradient(135deg, #c9975a, #e8c99a)",
    border: "none", borderRadius: 28,
    padding: "14px 0",
    fontSize: 15, fontWeight: 900, color: "#fff",
    cursor: "pointer",
    boxShadow: "0 5px 18px rgba(201,151,90,0.45)",
    letterSpacing: "0.04em",
  },
};

/* ── 動畫（加在 global CSS 或 index.html <style> 裡） ──
   @keyframes slideUp {
     from { transform: translateY(100%); opacity: 0; }
     to   { transform: translateY(0);    opacity: 1; }
   }
── */
