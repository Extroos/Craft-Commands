import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
    return {
      server: {

        port: parseInt(env.FRONTEND_PORT || env.PORT) || 3000,
        host: '0.0.0.0',
        allowedHosts: true, // Allow external tunnels (Cloudflare/Playit)
        hmr: {
            protocol: env.HTTPS === 'true' ? 'wss' : 'ws',
        },
        proxy: {
            '/api': {
                target: `http://127.0.0.1:${env.BACKEND_PORT || 3001}`,
                changeOrigin: true,
                secure: false,
            },
            '/socket.io': {
                target: `http://127.0.0.1:${env.BACKEND_PORT || 3001}`,
                ws: true,
                changeOrigin: true,
                secure: false,
            },
            '/uploads': {
                target: `http://127.0.0.1:${env.BACKEND_PORT || 3001}`,
                changeOrigin: true,
                secure: false,
            }
        }
      },

      plugins: [react()],
      build: {
        outDir: '../web/current',
        emptyOutDir: true
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
          '@features': path.resolve(__dirname, './src/features'),
          '@core': path.resolve(__dirname, './src/features/core'),
          '@shared': path.resolve(__dirname, '../shared'),
        }
      }
    };
});
