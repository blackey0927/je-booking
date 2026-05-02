/* =====================================================
   PWA 安裝說明
   ===================================================== */

/* ── STEP 1：把以下 <head> 標籤加進 public/index.html ── */

/*
  <!-- PWA manifest -->
  <link rel="manifest" href="/manifest.json" />

  <!-- iOS 主畫面支援 -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="JE快剪屋" />
  <link rel="apple-touch-icon" href="/icons/icon-192.png" />

  <!-- Android Chrome 主題色 -->
  <meta name="theme-color" content="#c9975a" />

  <!-- 避免雙擊縮放（行動端體驗） -->
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
*/


/* ── STEP 2：在 src/main.jsx（或 src/index.jsx）的最底部加入以下程式碼 ── */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then(reg => {
        console.log('[PWA] Service Worker 已註冊', reg.scope);

        /* 偵測到新版本時提示用戶更新 */
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              /* 可在這裡顯示「有新版本，點此更新」的提示 */
              console.log('[PWA] 新版本已就緒，重新整理即可更新');
            }
          });
        });
      })
      .catch(err => console.error('[PWA] 註冊失敗', err));
  });
}


/* ── STEP 3：在 App.jsx 中加入「加入主畫面」引導提示（選用） ── */

/*
  可在 App.jsx 頂部加入以下 Hook，偵測 iOS/Android 安裝提示：

  useEffect(() => {
    // Android：監聽 beforeinstallprompt 事件
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      window._pwaPrompt = e; // 儲存，之後按鈕點擊時呼叫
    });

    // iOS：偵測是否尚未安裝（顯示引導說明）
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone) {
      console.log('iOS 用戶尚未安裝，可顯示「分享 → 加入主畫面」引導');
    }
  }, []);

  // 觸發 Android 安裝提示的函式（綁定到按鈕的 onClick）：
  function triggerInstall() {
    if (window._pwaPrompt) {
      window._pwaPrompt.prompt();
      window._pwaPrompt.userChoice.then(result => {
        console.log('[PWA] 用戶選擇:', result.outcome);
        window._pwaPrompt = null;
      });
    }
  }
*/
