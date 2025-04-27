// src/main/index.ts
import { app, BrowserWindow, shell, ipcMain, dialog, Menu, MenuItemConstructorOptions } from 'electron';
import path from 'node:path';
import os from 'node:os';
import * as pty from 'node-pty';
import fs from 'node:fs/promises';
import Store from 'electron-store'; // Static import restored

// Import shared types
import type {
    DirectoryEntry, ReadDirectoryResponse, ReadFileResponse, SaveFileResponse,
    PtyCreateOptions, PtyResizeOptions, PtyCreateResponse
} from '../shared.types';

// Define Store Schema Type
interface StoreSchema {
    recentFolders: string[];
}

// Global Variables
app.disableHardwareAcceleration();
const shellPath = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
const ptyInstances = new Map<string, pty.IPty>();
let mainWindow: BrowserWindow | null = null;
const MAX_RECENT_FOLDERS = 10;

// Initialize store directly
const store = new Store<StoreSchema>({
    schema: {
        recentFolders: { type: 'array', items: { type: 'string' }, default: [], maximum: MAX_RECENT_FOLDERS }
    },
    defaults: { recentFolders: [] }
});
console.log("Electron-store initialized directly.");

// Squirrel Startup Handler
if (app.isPackaged && process.platform === 'win32') {
    if (require('electron-squirrel-startup')) { app.quit(); }
}

