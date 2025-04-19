// --- START FILE: src/main/index.ts ---
// src/main/index.ts
// *** Import Menu ***
import { app, BrowserWindow, shell, ipcMain, dialog, Menu, MenuItemConstructorOptions } from 'electron';
import path from 'node:path';
import os from 'node:os';
import * as pty from 'node-pty';
import fs from 'node:fs/promises'; // Import fs promises

// Import shared types (ensure paths are correct in your tsconfig for build)
import type { DirectoryEntry, ReadDirectoryResponse, ReadFileResponse, SaveFileResponse } from '../shared.types';

// --- Global Variables ---
app.disableHardwareAcceleration();
const shellPath = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
let ptyProcess: pty.IPty | null = null;
let mainWindow: BrowserWindow | null = null;


// --- Squirrel Startup Handler (Windows Installer) ---
if (app.isPackaged && process.platform === 'win32') {
    if (require('electron-squirrel-startup')) {
      app.quit();
    }
}

// *** NEW: Function to create the application menu ***
function createApplicationMenu() {
    const isMac = process.platform === 'darwin';

    const template: MenuItemConstructorOptions[] = [
        // { role: 'appMenu' } // Mac-specific File menu items
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' } // Cmd+Q
            ]
        }] : []) as MenuItemConstructorOptions[],
        // { role: 'fileMenu' } // Standard File menu
        {
            label: 'File',
            submenu: [
                // Add Open Folder here if needed, although sidebar button is primary
                // { label: 'Open Folder...', click: () => { /* TODO: Trigger IPC for dialog */ }},
                // { type: 'separator' },
                isMac ? { role: 'close' } : { role: 'quit' } // Alt+F4 (Win/Linux), Cmd+W (Mac) vs Cmd+Q
            ]
        },
        // { role: 'editMenu' }
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                ...(isMac ? [
                    { role: 'pasteAndMatchStyle' },
                    { role: 'delete' },
                    { role: 'selectAll' },
                    { type: 'separator' },
                    {
                        label: 'Speech',
                        submenu: [
                            { role: 'startSpeaking' },
                            { role: 'stopSpeaking' }
                        ]
                    }
                ] : [
                    { role: 'delete' },
                    { type: 'separator' },
                    { role: 'selectAll' }
                ]) as MenuItemConstructorOptions[]
            ]
        },
        // { role: 'viewMenu' }
        {
            label: 'View',
            submenu: [
                { role: 'reload' }, // Ctrl+R / Cmd+R
                { role: 'forceReload' }, // Ctrl+Shift+R / Cmd+Shift+R
                { role: 'toggleDevTools' }, // F12 / Ctrl+Shift+I / Cmd+Option+I
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' } // F11 / Ctrl+Cmd+F
            ]
        },
        // { role: 'windowMenu' } // Standard Window menu (Minimize, Zoom, etc.)
         {
             label: 'Window',
             submenu: [
                 { role: 'minimize' },
                 { role: 'zoom' },
                 ...(isMac ? [
                     { type: 'separator' },
                     { role: 'front' },
                     { type: 'separator' },
                     { role: 'window' }
                 ] : [
                     { role: 'close' } // Closes the window, not quit app
                 ]) as MenuItemConstructorOptions[]
             ]
         },
         // { role: 'help' } // Optional Help menu
         {
            role: 'help',
            submenu: [
                {
                    label: 'Learn More (Electron)',
                    click: async () => {
                        await shell.openExternal('https://electronjs.org')
                    }
                }
            ]
         }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    console.log("Application menu created and set.");
}


