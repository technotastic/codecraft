// src/renderer/vite-env.d.ts
/// <reference types="vite/client" />

// Import the interface shape from the preload script
import type { ElectronAPI } from '@preload/index'; // Path alias should work

// Extend the global Window interface
declare global {
  interface Window {
    // Ensure this declaration EXACTLY matches the exported interface from preload
    electronAPI: ElectronAPI;
  }
}