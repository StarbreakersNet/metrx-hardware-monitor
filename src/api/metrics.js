/**
 * Client du sidecar de métriques (voir `src-sidecar/index.js`).
 *
 * Les requêtes sont envoyées au sidecar via Tauri (`metrics_send`) et les réponses / évènements
 * reviennent par l'évènement `metrics:message`. Chaque requête porte un `id` pour retrouver sa
 * réponse.
 */
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

const REQUEST_TIMEOUT = 30000;

const pending = new Map();
let nextId = 1;
let listenerPromise = null;
let dataCallback = null;
let lastStartParams = null;

function ensureListener() {
  listenerPromise ??= listen("metrics:message", ({ payload }) => handleMessage(payload));
  return listenerPromise;
}

function handleMessage(message) {
  if (message.id !== undefined) {
    const request = pending.get(message.id);

    if (request) {
      pending.delete(message.id);

      if (message.error) {
        request.reject(new Error(message.error));
      } else {
        request.resolve(message.result);
      }
    }
    return;
  }

  switch (message.event) {
    case "data":
      dataCallback?.(message.payload);
      break;
    case "ready":
      // Le sidecar a (re)démarré : on relance l'observation en cours
      if (lastStartParams) {
        request("start", lastStartParams).catch(error => console.error("[metrics]", error));
      }
      break;
  }
}

async function request(method, params = {}) {
  await ensureListener();

  const id = nextId++;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`[metrics] Pas de réponse du sidecar pour « ${method} »`));
    }, REQUEST_TIMEOUT);

    pending.set(id, {
      resolve: value => {
        clearTimeout(timer);
        resolve(value);
      },
      reject: error => {
        clearTimeout(timer);
        reject(error);
      },
    });

    invoke("metrics_send", { message: JSON.stringify({ id, method, params }) }).catch(error => {
      pending.get(id)?.reject(new Error(error));
      pending.delete(id);
    });
  });
}

export default {
  init: () => ensureListener(),
  start: (nodes, interval) => {
    lastStartParams = { nodes, interval };
    return request("start", lastStartParams);
  },
  stop: () => {
    lastStartParams = null;
    return request("stop");
  },
  get: valueObject => request("get", valueObject),
  versions: () => request("versions"),
  onData: callback => {
    dataCallback = callback;
  },
};
