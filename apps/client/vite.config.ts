import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [react(), wasm()],
  server: {
    host: '0.0.0.0',
    port: 8501,
    // Remove allowedHosts—Render doesn't need it
    proxy: {
      // Conditional proxy: Local dev -> localhost, Render -> backend Render URL
      '/api': process.env.NODE_ENV === 'production' 
        ? 'https://proposal-craft-utwe.onrender.com'  // Your backend Render URL
        : 'http://localhost:8000'
    },
  },
});
