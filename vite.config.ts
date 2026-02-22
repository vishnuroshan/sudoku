import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      // Auto-update the service worker whenever a new build is deployed
      registerType: "autoUpdate",

      // We manage our own manifest in public/site.webmanifest
      manifest: false,

      // Workbox config: precache all built assets for full offline support
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        // Fall back to index.html for client-side routing
        navigateFallback: "index.html",
        // Don't intercept API routes (add patterns here if you ever add one)
        navigateFallbackDenylist: [/^\/api\//],
      },

      // Set to true if you want the SW active during `vite dev`
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