// --- Main Window Creation Function ---
function createWindow() {
  console.log('Creating main window...');
  mainWindow = new BrowserWindow({
    width: 1200, // Initial width (will be overridden by fullscreen)
    height: 800, // Initial height (will be overridden by fullscreen)
    fullscreen: true, // <<< SET TO START FULLSCREEN
    webPreferences: {
      // __dirname here refers to dist-electron/main
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = !app.isPackaged;
  const VITE_DEV_SERVER_URL = 'http://localhost:5173';

  console.log(`>>> DEBUG: app.isPackaged = ${app.isPackaged}, therefore isDev = ${isDev}`);

  if (isDev && VITE_DEV_SERVER_URL) {
    console.log(`Loading DEV URL: ${VITE_DEV_SERVER_URL}`);
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
      .catch(err => console.error('Failed to load DEV URL:', err));
    // mainWindow.webContents.openDevTools(); // <<< COMMENTED OUT TO HIDE DEV TOOLS
  } else {
    console.log('Loading PROD build file');
    // Adjust path relative to __dirname (dist-electron/main)
    const prodPath = path.join(__dirname, '..', 'renderer', 'index.html'); // Corrected path
    console.log(`Attempting to load production file: ${prodPath}`);
    mainWindow.loadFile(prodPath)
       .catch(err => console.error(`Failed to load PROD file: ${prodPath}`, err));
  }

  // --- Window Event Handlers ---
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
        shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process gone:', details);
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`Failed to load URL: ${validatedURL}, ErrorCode: ${errorCode}, Description: ${errorDescription}`);
   });

  mainWindow.on('closed', () => {
    console.log('Main window closed.');
    if (ptyProcess) {
        console.log('Killing PTY process due to window close.');
        ptyProcess.kill();
        ptyProcess = null;
    }
    mainWindow = null;
  });

}

