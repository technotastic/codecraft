// src/main/index.ts
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'node:path';
import os from 'node:os';
import * as pty from 'node-pty'; // Import node-pty

// --- Global Variables ---
// Disable hardware acceleration - Common fix for rendering issues in WSL
app.disableHardwareAcceleration();

// Determine the shell based on the operating system
const shellPath = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
// Variable to hold the PTY process instance for the main window
let ptyProcess: pty.IPty | null = null;
// Reference to the main browser window
let mainWindow: BrowserWindow | null = null; // Use standard name

// --- Squirrel Startup Handler (Windows Installer) ---
// Placed early before app is fully ready
if (app.isPackaged && process.platform === 'win32') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    if (require('electron-squirrel-startup')) {
      app.quit();
    }
}

// --- Main Window Creation Function ---
function createWindow() {
  console.log('Creating main window...');
  mainWindow = new BrowserWindow({ // Assign to the global mainWindow
    width: 1200,
    height: 800,
    webPreferences: {
      // __dirname is the automatically available CommonJS global
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = !app.isPackaged;
  console.log(`>>> DEBUG: app.isPackaged = ${app.isPackaged}, therefore isDev = ${isDev}`);

  if (isDev) {
    console.log('Loading DEV URL: http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173/')
      .catch(err => console.error('Failed to load DEV URL:', err)); // Add error catching
    mainWindow.webContents.openDevTools();
  } else {
    console.log('Loading PROD build file');
    const prodPath = path.join(__dirname, '../../dist/renderer/index.html');
    console.log(`Attempting to load production file: ${prodPath}`);
    mainWindow.loadFile(prodPath)
       .catch(err => console.error(`Failed to load PROD file: ${prodPath}`, err)); // Add error catching
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
    // Kill the PTY process if the window is closed
    if (ptyProcess) {
        console.log('Killing PTY process due to window close.');
        ptyProcess.kill();
        ptyProcess = null;
    }
    mainWindow = null; // Clear the window reference
  });
}

// --- Function to Setup IPC Handlers ---
// Separated for clarity, called after app is ready
function setupIpcHandlers() {
    console.log('Setting up IPC Handlers...');

    // Handle PTY Creation Request
    ipcMain.handle('pty-create', async (_event, options: { cols: number; rows: number }) => {
        // Ensure mainWindow exists before trying to use its webContents
        if (!mainWindow) {
            console.error("Cannot create PTY: mainWindow is not available.");
            return { success: false, error: "Main window not available." };
        }
        const targetWebContents = mainWindow.webContents; // Use local ref

        if (ptyProcess) {
            console.log('Existing PTY process found. Killing it before creating a new one.');
            ptyProcess.kill();
            ptyProcess = null;
        }
        console.log(`Creating PTY process with shell: ${shellPath}, cols: ${options.cols}, rows: ${options.rows}`);
        try {
            ptyProcess = pty.spawn(shellPath, [], {
                name: 'xterm-color',
                cols: options.cols || 80,
                rows: options.rows || 24,
                cwd: process.env.HOME || process.cwd(),
                env: process.env,
            });
            console.log(`PTY process created successfully (PID: ${ptyProcess.pid}).`);

            // Attach Listeners to the PTY Process
            ptyProcess.onData((data: string) => {
                 // Use targetWebContents captured when handler was registered
                 targetWebContents.send('pty-data', data);
            });

            ptyProcess.onExit(({ exitCode }) => {
                console.log(`PTY process (PID: ${ptyProcess?.pid}) exited with code: ${exitCode}`);
                 targetWebContents.send('pty-exit', exitCode);
                 ptyProcess = null; // Clear the reference
            });

            return { success: true }; // Indicate success back to renderer

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
        } else {
            // Don't warn too much, could happen if closed quickly
            // console.warn('Received renderer input but ptyProcess is null.');
        }
    });

    // Handle Renderer -> PTY (Resize)
    ipcMain.on('pty-resize', (_event, options: { cols: number; rows: number }) => {
        if (ptyProcess) {
            console.log(`Resizing PTY (PID: ${ptyProcess.pid}) to cols: ${options.cols}, rows: ${options.rows}`);
            try {
                 ptyProcess.resize(options.cols, options.rows);
            } catch (error) {
                 console.error(`Failed to resize PTY (PID: ${ptyProcess.pid}):`, error);
            }
        } else {
            // console.warn('Received resize request but ptyProcess is null.');
        }
    });

    // Basic Ping Example
    ipcMain.handle('ping', () => 'pong from main!');

    console.log('IPC Handlers registered.');
}

// --- App Lifecycle Events ---
app.whenReady().then(() => {
  console.log('App is ready.');
  setupIpcHandlers(); // Register IPC handlers
  createWindow();     // Create the main window
});

app.on('window-all-closed', () => {
  console.log('All windows closed.');
  // On macOS, apps stay active. On other platforms, quit.
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Ensure app quits properly
app.on('quit', () => {
    console.log('App quitting. Killing PTY process if exists.');
    if (ptyProcess) {
        ptyProcess.kill();
        ptyProcess = null;
    }
});

app.on('activate', () => {
  // On macOS re-create window if none are open and dock icon is clicked
  if (mainWindow === null) {
    console.log('App activated, creating window.');
    createWindow();
  }
});