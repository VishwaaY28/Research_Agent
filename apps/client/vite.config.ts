import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [react(), wasm()],
  server: {
    host: '0.0.0.0',
    allowedHosts: 'hex-author-s3l2.onrender.com',
    port: 8501,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
});

