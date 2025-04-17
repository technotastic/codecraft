// src/preload/index.ts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// --- Define the shape of the API ---
export interface ElectronAPI {
  ping: () => Promise<string>; // Keep existing example if desired

  // Terminal specific API
  term_create: (options: { cols: number; rows: number }) => Promise<void>; // Send initial dimensions
  term_write: (data: string) => void; // Send data (user input) to PTY
  term_resize: (options: { cols: number; rows: number }) => void; // Send resize info to PTY
  // Setup listeners that will call the provided callback functions
  // These return a function to unsubscribe the listener
  term_onData: (callback: (data: string) => void) => () => void;
  term_onExit: (callback: (code?: number) => void) => () => void;
}

// --- Create the API object ---
const api: ElectronAPI = {
  ping: () => ipcRenderer.invoke('ping'),

  // Terminal methods
  term_create: (options) => ipcRenderer.invoke('pty-create', options),
  term_write: (data) => ipcRenderer.send('pty-input', data), // Use send for fire-and-forget
  term_resize: (options) => ipcRenderer.send('pty-resize', options), // Use send

  term_onData: (callback) => {
    // Wrapper function to ensure correct types in listener
    const subscription = (_event: IpcRendererEvent, data: string) => {
        callback(data);
    };
    // Listen for data coming FROM the main process
    ipcRenderer.on('pty-data', subscription);

    // Return an unsubscribe function
    return () => {
        ipcRenderer.removeListener('pty-data', subscription);
    };
  },

  term_onExit: (callback) => {
     // Wrapper function
     const subscription = (_event: IpcRendererEvent, code?: number) => {
         callback(code);
     };
     ipcRenderer.on('pty-exit', subscription);

     // Return an unsubscribe function
     return () => {
         ipcRenderer.removeListener('pty-exit', subscription);
     };
  },
};

// Expose the API to the renderer process under 'window.electronAPI'
try {
  contextBridge.exposeInMainWorld('electronAPI', api);
  console.log('Preload script exposed electronAPI successfully (including terminal methods).');
} catch (error) {
  console.error('Error exposing context bridge:', error);
}