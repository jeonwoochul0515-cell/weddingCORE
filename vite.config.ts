import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'weddingCORE',
        short_name: 'weddingCORE',
        description: '국제결혼중개업 법률 컴플라이언스 플랫폼',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    modulePreload: {
      // Firebase는 로그인 이후 화면에서만 쓴다. 동적 import로 분리해도 Vite가
      // 미리 받도록 preload 목록에 넣어, 홈만 보러 온 방문자까지 530KB를 받게 된다.
      resolveDependencies: (_url, deps) =>
        deps.filter((dep) => !/firebase|\/auth-/.test(dep)),
    },
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('firebase')) return 'firebase';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('react') || id.includes('scheduler')) return 'react';
          return 'vendor';
        },
      },
    },
  },
});
