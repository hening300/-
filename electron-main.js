
const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "合同管理系统",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 如果是开发模式，加载本地 dev server
  // 如果是生产环境，由于 Next.js 依赖服务端，建议直接加载您的部署 URL
  // 或者您可以在本地打包后通过 next start 启动后加载
  const url = isDev 
    ? 'http://localhost:9002' 
    : 'https://your-app-url.web.app'; // 建议替换为您的 Firebase App Hosting URL

  win.loadURL(url);

  if (isDev) {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

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
