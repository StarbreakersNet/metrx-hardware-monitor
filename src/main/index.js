import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow, dialog, ipcMain, nativeImage, nativeTheme, shell } from "electron";
import { join } from "path";
import { StatefullBrowserWindow } from "stateful-electron-window";
import useGnomeHandler from "./handlers/gnome";
import { getData, initSettingsStore } from "./store";
import useTray from "./tray";
import useUpdater from "./updater";
import useWindowControl from "./window";
import useMetricsHandler from "./handlers/metrics";

let mainWindow;

function getTrayIcon() {
  const resourcePath = join(__dirname, "../../resources");

  if (process.platform === "darwin") {
    let iconPath = join(resourcePath, "trayIconTemplate@2x.png");

    return nativeImage.createFromPath(iconPath);
  } else if (process.platform === "win32") {
    let iconPath = join(resourcePath, "trayIcon.ico");
    let img = nativeImage.createFromPath(iconPath);

    return img.resize({ width: 32, height: 32 });
  } else {
    let iconPath = join(resourcePath, "trayIcon.png");
    let img = nativeImage.createFromPath(iconPath);

    return img.resize({ width: 32, height: 32 });
  }
}

function createWindow() {
  let windowOptions = {
    width: 960,
    height: 1000,
    minWidth: 500,
    minHeight: 500,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false,
      backgroundThrottling: false,
    },
  };
  // Create the browser window.
  if (is.dev) {
    mainWindow = new BrowserWindow(windowOptions);
  } else {
    mainWindow = new StatefullBrowserWindow(windowOptions);
  }

  mainWindow.on("ready-to-show", () => {
    if (!getData("startMinimized")) {
      mainWindow.show();
    }

    nativeTheme.on("updated", () => {
      const theme = nativeTheme.shouldUseDarkColors ? "dark" : "light";
      mainWindow.webContents.send("os-theme-updated", theme);
    });
  });

  mainWindow.webContents.setWindowOpenHandler(details => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  // Handle dialogs for renderer
  ipcMain.handle("dialog", (event, method, params) => {
    dialog[method](params);
  });

  // Handle build type for renderer
  ipcMain.handle("get_app_version", () => {
    return app.getVersion();
  });
  ipcMain.handle("get_app_name", () => {
    return app.getName();
  });
  ipcMain.handle("open_devtools", () => {
    return mainWindow.webContents.openDevTools();
  });

  useGnomeHandler();
  const metricsHandler = useMetricsHandler(mainWindow);
  initSettingsStore(app, mainWindow);
  useUpdater(app, mainWindow);
  useTray(getTrayIcon(), mainWindow);
  useWindowControl();

  app.on("before-quit", () => {
    try {
      metricsHandler.destroyMetrics();
    } catch (error) {
      console.error("Error while destroying metrics before quitting : ", error);
    }
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  if (is.dev) {
    electronApp.setAppUserModelId("com.hardwaremonitor.dev");
  } else {
    electronApp.setAppUserModelId("com.hardwaremonitor");
  }
  // Change userData folder name for development
  if (is.dev) {
    app.setPath("userData", app.getPath("userData") + " Dev");
  }
  // Check if the app is already running
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
  } else {
    createWindow();
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window);
  });

  app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (process.platform === "darwin" && app.dock) {
        app.dock.show();
      }
      mainWindow.show();
    } else if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // This will catch the second instance
  // We send a signal to the first instance to focus the window
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow.isMinimized() || !mainWindow.isVisible()) {
      mainWindow.show();
    }

    mainWindow.focus();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
