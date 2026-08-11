import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import path from 'path';

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,   // prend le port suivant si 5173 est occupé
    open: false,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'es-toolkit/compat': path.resolve(__dirname, 'src/compat-shim.ts'),
    },
  },
  optimizeDeps: {
    include: ['lucide-react'],
  },
});