// --- Function to Setup IPC Handlers ---
function setupIpcHandlers() {
    console.log('Setting up IPC Handlers...');

    // Basic Ping Example
    ipcMain.handle('ping', () => 'pong from main!');

    // --- PTY Handlers ---
    ipcMain.handle('pty-create', async (_event, options: { cols: number; rows: number }) => {
        if (!mainWindow) {
            console.error("Cannot create PTY: mainWindow is not available.");
            return { success: false, error: "Main window not available." };
        }
        const targetWebContents = mainWindow.webContents;

        if (ptyProcess) {
            console.log('Existing PTY process found. Killing it before creating a new one.');
            ptyProcess.kill();
            ptyProcess = null;
        }
        console.log(`Creating PTY process with shell: ${shellPath}, cols: ${options.cols}, rows: ${options.rows}`);
        try {
            const cwd = process.env.HOME || process.env.USERPROFILE || process.cwd();
            console.log(`PTY current working directory: ${cwd}`);
            ptyProcess = pty.spawn(shellPath, [], {
                name: 'xterm-color',
                cols: options.cols || 80,
                rows: options.rows || 24,
                cwd: cwd,
                env: { ...process.env },
            });
            console.log(`PTY process created successfully (PID: ${ptyProcess.pid}).`);

            // Handle Data Output
            ptyProcess.onData(data => {
                 if (targetWebContents && !targetWebContents.isDestroyed()) {
                    targetWebContents.send('pty-data', data);
                 }
            });

            // Handle Process Exit (Covers normal exit and many errors)
            ptyProcess.onExit(({ exitCode, signal }) => {
                console.log(`PTY process (PID: ${ptyProcess?.pid}) exited with code: ${exitCode}, signal: ${signal}`);
                // Optionally send error to renderer if exit code/signal indicates an issue
                 if (targetWebContents && !targetWebContents.isDestroyed()) {
                    // Send exit code regardless
                    targetWebContents.send('pty-exit', exitCode);
                    // If exit was likely due to an error, maybe send an additional message
                    if (exitCode !== 0 || signal) {
                         targetWebContents.send('pty-error', `Process exited abnormally (Code: ${exitCode}, Signal: ${signal})`);
                    }
                 }
                 ptyProcess = null; // Mark as no longer active
            });

            // Errors during spawn are caught by the try/catch block below.
            // Errors during write/resize are caught in their respective handlers.
            // Other PTY internal errors usually lead to onExit being called.

            return { success: true };

        } catch (error) {
            console.error('Failed to create PTY process:', error);
            // Send error back to renderer if it happens during creation
            if (targetWebContents && !targetWebContents.isDestroyed()) {
                targetWebContents.send('pty-error', `Failed to spawn PTY: ${error instanceof Error ? error.message : String(error)}`);
            }
            ptyProcess = null;
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Handle Input from Renderer
    ipcMain.on('pty-input', (_event, data: string) => {
        if (ptyProcess) {
             try {
                 ptyProcess.write(data);
             } catch (error) {
                 console.error(`Error writing to PTY (PID: ${ptyProcess?.pid}):`, error);
                 // Optionally notify the renderer
                 mainWindow?.webContents.send('pty-error', `Write Error: ${error instanceof Error ? error.message : String(error)}`);
                 // Consider killing the PTY if writes consistently fail?
                 // ptyProcess.kill();
                 // ptyProcess = null;
             }
        }
    });

    // Handle Resize from Renderer
    ipcMain.on('pty-resize', (_event, options: { cols: number; rows: number }) => {
        if (ptyProcess) {
            if (options.cols > 0 && options.rows > 0) {
                try {
                    ptyProcess.resize(options.cols, options.rows);
                } catch (error) {
                     console.error(`Failed to resize PTY (PID: ${ptyProcess?.pid}):`, error);
                     // Optionally notify the renderer
                     mainWindow?.webContents.send('pty-error', `Resize Error: ${error instanceof Error ? error.message : String(error)}`);
                }
            } else {
                console.warn(`Received invalid resize dimensions: cols=${options.cols}, rows=${options.rows}`);
            }
        }
    });

    // --- Dialog Handler ---
    ipcMain.handle('dialog:openDirectory', async () => {
        if (!mainWindow) return null;
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });
        if (canceled || filePaths.length === 0) {
            return null;
        } else {
            console.log(`Directory selected: ${filePaths[0]}`);
            return filePaths[0];
        }
    });

    // --- File System Handlers ---

    // Read Directory Handler
    ipcMain.handle('fs:readDirectory', async (_event, folderPath: string): Promise<ReadDirectoryResponse> => {
        console.log(`IPC Request: Reading directory - ${folderPath}`);
        try {
            if (!folderPath || typeof folderPath !== 'string') {
                 throw new Error("Invalid folder path provided.");
            }
            // Verify path exists and is a directory
            const stats = await fs.stat(folderPath);
            if (!stats.isDirectory()) {
                throw new Error(`Path is not a directory: ${folderPath}`);
            }

            const dirents = await fs.readdir(folderPath, { withFileTypes: true });
            const entries: DirectoryEntry[] = dirents.map(dirent => ({
                name: dirent.name,
                path: path.join(folderPath, dirent.name),
                isDirectory: dirent.isDirectory(),
            }));
            // Optional: Sort entries (folders first, then alphabetically)
            entries.sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
            });

            console.log(`IPC Success: Read ${entries.length} entries from ${folderPath}`);
            return { success: true, entries: entries };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`IPC Error: Failed to read directory ${folderPath}:`, errorMsg);
            // Add specific checks for common errors
            if (error instanceof Error && 'code' in error) {
                if (error.code === 'EACCES') return { success: false, error: `Permission denied: ${folderPath}` };
                if (error.code === 'ENOENT') return { success: false, error: `Directory not found: ${folderPath}` };
            }
            return { success: false, error: errorMsg };
        }
    });

    // Read File Handler
    ipcMain.handle('fs:readFile', async (_event, filePath: string): Promise<ReadFileResponse> => {
        console.log(`IPC Request: Reading file - ${filePath}`);
        try {
            if (!filePath || typeof filePath !== 'string') {
                 throw new Error("Invalid file path provided.");
            }
            const stats = await fs.stat(filePath);
            if (!stats.isFile()) {
                throw new Error(`Path is not a file: ${filePath}`);
            }
            // Add size check?
            // if (stats.size > 10 * 1024 * 1024) { // e.g., 10MB limit
            //    throw new Error(`File is too large to open (> 10MB): ${filePath}`);
            //}
            const content = await fs.readFile(filePath, { encoding: 'utf-8' });
            console.log(`IPC Success: Read file ${filePath}`);
            return { success: true, content: content };
        } catch (error) {
             const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`IPC Error: Failed to read file ${filePath}:`, errorMsg);
             if (error instanceof Error && 'code' in error) {
                if (error.code === 'EACCES') return { success: false, error: `Permission denied: ${filePath}` };
                if (error.code === 'ENOENT') return { success: false, error: `File not found: ${filePath}` };
             }
            return { success: false, error: errorMsg };
        }
    });

    // Save File Handler
    ipcMain.handle('fs:saveFile', async (_event, filePath: string, content: string): Promise<SaveFileResponse> => {
         console.log(`IPC Request: Saving file - ${filePath}`);
         try {
             if (!filePath || typeof filePath !== 'string') {
                  throw new Error("Invalid file path provided.");
             }
             // Add checks for directory existence if needed? fs.writeFile usually creates dirs if possible.
             await fs.writeFile(filePath, content, { encoding: 'utf-8' });
             console.log(`IPC Success: Saved file ${filePath}`);
             return { success: true };
         } catch (error) {
             const errorMsg = error instanceof Error ? error.message : String(error);
             console.error(`IPC Error: Failed to save file ${filePath}:`, errorMsg);
             if (error instanceof Error && 'code' in error) {
                if (error.code === 'EACCES') return { success: false, error: `Permission denied: ${filePath}` };
                if (error.code === 'ENOENT') return { success: false, error: `Directory not found for file: ${filePath}` }; // Or similar
             }
             return { success: false, error: errorMsg };
         }
     });

    // *** NEW: IPC Handlers for App/Window Control ***
    ipcMain.handle('app:quit', () => {
        console.log("IPC: Received app:quit request.");
        app.quit();
    });

    ipcMain.handle('window:toggle-fullscreen', () => {
        if (mainWindow) {
            const isFullScreen = mainWindow.isFullScreen();
            console.log(`IPC: Toggling fullscreen (currently ${isFullScreen}).`);
            mainWindow.setFullScreen(!isFullScreen);
        } else {
            console.warn("IPC: Cannot toggle fullscreen, mainWindow not found.");
        }
    });

    ipcMain.handle('window:toggle-devtools', () => {
        if (mainWindow) {
            console.log("IPC: Toggling DevTools.");
            mainWindow.webContents.toggleDevTools();
        } else {
            console.warn("IPC: Cannot toggle DevTools, mainWindow not found.");
        }
    });
    // *** END NEW IPC Handlers ***


    console.log('IPC Handlers registered (including app/window controls).');
}

// --- App Lifecycle Events ---
app.whenReady().then(() => {
  console.log('App is ready.');
  setupIpcHandlers();
  createApplicationMenu(); // <<< CREATE THE MENU HERE
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        console.log('App activated, creating window.');
        createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  console.log('All windows closed.');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
    // This is a good place to kill the PTY process if it's still running
    console.log('App will quit. Killing PTY process if exists.');
    if (ptyProcess) {
        ptyProcess.kill();
        ptyProcess = null;
    }
});

process.on('uncaughtException', (error: Error) => {
    // Log unhandled errors from the main process
    console.error('Uncaught Main Process Exception:', error);
    // Avoid showing dialog for common errors like EPIPE if not critical
    if (error.message.includes('EPIPE')) {
        console.warn("Ignoring EPIPE error in main process.");
        return;
    }
    // Show a dialog for other errors
    dialog.showErrorBox('Unhandled Main Process Error', `${error.name}: ${error.message}\n${error.stack ?? ''}`);
    // Consider if app.quit() is appropriate here, might depend on the error
    // app.quit();
});
// --- END FILE: src/main/index.ts ---