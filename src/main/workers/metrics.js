import { parentPort } from "worker_threads";
import Si from "systeminformation";

let observer;

if (parentPort) {
  parentPort.on("message", ({ action, nodeUsed, interval = 1000 }) => {
    const isElectronWindows = process.platform === "win32";

    if (action === "init") {
      if (isElectronWindows) {
        Si.powerShellStart();
      }
    }

    if (action === "start" && nodeUsed) {
      clearInterval(observer);
      observer = Si.observe(nodeUsed, interval, metricsCallback);
    }

    if (action === "stop") {
      clearInterval(observer);
    }

    if (action === "destroy") {
      clearInterval(observer);

      if (isElectronWindows) {
        Si.powerShellRelease();
      }
    }
  });

  function metricsCallback(apiData) {
    parentPort.postMessage(apiData);
  }
} else {
  throw new Error("No parent port");
}
