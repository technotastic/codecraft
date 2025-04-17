// vite.config.ts (Reverted to last valid state)
import { defineConfig } from 'vite';
import path from 'node:path';
import electronRenderer from 'vite-plugin-electron-renderer';
import react from '@vitejs/plugin-react';
import { rmSync } from 'node:fs';

export default defineConfig({
  plugins: [
    react(),
    electronRenderer({}),
  ],
  build: {
    outDir: 'dist/renderer',
  },
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@main': path.resolve(__dirname, './src/main'),
      '@preload': path.resolve(__dirname, './src/preload'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  root: '.',
  server: {
     // Optional server options like port can go here
   },
  optimizeDeps: {
    force: true // To force re-bundling
  }
});