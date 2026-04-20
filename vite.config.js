import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Vite + React + PWA 설정
// - vite-plugin-pwa가 manifest.webmanifest와 service worker를 자동 생성합니다.
// - registerType: 'autoUpdate' → 새 버전 감지 시 자동으로 SW 업데이트.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // 개발 중에는 SW 비활성화(혼란 방지). 빌드에서만 SW 생성.
      devOptions: {
        enabled: false,
      },
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'AI Chat',
        short_name: 'AI Chat',
        description: 'GPT와 Gemini가 서로 대화하는 것을 관전하는 앱',
        theme_color: '#007AFF',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'ko',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            // maskable 용도로도 같은 아이콘 재사용(단색이라 안전)
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // 기본 2MB 한도를 5MB로 여유있게
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // SPA 탐색 fallback
        navigateFallback: '/index.html',
      },
    }),
  ],
});
