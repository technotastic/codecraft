// src/renderer/vite-env.d.ts
/// <reference types="vite/client" />

// Import the interface shape from the preload script
import type { ElectronAPI } from '@preload/index'; // Adjust path if needed, but '@preload/index' should work with TS paths config

// Extend the global Window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI; // Declare the property and its type
  }
}

// Optional: Keep this if you need process access in renderer (usually not recommended)
// declare const process: {
//     env: {
//         NODE_ENV: 'development' | 'production';
//         // Add other env variables if needed
//     };
// };