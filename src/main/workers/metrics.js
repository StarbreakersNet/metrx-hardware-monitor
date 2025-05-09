import { parentPort } from "worker_threads";
import Si from "systeminformation";

if (parentPort) {
  let observer;

  parentPort.on("message", ({ action, nodeUsed, interval = 1000 }) => {
    const isElectronWindows = process.platform === "win32";

    if (action === "init") {
      if (isElectronWindows) {
        Si.powerShellStart();
      }
    }

    if (action === "start" && nodeUsed) {
      clearObserver();
      observer = Si.observe(nodeUsed, interval, metricsCallback);
    }

    if (action === "stop") {
      clearObserver();
    }

    if (action === "destroy") {
      clearObserver();

      if (isElectronWindows) {
        Si.powerShellRelease();
      }
    }
  });

  function clearObserver() {
    clearInterval(observer);
    observer = null;
  }

  function metricsCallback(apiData) {
    parentPort.postMessage(apiData);
  }
} else {
  throw new Error("No parent port");
}
