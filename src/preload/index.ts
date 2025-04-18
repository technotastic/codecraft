// src/preload/index.ts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// --- Define the shape of the API exposed to the Renderer ---
export interface ElectronAPI {
  // Basic example
  ping: () => Promise<string>;

  // Terminal specific API
  term_create: (options: { cols: number; rows: number }) => Promise<{ success: boolean; error?: string }>; // Return success/error status
  term_write: (data: string) => void; // Send data (user input) to PTY
  term_resize: (options: { cols: number; rows: number }) => void; // Send resize info to PTY

  // Listeners for events FROM Main process TO Renderer
  // These return an unsubscribe function
  term_onData: (callback: (data: string) => void) => () => void;
  term_onExit: (callback: (code?: number) => void) => () => void;
  term_onError: (callback: (errorMessage: string) => void) => () => void; // Listener for PTY errors

  // Dialog (Filesystem access via Main)
  dialog_openDirectory: () => Promise<string | null>; // Returns selected path or null
}

// --- Implementation of the API ---
const api: ElectronAPI = {
  ping: () => ipcRenderer.invoke('ping'),

  // Terminal methods
  term_create: (options) => ipcRenderer.invoke('pty-create', options),
  term_write: (data) => ipcRenderer.send('pty-input', data), // 'send' is fire-and-forget
  term_resize: (options) => ipcRenderer.send('pty-resize', options), // 'send' is fire-and-forget

  // Setup listeners for Main -> Renderer communication
  term_onData: (callback) => {
    const subscription = (_event: IpcRendererEvent, data: string) => callback(data);
    ipcRenderer.on('pty-data', subscription);
    // Return the unsubscribe function
    return () => {
      ipcRenderer.removeListener('pty-data', subscription);
    };
  },

  term_onExit: (callback) => {
     const subscription = (_event: IpcRendererEvent, code?: number) => callback(code);
     ipcRenderer.on('pty-exit', subscription);
     // Return the unsubscribe function
     return () => {
       ipcRenderer.removeListener('pty-exit', subscription);
     };
  },

  term_onError: (callback) => {
    const subscription = (_event: IpcRendererEvent, errorMessage: string) => callback(errorMessage);
    ipcRenderer.on('pty-error', subscription); // Listen for 'pty-error' channel from main
    // Return the unsubscribe function
    return () => {
      ipcRenderer.removeListener('pty-error', subscription);
    };
 },

  // Dialog methods
  dialog_openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
};

// --- Expose the API to the Renderer process ---
try {
  contextBridge.exposeInMainWorld('electronAPI', api);
  console.log('Preload script exposed electronAPI successfully.');
} catch (error) {
  console.error('Error exposing context bridge in preload script:', error);
}