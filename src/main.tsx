import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ─── GLOBAL ERROR CATCHER ───────────────────────────────────────────────────
// Shows errors on screen instead of white screen - remove after bug is fixed

const showError = (msg: string) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="
        position:fixed;inset:0;background:#fff;
        font-family:monospace;padding:20px;
        overflow:auto;z-index:99999;
      ">
        <h2 style="color:red;font-size:16px;margin-bottom:12px">
          ❌ App Error
        </h2>
        <pre style="
          background:#fee;border:1px solid #faa;
          padding:12px;border-radius:8px;
          font-size:12px;white-space:pre-wrap;word-break:break-all;
          color:#900;
        ">${msg}</pre>
        <p style="margin-top:12px;font-size:11px;color:#666">
          Screenshot this and send to developer
        </p>
      </div>
    `;
  }
};

window.addEventListener('error', (e) => {
  showError(`JS ERROR:\n${e.message}\n\nFile: ${e.filename}\nLine: ${e.lineno}:${e.colno}\n\nStack:\n${e.error?.stack || 'no stack'}`);
});

window.addEventListener('unhandledrejection', (e) => {
  showError(`UNHANDLED PROMISE:\n${e.reason?.message || String(e.reason)}\n\nStack:\n${e.reason?.stack || 'no stack'}`);
});

// ─── RENDER ─────────────────────────────────────────────────────────────────

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (e: any) {
  showError(`RENDER CRASH:\n${e?.message}\n\nStack:\n${e?.stack}`);
}
