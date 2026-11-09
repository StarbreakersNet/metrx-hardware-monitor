/**
 * Sidecar de collecte des métriques (Bun + systeminformation).
 *
 * Ce processus est lancé par Tauri (voir `src-tauri/src/sidecar.rs`) et communique
 * uniquement via stdin/stdout, une ligne JSON par message :
 *
 * - Requêtes reçues (stdin)   : { "id": 1, "method": "get", "params": { ... } }
 * - Réponses envoyées (stdout) : { "id": 1, "result": ... } ou { "id": 1, "error": "..." }
 * - Évènements (stdout)        : { "event": "data", "payload": { ... } }
 *
 * Le Rust ne fait que relayer ces lignes vers la webview : toute la logique reste ici
 * et dans `src/api/metrics.js`. Pour ajouter une méthode, il suffit de l'ajouter
 * dans `methods` ci-dessous.
 *
 * stderr est réservé aux logs (affichés dans la console de `tauri dev`).
 */
// Doit rester le premier import (corrige child_process avant systeminformation)
import "./bun-compat.js";
import { execFile } from "node:child_process";
import { createInterface } from "node:readline";
import { promisify } from "node:util";
import * as privileged from "./privileged.js";
import * as si from "systeminformation";
import siPackage from "systeminformation/package.json" with { type: "json" };

const MIN_INTERVAL = 500;

const execFileAsync = promisify(execFile);

const observer = {
  generation: 0,
  timer: null,
  lastPayload: null,
};

function send(message) {
  process.stdout.write(JSON.stringify(message) + "\n");
}

function log(...args) {
  console.error("[metrx-metrics]", ...args);
}

/**
 * Équivalent de `si.get()`, avec la version de systeminformation figée au build :
 * `si.version()` lit son package.json sur le disque, qui n'existe pas dans le binaire compilé.
 */
async function get(valueObject = {}) {
  const { version, ...rest } = valueObject;
  const data = await si.get(rest);

  if (version !== undefined) {
    data.version = siPackage.version;
  }

  if (Array.isArray(data.gpu)) {
    await addAppleGpuUsage(data.gpu);
  }

  // Métriques avancées (powermetrics), si l'utilisateur les a activées
  privileged.enrich(data);

  return data;
}

let appleGpuUsageFailed = false;

/**
 * systeminformation ne donne pas l'utilisation des GPU Apple (system_profiler est statique).
 * ioreg l'expose sans droits administrateur : PerformanceStatistics > "Device Utilization %".
 */
async function addAppleGpuUsage(controllers) {
  const appleGpus = controllers.filter(
    controller => controller?.vendor === "Apple" && controller.utilizationGpu == null
  );

  if (process.platform !== "darwin" || !appleGpus.length || appleGpuUsageFailed) {
    return;
  }

  try {
    const { stdout } = await execFileAsync("ioreg", [
      "-r",
      "-d",
      "1",
      "-w",
      "0",
      "-c",
      "IOAccelerator",
    ]);
    const match = stdout.match(/"Device Utilization %"=(\d+)/);

    if (match) {
      appleGpus.forEach(controller => {
        controller.utilizationGpu = Number(match[1]);
      });
    }
  } catch (error) {
    // Une seule tentative en échec suffit : inutile de relancer ioreg à chaque collecte
    appleGpuUsageFailed = true;
    log("Utilisation du GPU Apple indisponible (ioreg) :", error?.message ?? error);
  }
}

/**
 * Remplace `si.observe()` : même comportement (n'envoie que si les données ont changé),
 * mais attend la fin d'une collecte avant de planifier la suivante pour éviter
 * que les appels se chevauchent quand la machine est chargée.
 */
function startObserver(nodes, interval) {
  stopObserver();

  const generation = observer.generation;
  const delay = Math.max(Number(interval) || 0, MIN_INTERVAL);

  const tick = async () => {
    const startedAt = Date.now();

    try {
      const data = await get(nodes);
      const payload = JSON.stringify(data);

      if (generation !== observer.generation) {
        return;
      }

      if (payload !== observer.lastPayload) {
        observer.lastPayload = payload;
        process.stdout.write('{"event":"data","payload":' + payload + "}\n");
      }
    } catch (error) {
      log("Erreur lors de la collecte des métriques :", error);
    }

    if (generation === observer.generation) {
      observer.timer = setTimeout(tick, Math.max(0, delay - (Date.now() - startedAt)));
    }
  };

  observer.timer = setTimeout(tick, 0);
}

function stopObserver() {
  observer.generation++;
  observer.lastPayload = null;
  clearTimeout(observer.timer);
  observer.timer = null;
}

const methods = {
  get: params => get(params),
  start: ({ nodes, interval }) => startObserver(nodes, interval),
  stop: () => stopObserver(),
  privilegedStatus: () => privileged.status(),
  privilegedEnable: () => privileged.enable(),
  privilegedDisable: () => privileged.disable(),
  versions: () => ({
    bun: process.versions.bun,
    systeminformation: siPackage.version,
  }),
};

async function handleLine(line) {
  if (!line.trim()) {
    return;
  }

  let request;

  try {
    request = JSON.parse(line);
  } catch {
    log("Message invalide ignoré :", line);
    return;
  }

  const { id, method, params } = request;
  const handler = methods[method];

  if (!handler) {
    send({ id, error: `Méthode inconnue : ${method}` });
    return;
  }

  try {
    const result = await handler(params ?? {});
    send({ id, result: result ?? null });
  } catch (error) {
    send({ id, error: error?.message ?? String(error) });
  }
}

// systeminformation v6 est en beta : une erreur inattendue est journalisée sans arrêter
// la collecte (Tauri relancerait sinon le sidecar en boucle).
process.on("uncaughtException", error => log("Erreur non gérée :", error));
process.on("unhandledRejection", error => log("Promesse rejetée non gérée :", error));

const EXIT_TIMEOUT = 5000;
const input = createInterface({ input: process.stdin });
let pendingRequests = 0;
let stdinClosed = false;

function exitWhenIdle() {
  if (stdinClosed && pendingRequests === 0) {
    process.exit(0);
  }
}

input.on("line", async line => {
  pendingRequests++;

  try {
    await handleLine(line);
  } finally {
    pendingRequests--;
    exitWhenIdle();
  }
});

// Quand Tauri se ferme (ou plante), stdin se ferme : on s'arrête avec lui pour ne jamais
// laisser de processus orphelin, après avoir répondu aux requêtes en cours.
input.on("close", () => {
  stdinClosed = true;
  stopObserver();
  privileged.stopSampler();
  exitWhenIdle();
  setTimeout(() => process.exit(0), EXIT_TIMEOUT).unref();
});

privileged.setLogger(log);
privileged.init().catch(error => log("Métriques avancées indisponibles :", error));

send({ event: "ready", payload: { pid: process.pid } });
