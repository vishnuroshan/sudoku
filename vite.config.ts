import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Keep our existing public/site.webmanifest; don't generate a new one.
      manifest: false,
      // Include static assets in the precache manifest.
      includeAssets: [
        "favicon.ico",
        "favicon.svg",
        "apple-touch-icon.png",
        "favicon-96x96.png",
        "web-app-manifest-192x192.png",
        "web-app-manifest-512x512.png",
      ],
      workbox: {
        // Precache all JS, CSS, HTML and common asset types.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        // Remove stale precaches from previous SW versions automatically.
        cleanupOutdatedCaches: true,
        // Cache-first for same-origin assets; network-first for navigation.
        runtimeCaching: [
          {
            // Navigation requests: return cached app shell, update in background.
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages-cache",
              networkTimeoutSeconds: 3,
            },
          },
        ],
      },
      devOptions: {
        // Enable service worker in `vite dev` so you can test offline locally.
        enabled: true,
        type: "module",
      },
    }),
  ],
});
