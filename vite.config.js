import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon-192.png", "icon-512.png", "icon-apple.png"],
      manifest: {
        name: "Vocal Warm-Up",
        short_name: "WarmUp",
        description: "ボイストレーニング用ピアノ伴奏アプリ",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#050710",
        theme_color: "#f0c884",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icon-apple.png",
            sizes: "180x180",
            type: "image/png",
          },
        ],
      },
      workbox: {
        // キャッシュ対象（音源URLはCDNなので除外）
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            // Salamander piano samples をキャッシュ（オフライン再生対応）
            urlPattern: /^https:\/\/tonejs\.github\.io\/audio\//,
            handler: "CacheFirst",
            options: {
              cacheName: "piano-samples",
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90日
              },
            },
          },
        ],
      },
    }),
  ],
});
