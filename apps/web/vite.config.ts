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
      }
    }
  }
});
