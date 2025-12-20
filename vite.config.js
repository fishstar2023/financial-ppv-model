import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5176,
    watch: {
      // Avoid infinite restarts when editors touch .env/.env.local
      ignored: ['**/.env*'],
    },
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
});
