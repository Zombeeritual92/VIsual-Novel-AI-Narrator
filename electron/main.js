const { app, BrowserWindow, session, desktopCapturer, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#0f172a', // Matches bg-gray-950
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Handle getDisplayMedia requests in Electron
  // Note: For a production app, you would ideally create a custom UI to let the user select a specific window.
  // Here we auto-select the first available source (usually the entire screen) to ensure it works immediately.
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
      // Grant access to the first screen/window found.
      callback({ video: sources[0], audio: 'loopback' });
    }).catch((error) => {
      console.error(error);
    });
  });

  // Load the app
  // In development, we check if the Vite server is running
  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});