// --- START FILE: vite.config.mjs ---
// vite.config.mjs
import { defineConfig } from 'vite';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';
// *** CHANGE THIS IMPORT ***
// import nodePolyfills from 'vite-plugin-node-stdlib-browser';
import { nodePolyfills } from 'vite-plugin-node-polyfills'; // Import the new plugin


// Define __dirname for ES module scope
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Helper to access the actual plugin function
const resolveMonacoPlugin = (pluginImport) => {
  if (typeof pluginImport === 'function') return pluginImport;
  if (pluginImport && typeof pluginImport.default === 'function') return pluginImport.default;
  console.error("Could not resolve monaco editor plugin function!");
  return pluginImport;
};
const actualMonacoPlugin = resolveMonacoPlugin(monacoEditorPlugin);


export default defineConfig({
  plugins: [
    react(),
    actualMonacoPlugin({ /* ... */ }),
    // *** Use the new plugin ***
    nodePolyfills({
      // Options (optional):
      // To exclude specific polyfills, add them to this list.
      // For example, if you don't want process polyfilled:
      // exclude: ['process'],
      // To include globals like Buffer and process:
      globals: {
        Buffer: true, // Default: true
        global: true, // Default: true
        process: true, // Default: true
      },
      // Whether to polyfill `node:` protocol imports.
      protocolImports: true, // Default: true
    })
  ],
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@main': path.resolve(__dirname, './src/main'),
      '@preload': path.resolve(__dirname, './src/preload'),
      // Let the plugin handle polyfills
    },
  },
  root: '.',
  base: './',
  server: {
     strictPort: true,
     hmr: {}
   },
  optimizeDeps: {}
});
// --- END FILE: vite.config.mjs ---