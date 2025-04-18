// --- START FILE: src/preload/index.ts ---
// src/preload/index.ts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
// Import the shared types
import type { ReadDirectoryResponse, ReadFileResponse, SaveFileResponse } from '../shared.types';


// --- Define the shape of the API exposed to the Renderer ---
export interface ElectronAPI {
  // Basic example
  ping: () => Promise<string>;

  // Terminal specific API
  term_create: (options: { cols: number; rows: number }) => Promise<{ success: boolean; error?: string }>;
  term_write: (data: string) => void;
  term_resize: (options: { cols: number; rows: number }) => void;
  term_onData: (callback: (data: string) => void) => () => void;
  term_onExit: (callback: (code?: number) => void) => () => void;
  term_onError: (callback: (errorMessage: string) => void) => () => void;

  // Dialog (Filesystem access via Main)
  dialog_openDirectory: () => Promise<string | null>; // Returns selected path or null

  // --- NEW File System API ---
  fs_readDirectory: (folderPath: string) => Promise<ReadDirectoryResponse>; // Reads directory contents
  fs_readFile: (filePath: string) => Promise<ReadFileResponse>; // Reads file content
  fs_saveFile: (filePath: string, content: string) => Promise<SaveFileResponse>; // Saves file content
}

// --- Implementation of the API ---
const api: ElectronAPI = {
  ping: () => ipcRenderer.invoke('ping'),

  // Terminal methods
  term_create: (options) => ipcRenderer.invoke('pty-create', options),
  term_write: (data) => ipcRenderer.send('pty-input', data),
  term_resize: (options) => ipcRenderer.send('pty-resize', options),

  // Terminal listeners
  term_onData: (callback) => {
    const subscription = (_event: IpcRendererEvent, data: string) => callback(data);
    ipcRenderer.on('pty-data', subscription);
    return () => {
      ipcRenderer.removeListener('pty-data', subscription);
    };
  },
  term_onExit: (callback) => {
     const subscription = (_event: IpcRendererEvent, code?: number) => callback(code);
     ipcRenderer.on('pty-exit', subscription);
     return () => {
       ipcRenderer.removeListener('pty-exit', subscription);
     };
  },
  term_onError: (callback) => {
    const subscription = (_event: IpcRendererEvent, errorMessage: string) => callback(errorMessage);
    ipcRenderer.on('pty-error', subscription);
    return () => {
      ipcRenderer.removeListener('pty-error', subscription);
    };
 },

  // Dialog methods
  dialog_openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),

  // --- NEW File System Methods ---
  fs_readDirectory: (folderPath) => ipcRenderer.invoke('fs:readDirectory', folderPath),
  fs_readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  fs_saveFile: (filePath, content) => ipcRenderer.invoke('fs:saveFile', filePath, content),
};

// --- Expose the API to the Renderer process ---
try {
  contextBridge.exposeInMainWorld('electronAPI', api);
  console.log('Preload script exposed electronAPI successfully (including fs methods).');
} catch (error) {
  console.error('Error exposing context bridge in preload script:', error);
}
// --- END FILE: src/preload/index.ts ---