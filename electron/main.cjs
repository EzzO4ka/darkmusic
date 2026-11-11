const { app, BrowserWindow, shell, nativeTheme } = require('electron');
const path = require('path');

let mainWindow = null;
let pendingDeepLinkUrl = null;

function notifyWindowSystemTheme() {
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    const isLight = !nativeTheme.shouldUseDarkColors;
    mainWindow.webContents
      .executeJavaScript(
        `window.__ANDROID_OS_PREFERS_LIGHT__ = ${isLight}; if (typeof window.onNativeSystemThemeChanged === 'function') { window.onNativeSystemThemeChanged(${isLight}); }`
      )
      .catch(() => {});
  }
}

nativeTheme.on('updated', () => {
  notifyWindowSystemTheme();
});

function extractDeepLinkFromArgv(argv) {
  if (!Array.isArray(argv)) return null;
  for (const arg of argv) {
    if (typeof arg === 'string' && /^darkmusic:\/\//i.test(arg.trim())) {
      return arg.trim();
    }
  }
  return null;
}

function parseDeepLinkQuery(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return {};
  try {
    const idx = rawUrl.indexOf('?');
    if (idx === -1) return {};
    const searchParams = new URLSearchParams(rawUrl.slice(idx + 1).split('#')[0]);
    const query = {};
    for (const [k, v] of searchParams.entries()) {
      if (k === 'track' || k === 'album' || k === 'artist') {
        query[k] = v;
      }
    }
    return query;
  } catch {
    return {};
  }
}

function forwardDeepLinkToWindow(rawUrl) {
  if (!rawUrl) return;
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    const safeJson = JSON.stringify(String(rawUrl));
    mainWindow.webContents
      .executeJavaScript(
        `if (typeof window.handleIncomingDeepLinkUrl === 'function') { window.handleIncomingDeepLinkUrl(${safeJson}); }`
      )
      .catch(() => {});
  } else {
    pendingDeepLinkUrl = rawUrl;
  }
}

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('darkmusic', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('darkmusic');
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    const deepLink = extractDeepLinkFromArgv(commandLine);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
    if (deepLink) {
      forwardDeepLinkToWindow(deepLink);
    }
  });
}

app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
  forwardDeepLinkToWindow(url);
});

function createWindow() {
  const initialDeepLink = pendingDeepLinkUrl || extractDeepLinkFromArgv(process.argv);
  const initialQuery = parseDeepLinkQuery(initialDeepLink);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    show: false,
    title: 'Dark Music - Music App',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (pendingDeepLinkUrl) {
      const urlToOpen = pendingDeepLinkUrl;
      pendingDeepLinkUrl = null;
      forwardDeepLinkToWindow(urlToOpen);
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (initialDeepLink && Object.keys(initialQuery).length === 0) {
      forwardDeepLinkToWindow(initialDeepLink);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^(https?:|mailto:)/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'), {
    query: initialQuery
  });
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

