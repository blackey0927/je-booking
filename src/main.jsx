import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => {
        console.log("[PWA] Service Worker 已註冊", reg.scope);
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              console.log("[PWA] 新版本已就緒，重新整理即可更新");
            }
          });
        });
      })
      .catch((err) => console.error("[PWA] 註冊失敗", err));
  });
}
