// src/preload/index.ts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
// Import the shared types
import type {
    ReadDirectoryResponse, ReadFileResponse, SaveFileResponse,
    PtyCreateOptions, PtyResizeOptions, PtyCreateResponse // Import terminal types
} from '../shared.types';


// --- Define the shape of the API exposed to the Renderer ---
export interface ElectronAPI {
  // Basic example
  ping: () => Promise<string>;

  // Terminal specific API (MODIFIED FOR MULTIPLE TERMINALS)
  term_create: (options: PtyCreateOptions) => Promise<PtyCreateResponse>;
  term_write: (id: string, data: string) => void; // Requires ID
  term_resize: (id: string, options: PtyResizeOptions) => void; // Requires ID
  term_kill: (id: string) => Promise<{ success: boolean; error?: string }>; // New: Kill specific PTY
  // Listeners now include the ID in the callback
  term_onData: (callback: (id: string, data: string) => void) => () => void;
  term_onExit: (callback: (id: string, code?: number) => void) => () => void;
  term_onError: (callback: (id: string, errorMessage: string) => void) => () => void;

  // Dialog (Filesystem access via Main)
  dialog_openDirectory: () => Promise<string | null>; // Returns selected path or null

  // File System API
  fs_readDirectory: (folderPath: string) => Promise<ReadDirectoryResponse>; // Reads directory contents
  fs_readFile: (filePath: string) => Promise<ReadFileResponse>; // Reads file content
  fs_saveFile: (filePath: string, content: string) => Promise<SaveFileResponse>; // Saves file content

  // App/Window Control API
  app_quit: () => Promise<void>;
  window_toggleFullscreen: () => Promise<void>;
  window_toggleDevTools: () => Promise<void>;

  // --- NEW: Recent Folders API ---
  app_getRecentFolders: () => Promise<string[]>;
  // --- End New API ---
}

// --- Implementation of the API ---
const api: ElectronAPI = {
  ping: () => ipcRenderer.invoke('ping'),

  // Terminal methods (MODIFIED)
  term_create: (options) => ipcRenderer.invoke('pty-create', options),
  term_write: (id, data) => ipcRenderer.send('pty-input', id, data), // Send ID
  term_resize: (id, options) => ipcRenderer.send('pty-resize', id, options), // Send ID
  term_kill: (id) => ipcRenderer.invoke('pty-kill', id), // New invoke

  // Terminal listeners (MODIFIED - expect ID as first arg from main)
  term_onData: (callback) => {
    const subscription = (_event: IpcRendererEvent, id: string, data: string) => callback(id, data);
    ipcRenderer.on('pty-data', subscription);
    // Return a function to unsubscribe
    return () => {
      ipcRenderer.removeListener('pty-data', subscription);
      console.log("Preload: Unsubscribed from pty-data"); // DEBUG
    };
  },
  term_onExit: (callback) => {
     const subscription = (_event: IpcRendererEvent, id: string, code?: number) => callback(id, code);
     ipcRenderer.on('pty-exit', subscription);
     // Return a function to unsubscribe
     return () => {
       ipcRenderer.removeListener('pty-exit', subscription);
       console.log("Preload: Unsubscribed from pty-exit"); // DEBUG
     };
  },
  term_onError: (callback) => {
    const subscription = (_event: IpcRendererEvent, id: string, errorMessage: string) => callback(id, errorMessage);
    ipcRenderer.on('pty-error', subscription);
    // Return a function to unsubscribe
    return () => {
      ipcRenderer.removeListener('pty-error', subscription);
       console.log("Preload: Unsubscribed from pty-error"); // DEBUG
    };
 },

  // Dialog methods (Unchanged)
  dialog_openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),

  // File System Methods (Unchanged)
  fs_readDirectory: (folderPath) => ipcRenderer.invoke('fs:readDirectory', folderPath),
  fs_readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  fs_saveFile: (filePath, content) => ipcRenderer.invoke('fs:saveFile', filePath, content),

  // App/Window Control Methods (Unchanged)
  app_quit: () => ipcRenderer.invoke('app:quit'),
  window_toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  window_toggleDevTools: () => ipcRenderer.invoke('window:toggle-devtools'),

  // --- NEW: Recent Folders Implementation ---
  app_getRecentFolders: () => ipcRenderer.invoke('app:getRecentFolders'),
  // --- End New Implementation ---
};

// --- Expose the API to the Renderer process ---
try {
  contextBridge.exposeInMainWorld('electronAPI', api);
  console.log('Preload script exposed electronAPI successfully (including multi-terminal and app/window controls).');
} catch (error) {
  console.error('Error exposing context bridge in preload script:', error);
}