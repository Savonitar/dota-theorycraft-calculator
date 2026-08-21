const { app, BrowserWindow } = require('electron');
const { getWindowOptions } = require('./src/window-options');

const APP_NAME = 'Dota Theorycraft Calculator';
const APP_ID = 'com.savonitar.dota-theorycraft-calculator';

app.setName(APP_NAME);
app.setAppUserModelId(APP_ID);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    ...getWindowOptions(),
    autoHideMenuBar: true,
    backgroundColor: '#111318',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
