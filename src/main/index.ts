// src/main/index.ts
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'node:path';
// REMOVED: import { fileURLToPath } from 'node:url';

// Disable hardware acceleration - Common fix for rendering issues (like black screens) in WSL
app.disableHardwareAcceleration();

// REMOVED: Lines calculating __filename and __dirname using import.meta.url
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
// In CommonJS (which we are now compiling to), __dirname is automatically available.

// Handle creating/removing shortcuts on Windows install/uninstall.
// Use app.isPackaged to determine if running from installed app vs source
if (app.isPackaged && process.platform === 'win32') {
    // When compiling to CommonJS, using require directly is standard
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    if (require('electron-squirrel-startup')) {
      app.quit();
    }
  }

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // __dirname is now the automatically available CommonJS global
      preload: path.join(__dirname, '../preload/index.js'), // Assumes preload is compiled to dist-electron/preload/index.js
      nodeIntegration: false,
      contextIsolation: true,
      // sandbox: false, // Consider only if absolutely necessary for WSL
    },
    // backgroundColor: '#2e2c29',
  });

  // Determine if running in development or production
  const isDev = !app.isPackaged;
  console.log(`>>> DEBUG: app.isPackaged = ${app.isPackaged}, therefore isDev = ${isDev}`);

  if (isDev) {
    // Development: Load from Vite dev server
    console.log('Loading DEV URL: http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173/');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: Load the index.html file from the renderer build output
    console.log('Loading PROD build file');
    // __dirname is the CommonJS global, path calculation remains the same logic
    const prodPath = path.join(__dirname, '../../dist/renderer/index.html');
    console.log(`Attempting to load production file: ${prodPath}`);
    mainWindow.loadFile(prodPath);
  }


  // Open links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
        shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Optional: Listen for rendering process crashes
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process gone:', details);
  });

   // Optional: Listen for 'did-fail-load' events
   mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`Failed to load URL: ${validatedURL}, ErrorCode: ${errorCode}, Description: ${errorDescription}`);
   });


  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Electron App Lifecycle Events
app.whenReady().then(() => {
  console.log('App is ready, creating window...');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Basic IPC Example
ipcMain.handle('ping', () => 'pong from main!');

// Add other IPC handlers as needed