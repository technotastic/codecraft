// vite.config.mjs
import { defineConfig } from 'vite';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import monacoEditorPlugin from 'vite-plugin-monaco-editor'; // Standard import

// Define __dirname for ES module scope
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Helper to access the actual plugin function, accounting for nested 'default'
const resolveMonacoPlugin = (pluginImport) => {
  // Check if the import itself is the function (ESM default export)
  if (typeof pluginImport === 'function') {
    return pluginImport;
  }
  // Check if it's nested under '.default' (CommonJS module imported by ESM)
  if (pluginImport && typeof pluginImport.default === 'function') {
    return pluginImport.default;
  }
  // If neither, throw an error or return the import hoping it works
  console.error("Could not resolve monaco editor plugin function!");
  return pluginImport; // Fallback, might still fail
};

const actualMonacoPlugin = resolveMonacoPlugin(monacoEditorPlugin);

export default defineConfig({
  plugins: [
    react(),

    // Use the resolved plugin function
    actualMonacoPlugin({
        // Plugin options
        // languages: ['json', 'css', 'html', 'typescript', 'javascript']
        // By default, it includes common languages like JS, TS, CSS, HTML, JSON
    })

  ],
  build: {
    outDir: 'dist/renderer', // Keep output directory for renderer code
    emptyOutDir: true, // Ensure the directory is cleaned before build
  },
  resolve: {
    alias: {
      // Ensure aliases match tsconfig.json paths
      '@renderer': path.resolve(__dirname, './src/renderer'),
      '@main': path.resolve(__dirname, './src/main'),
      '@preload': path.resolve(__dirname, './src/preload'),
      // '@shared': path.resolve(__dirname, './src/shared'), // Uncomment if needed
    },
  },
  root: '.', // Project root containing index.html
  base: './', // Use relative paths for Electron production build
  server: {
     // Optional server options like port
     // port: 3000, // Default is 5173
     strictPort: true, // Throw error if port is already in use
   },
  optimizeDeps: {
    // force: true // Generally remove 'force: true' unless deps are causing issues
  }
});