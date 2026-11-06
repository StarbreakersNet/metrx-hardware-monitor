/**
 * Vérifie que le sidecar compilé répond aux requêtes (utilisé par la CI sur les 3 OS).
 *
 * Contrairement à l'app, stdin reste ouvert jusqu'à la dernière réponse : sous Windows, le
 * premier appel à systeminformation démarre PowerShell et peut prendre plusieurs secondes.
 *
 * Usage : node .github/scripts/check-sidecar.js <chemin du sidecar>
 */
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

const TIMEOUT = 60000;
const REQUESTS = [
  { id: 1, method: "versions" },
  {
    id: 2,
    method: "get",
    params: {
      currentLoad: "currentLoad",
      mem: "total, used",
      cpuTemperature: "main",
      gpu: "vendor, model",
      version: "*",
    },
  },
];

const sidecarPath = process.argv[2];

if (!sidecarPath) {
  console.error("Usage : node check-sidecar.js <chemin du sidecar>");
  process.exit(1);
}

const startedAt = Date.now();
const pending = new Set(REQUESTS.map(request => request.id));
const sidecar = spawn(sidecarPath, [], { stdio: ["pipe", "pipe", "inherit"] });

const timer = setTimeout(() => {
  console.error(`❌ Pas de réponse après ${TIMEOUT / 1000} s pour : ${[...pending].join(", ")}`);
  sidecar.kill();
  process.exit(1);
}, TIMEOUT);

sidecar.on("exit", code => {
  if (pending.size > 0) {
    clearTimeout(timer);
    console.error(`❌ Le sidecar s'est arrêté (code ${code}) avant de répondre`);
    process.exit(1);
  }
});

createInterface({ input: sidecar.stdout }).on("line", line => {
  const message = JSON.parse(line);
  console.log(`[${Date.now() - startedAt} ms] ${line}`);

  if (message.id === undefined) {
    return;
  }

  if (message.error) {
    console.error(`❌ Erreur pour la requête ${message.id} : ${message.error}`);
    process.exit(1);
  }

  pending.delete(message.id);

  if (pending.size === 0) {
    clearTimeout(timer);
    // Fermer stdin doit arrêter le sidecar proprement
    sidecar.stdin.end();
    console.log("✅ Le sidecar a répondu à toutes les requêtes");
  }
});

for (const request of REQUESTS) {
  sidecar.stdin.write(JSON.stringify(request) + "\n");
}
