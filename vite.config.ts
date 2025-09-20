import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      base: process.env.NODE_ENV === 'production' ? '/Violet-Bananary/' : '/',
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || 'sk-chocokitty'),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || 'sk-chocokitty'),
        'process.env.GEMINI_API_BASE_URL': JSON.stringify(env.GEMINI_API_BASE_URL || 'https://yqdkzwnuarth.eu-central-1.clawcloudrun.com')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false
      }
    };
});
