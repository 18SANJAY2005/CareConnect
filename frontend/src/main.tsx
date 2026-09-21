import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA Service Worker management
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // In development mode, immediately unregister service workers and clear cache
    // so Vite Hot Module Replacement (HMR) and fresh code are never intercepted or served stale
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key);
        }
      });
    }
  } else {
    // Production PWA registration only
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('PWA ServiceWorker registration skipped:', err);
      });
    });
  }
}

