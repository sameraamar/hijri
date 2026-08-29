import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const entry = (file: string) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: entry('index.html'),
        embed: entry('embed.html')
      },
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (
            normalizedId.includes('node_modules/react/') ||
            normalizedId.includes('node_modules/react-dom/') ||
            normalizedId.includes('node_modules/react-router-dom/')
          ) {
            return 'react-vendor';
          }
          if (normalizedId.includes('node_modules/leaflet/')) {
            return 'leaflet';
          }
          if (normalizedId.includes('node_modules/astronomy-engine/')) {
            return 'astronomy-engine';
          }
          if (normalizedId.includes('/src/i18n/')) {
            return 'i18n';
          }
        }
      }
    }
  }
});
