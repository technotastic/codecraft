// src/main/index.ts
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import path from 'node:path';
import os from 'node:os';
import * as pty from 'node-pty';

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
    const prodPath = path.join(__dirname, '..', '..', 'dist', 'renderer', 'index.html');
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

    // Handle PTY Creation Request
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

            // --- CORRECTED EVENT LISTENER SYNTAX ---
            // Handle Data from PTY -> Renderer
            ptyProcess.onData(data => { // Correct syntax
                 if (targetWebContents && !targetWebContents.isDestroyed()) {
                    targetWebContents.send('pty-data', data);
                 }
            });

            // Handle PTY Exit -> Renderer
            ptyProcess.onExit(({ exitCode, signal }) => { // Correct syntax
                console.log(`PTY process (PID: ${ptyProcess?.pid}) exited with code: ${exitCode}, signal: ${signal}`);
                 if (targetWebContents && !targetWebContents.isDestroyed()) {
                    targetWebContents.send('pty-exit', exitCode);
                 }
                 ptyProcess = null; // Clear the reference on exit
            });
            // --- END CORRECTIONS ---

            // Note: Fatal errors during spawn are caught by the outer try/catch.
            // Runtime errors often result in the process exiting, handled by onExit.

            return { success: true };

        } catch (error) {
            console.error('Failed to create PTY process:', error);
            ptyProcess = null;
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    });

    // Handle Renderer -> PTY (Input)
    ipcMain.on('pty-input', (_event, data: string) => {
        if (ptyProcess) {
            ptyProcess.write(data);
        }
    });

    // Handle Renderer -> PTY (Resize)
    ipcMain.on('pty-resize', (_event, options: { cols: number; rows: number }) => {
        if (ptyProcess) {
            if (options.cols > 0 && options.rows > 0) {
                try {
                    ptyProcess.resize(options.cols, options.rows);
                    // console.log(`Resized PTY (PID: ${ptyProcess.pid}) to cols: ${options.cols}, rows: ${options.rows}`); // Less verbose logging
                } catch (error) {
                     console.error(`Failed to resize PTY (PID: ${ptyProcess.pid}):`, error);
                     // Inform renderer? Debounce?
                }
            } else {
                console.warn(`Received invalid resize dimensions: cols=${options.cols}, rows=${options.rows}`);
            }
        }
    });

    // Example placeholder for opening a folder
    ipcMain.handle('dialog:openDirectory', async () => {
        if (!mainWindow) return null;
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory']
        });
        if (canceled || filePaths.length === 0) {
            return null;
        } else {
            return filePaths[0];
        }
    });

    console.log('IPC Handlers registered.');
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