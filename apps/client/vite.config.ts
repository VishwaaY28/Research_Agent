import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [react(), wasm()],
  server: {
    //allowedHosts: [ 'hex-author-s3l2.onrender.com'],
    host: '0.0.0.0',
    port: 8501,
    // Remove allowedHosts—Render doesn't need it
    proxy: {
      // Always proxy API calls to your local backend when running vite dev on 8501
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    },
  },
});
