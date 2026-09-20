// 시험 설정. 빌드 설정(vite.config.ts)과 분리한다 — PWA·청크 분할은 시험과 무관하다.
//
// 화면(src)과 서버(functions/src)를 함께 잡는다. 두 빌드는 분리돼 있지만
// 검증까지 나눌 이유는 없다. 돈이 걸린 셈은 서버에 있다.
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    include: ['src/**/*.test.ts', 'functions/src/**/*.test.ts'],
    environment: 'node',
  },
});
