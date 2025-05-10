import { BrowserWindow, ipcMain } from "electron";

export default function useWindowControl() {
  ipcMain.handle("window:minimize", event => {
    BrowserWindow.fromWebContents(event.sender).minimize();
  });

  ipcMain.handle("window:maximize", event => {
    const window = BrowserWindow.fromWebContents(event.sender);

    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  });

  ipcMain.handle("window:close", event => {
    BrowserWindow.fromWebContents(event.sender).close();
  });
}
