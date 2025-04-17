// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

// Define the shape of the API we're exposing
export interface ElectronAPI {
  ping: () => Promise<string>;
  // Add more functions here later:
  // readFile: (path: string) => Promise<string>;
  // onTerminalData: (callback: (data: string) => void) => void;
}

// Create the API object
const api: ElectronAPI = {
  ping: () => ipcRenderer.invoke('ping'),
  // readFile: (path) => ipcRenderer.invoke('read-file', path),
  // onTerminalData: (callback) => ipcRenderer.on('terminal-data', (_event, data) => callback(data)),
};

// Expose the API to the renderer process under 'window.electronAPI'
try {
  contextBridge.exposeInMainWorld('electronAPI', api);
  console.log('Preload script exposed electronAPI successfully.');
} catch (error) {
  console.error('Error exposing context bridge:', error);
}

// You can also expose other specific things if needed, but keep it minimal
// contextBridge.exposeInMainWorld('versions', {
//   node: () => process.versions.node,
//   chrome: () => process.versions.chrome,
//   electron: () => process.versions.electron
// });