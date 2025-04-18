// --- START FILE: src/main/index.ts ---
// src/main/index.ts
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
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

// --- Main Window Creation Function ---
function createWindow() {
  console.log('Creating main window...');
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
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
    mainWindow.webContents.openDevTools();
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

            ptyProcess.onData(data => {
                 if (targetWebContents && !targetWebContents.isDestroyed()) {
                    targetWebContents.send('pty-data', data);
                 }
            });

            ptyProcess.onExit(({ exitCode, signal }) => {
                console.log(`PTY process (PID: ${ptyProcess?.pid}) exited with code: ${exitCode}, signal: ${signal}`);
                 if (targetWebContents && !targetWebContents.isDestroyed()) {
                    targetWebContents.send('pty-exit', exitCode);
                 }
                 ptyProcess = null;
            });

            return { success: true };

        } catch (error) {
            console.error('Failed to create PTY process:', error);
            // Also send error back to renderer if it happens during creation
            if (targetWebContents && !targetWebContents.isDestroyed()) {
                targetWebContents.send('pty-error', error instanceof Error ? error.message : String(error));
            }
            ptyProcess = null;
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    ipcMain.on('pty-input', (_event, data: string) => {
        if (ptyProcess) ptyProcess.write(data);
    });

    ipcMain.on('pty-resize', (_event, options: { cols: number; rows: number }) => {
        if (ptyProcess) {
            if (options.cols > 0 && options.rows > 0) {
                try {
                    ptyProcess.resize(options.cols, options.rows);
                } catch (error) {
                     console.error(`Failed to resize PTY (PID: ${ptyProcess.pid}):`, error);
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

    // --- NEW File System Handlers ---

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
            console.error(`IPC Error: Failed to read directory ${folderPath}:`, error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
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
            const content = await fs.readFile(filePath, { encoding: 'utf-8' });
            console.log(`IPC Success: Read file ${filePath}`);
            return { success: true, content: content };
        } catch (error) {
            console.error(`IPC Error: Failed to read file ${filePath}:`, error);
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Save File Handler
    ipcMain.handle('fs:saveFile', async (_event, filePath: string, content: string): Promise<SaveFileResponse> => {
         console.log(`IPC Request: Saving file - ${filePath}`);
         try {
             if (!filePath || typeof filePath !== 'string') {
                  throw new Error("Invalid file path provided.");
             }
             // Consider adding checks for directory existence if needed
             await fs.writeFile(filePath, content, { encoding: 'utf-8' });
             console.log(`IPC Success: Saved file ${filePath}`);
             return { success: true };
         } catch (error) {
             console.error(`IPC Error: Failed to save file ${filePath}:`, error);
             return { success: false, error: error instanceof Error ? error.message : String(error) };
         }
     });


    console.log('IPC Handlers registered (including fs).');
}

// --- App Lifecycle Events ---
app.whenReady().then(() => {
  console.log('App is ready.');
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        console.log('App activated, creating window.');
        createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  console.log('All windows closed.');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
    console.log('App will quit. Killing PTY process if exists.');
    if (ptyProcess) {
        ptyProcess.kill();
        ptyProcess = null;
    }
});

process.on('uncaughtException', (error: Error) => {
    console.error('Uncaught Main Process Exception:', error);
    dialog.showErrorBox('Unhandled Main Process Error', error.message || 'An unknown error occurred');
    // Consider if app.quit() is appropriate here
});
// --- END FILE: src/main/index.ts ---