// Create Application Menu
function createApplicationMenu() {
    // ... (Menu logic remains exactly as it was in the stable state) ...
    const isMac = process.platform === 'darwin';
    const template: MenuItemConstructorOptions[] = [
        ...(isMac ? [{ label: app.name, submenu: [ { role: 'about' }, { type: 'separator' }, { role: 'services' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' } ] }] : []) as MenuItemConstructorOptions[],
        { label: 'File', submenu: [ { label: 'Open Folder...', accelerator: 'CmdOrCtrl+O', click: async () => { if (mainWindow) { try { const folderPath = await handleOpenDirectoryDialog(); if (folderPath) { console.log(`Menu: Folder opened - ${folderPath}`); } } catch(err) { console.error("Menu: Error opening directory dialog:", err); } } } }, { type: 'separator' }, isMac ? { role: 'close' } : { role: 'quit' } ] },
        { label: 'Edit', submenu: [ { role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, ...(isMac ? [ { role: 'pasteAndMatchStyle' }, { role: 'delete' }, { role: 'selectAll' }, { type: 'separator' }, { label: 'Speech', submenu: [ { role: 'startSpeaking' }, { role: 'stopSpeaking' } ] } ] : [ { role: 'delete' }, { type: 'separator' }, { role: 'selectAll' } ]) as MenuItemConstructorOptions[] ] },
        { label: 'View', submenu: [ { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' } ] },
        { label: 'Window', submenu: [ { role: 'minimize' }, { role: 'zoom' }, ...(isMac ? [ { type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' } ] : [ { role: 'close' } ]) as MenuItemConstructorOptions[] ] },
        { role: 'help', submenu: [ { label: 'Learn More (Electron)', click: async () => { await shell.openExternal('https://electronjs.org') } } ] }
    ];
    const menu = Menu.buildFromTemplate(template); Menu.setApplicationMenu(menu); console.log("Application menu created and set.");
}

// Create Main Window
function createWindow() {
    // ... (Window creation logic remains exactly as it was in the stable state) ...
    console.log('Creating main window...'); mainWindow = new BrowserWindow({ width: 1200, height: 800, fullscreen: true, webPreferences: { preload: path.join(__dirname, '../preload/index.js'), nodeIntegration: false, contextIsolation: true, }, }); const isDev = !app.isPackaged; const VITE_DEV_SERVER_URL = 'http://localhost:5173'; if (isDev && VITE_DEV_SERVER_URL) { mainWindow.loadURL(VITE_DEV_SERVER_URL).catch(err => console.error('Failed to load DEV URL:', err)); } else { const prodPath = path.join(__dirname, '..', 'renderer', 'index.html'); mainWindow.loadFile(prodPath).catch(err => console.error(`Failed to load PROD file: ${prodPath}`, err)); } mainWindow.webContents.setWindowOpenHandler(({ url }) => { if (url.startsWith('http:') || url.startsWith('https:')) { shell.openExternal(url); } return { action: 'deny' }; }); mainWindow.webContents.on('render-process-gone', (_event, details) => { console.error('Renderer process gone:', details); }); mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => { console.error(`Failed to load URL: ${validatedURL}, ErrorCode: ${errorCode}, Description: ${errorDescription}`); }); mainWindow.on('closed', () => { console.log('Main window closed.'); ptyInstances.forEach((pty, id) => { try { pty.kill(); } catch (e) { console.warn(`Error killing PTY ID ${id}:`, e); } }); ptyInstances.clear(); mainWindow = null; });
}

// Kill Specific PTY Process
function killPtyProcess(id: string) {
    // ... (Kill PTY logic remains exactly as it was in the stable state) ...
    const ptyProcess = ptyInstances.get(id); if (ptyProcess) { console.log(`Killing PTY process ID: ${id} (PID: ${ptyProcess.pid})`); try { ptyProcess.kill(); } catch (e) { console.warn(`Error killing PTY ID ${id}:`, e); } finally { ptyInstances.delete(id); console.log(`PTY process ID: ${id} removed from map.`); } } else { console.warn(`Attempted to kill PTY process ID: ${id}, but it was not found in the map.`); }
}

// --- Add Path to Recent Folders with Logging ---
function addPathToRecentFolders(folderPath: string) {
    try {
        console.log(`[Recents] Attempting to add: ${folderPath}`); // Log input
        const currentRecents = store.get('recentFolders', []);
        console.log(`[Recents] Current list BEFORE add:`, currentRecents); // Log current state

        const filteredRecents = currentRecents.filter((p: string) => p !== folderPath);
        console.log(`[Recents] List AFTER filtering out '${folderPath}':`, filteredRecents); // Log after filter

        const newRecents = [folderPath, ...filteredRecents].slice(0, MAX_RECENT_FOLDERS);
        console.log(`[Recents] New list BEFORE saving (limit ${MAX_RECENT_FOLDERS}):`, newRecents); // Log final list

        store.set('recentFolders', newRecents);
        console.log('[Recents] Store updated. New list in store should be:', store.get('recentFolders')); // Verify store content
    } catch (error) { console.error('[Recents] Failed to update recent folders:', error); }
}
// --- End Logging Modification ---

// Handle Open Directory Dialog
async function handleOpenDirectoryDialog(): Promise<string | null> {
    // ... (Dialog logic remains same, calls addPathToRecentFolders) ...
    if (!mainWindow) return null; const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] }); if (canceled || filePaths.length === 0) { return null; } else { const selectedPath = filePaths[0]; addPathToRecentFolders(selectedPath); return selectedPath; }
}

// Setup IPC Handlers
function setupIpcHandlers() {
    // ... (IPC setup logic remains exactly as it was in the stable state, including app:getRecentFolders) ...
    console.log('Setting up IPC Handlers...');
    ipcMain.handle('ping', () => 'pong from main!');
    ipcMain.handle('pty-create', async (_event, options: PtyCreateOptions): Promise<PtyCreateResponse> => { if (!mainWindow) { return { success: false, error: "Main window not available." }; } const targetWebContents = mainWindow.webContents; const { id, cols, rows } = options; if (!id) { return { success: false, error: "Missing terminal ID." }; } if (ptyInstances.has(id)) { killPtyProcess(id); } try { const cwd = process.env.HOME || process.env.USERPROFILE || process.cwd(); const newPtyProcess = pty.spawn(shellPath, [], { name: 'xterm-color', cols: cols || 80, rows: rows || 24, cwd: cwd, env: { ...process.env }, }); ptyInstances.set(id, newPtyProcess); newPtyProcess.onData(data => { if (targetWebContents && !targetWebContents.isDestroyed()) { targetWebContents.send('pty-data', id, data); } }); newPtyProcess.onExit(({ exitCode, signal }) => { if (targetWebContents && !targetWebContents.isDestroyed()) { targetWebContents.send('pty-exit', id, exitCode); if (exitCode !== 0 || signal) { targetWebContents.send('pty-error', id, `Process exited abnormally (Code: ${exitCode}, Signal: ${signal})`); } } ptyInstances.delete(id); console.log(`PTY process ID: ${id} removed from map due to exit.`); }); return { success: true }; } catch (error) { const errorMsg = error instanceof Error ? error.message : String(error); if (targetWebContents && !targetWebContents.isDestroyed()) { targetWebContents.send('pty-error', id, `Failed to spawn PTY: ${errorMsg}`); } if (ptyInstances.has(id)) { ptyInstances.delete(id); } return { success: false, error: errorMsg }; } });
    ipcMain.on('pty-input', (_event, id: string, data: string) => { const ptyProcess = ptyInstances.get(id); if (ptyProcess) { try { ptyProcess.write(data); } catch (error) { const errorMsg = error instanceof Error ? error.message : String(error); console.error(`Error writing to PTY ID ${id}:`, error); mainWindow?.webContents.send('pty-error', id, `Write Error: ${errorMsg}`); } } else { console.warn(`pty-input: PTY process with ID ${id} not found.`); } });
    ipcMain.on('pty-resize', (_event, id: string, options: PtyResizeOptions) => { const ptyProcess = ptyInstances.get(id); if (ptyProcess) { if (options.cols > 0 && options.rows > 0) { try { ptyProcess.resize(options.cols, options.rows); } catch (error) { const errorMsg = error instanceof Error ? error.message : String(error); console.error(`Failed to resize PTY ID ${id}:`, error); mainWindow?.webContents.send('pty-error', id, `Resize Error: ${errorMsg}`); } } else { console.warn(`Invalid resize for PTY ID ${id}: ${options.cols}x${options.rows}`); } } else { console.warn(`pty-resize: PTY process with ID ${id} not found.`); } });
    ipcMain.handle('pty-kill', async (_event, id: string) => { if (!id) { return { success: false, error: "Missing terminal ID." }; } try { killPtyProcess(id); return { success: true }; } catch(error) { const errorMsg = error instanceof Error ? error.message : String(error); console.error(`Error processing kill request for PTY ID ${id}:`, error); return { success: false, error: errorMsg }; } });
    ipcMain.handle('dialog:openDirectory', async () => { return handleOpenDirectoryDialog(); });
    ipcMain.handle('fs:readDirectory', async (_event, folderPath: string): Promise<ReadDirectoryResponse> => { try { if (!folderPath || typeof folderPath !== 'string') { throw new Error("Invalid folder path."); } const stats = await fs.stat(folderPath); if (!stats.isDirectory()) { throw new Error("Not a directory."); } const dirents = await fs.readdir(folderPath, { withFileTypes: true }); const entries: DirectoryEntry[] = dirents.map(d => ({ name: d.name, path: path.join(folderPath, d.name), isDirectory: d.isDirectory() })); entries.sort((a, b) => { if (a.isDirectory !== b.isDirectory) { return a.isDirectory ? -1 : 1; } return a.name.localeCompare(b.name); }); return { success: true, entries: entries }; } catch (error) { const errorMsg = error instanceof Error ? error.message : String(error); if (error instanceof Error && 'code' in error) { if (error.code === 'EACCES') return { success: false, error: `Permission denied: ${folderPath}` }; if (error.code === 'ENOENT') return { success: false, error: `Not found: ${folderPath}` }; } return { success: false, error: errorMsg }; } });
    ipcMain.handle('fs:readFile', async (_event, filePath: string): Promise<ReadFileResponse> => { try { if (!filePath || typeof filePath !== 'string') { throw new Error("Invalid file path."); } const stats = await fs.stat(filePath); if (!stats.isFile()) { throw new Error("Not a file."); } const content = await fs.readFile(filePath, { encoding: 'utf-8' }); return { success: true, content: content }; } catch (error) { const errorMsg = error instanceof Error ? error.message : String(error); if (error instanceof Error && 'code' in error) { if (error.code === 'EACCES') return { success: false, error: `Permission denied: ${filePath}` }; if (error.code === 'ENOENT') return { success: false, error: `Not found: ${filePath}` }; } return { success: false, error: errorMsg }; } });
    ipcMain.handle('fs:saveFile', async (_event, filePath: string, content: string): Promise<SaveFileResponse> => { try { if (!filePath || typeof filePath !== 'string') { throw new Error("Invalid file path."); } if (content === undefined || content === null) { throw new Error("Invalid content."); } await fs.writeFile(filePath, content, { encoding: 'utf-8' }); return { success: true }; } catch (error) { const errorMsg = error instanceof Error ? error.message : String(error); if (error instanceof Error && 'code' in error) { if (error.code === 'EACCES') return { success: false, error: `Permission denied: ${filePath}` }; if (error.code === 'ENOENT') return { success: false, error: `Directory not found for: ${filePath}` }; } return { success: false, error: errorMsg }; } });
    ipcMain.handle('app:quit', () => { app.quit(); });
    ipcMain.handle('window:toggle-fullscreen', () => { if (mainWindow) { mainWindow.setFullScreen(!mainWindow.isFullScreen()); } });
    ipcMain.handle('window:toggle-devtools', () => { if (mainWindow) { mainWindow.webContents.toggleDevTools(); } });
    ipcMain.handle('app:getRecentFolders', async (): Promise<string[]> => { try { const recents = store.get('recentFolders', []); return Array.isArray(recents) ? recents : []; } catch (error) { console.error("IPC Error: Failed to get recent folders:", error); return []; } });

    console.log('IPC Handlers registered.');
}

// App Lifecycle Events
app.whenReady().then(() => {
  console.log('App is ready.');
  setupIpcHandlers(); // Called directly now
  createApplicationMenu();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) { createWindow(); } });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') { app.quit(); } });
app.on('will-quit', () => { ptyInstances.forEach((pty, id) => { try { pty.kill(); } catch (e) { console.warn(`Error killing PTY ID ${id}:`, e); } }); ptyInstances.clear(); });
process.on('uncaughtException', (error: Error) => { console.error('Uncaught Main Process Exception:', error); if (error.message.includes('EPIPE')) { console.warn("Ignoring EPIPE error."); return; } dialog.showErrorBox('Unhandled Main Process Error', `${error.name}: ${error.message}\n${error.stack ?? ''}`); });