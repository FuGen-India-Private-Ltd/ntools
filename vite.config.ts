import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// High-Performance Vite Configuration for Maximum Runtime & Startup Speed
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2022',
    minify: 'esbuild',
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom'],
          'pdf-suite': ['jspdf', 'pdf-lib', 'html2canvas', 'jszip'],
          'icons-core': ['lucide-react'],
        },
      },
    },
  },
});
