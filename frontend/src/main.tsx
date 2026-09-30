import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "leaflet/dist/leaflet.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA Service Worker management
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log(
          "CareConnect PWA Service Worker active:",
          registration.scope,
        );
      })
      .catch((err) => {
        console.warn("PWA ServiceWorker registration error:", err);
      });
  });
}
