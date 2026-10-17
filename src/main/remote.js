// Tele-metrie a distance : serveur local de lecture seule pour consulter les metriques de la
// machine depuis un téléphone. Regles du module :
//  - module `node:` pur : pas d'electron ici, pour qu'il soit testable sans lancer l'app ;
//  - ETEINT par defaut : rien n'ecoute tant que l'utilisateur n'a pas active l'option ;
//  - lecture seule : GET/HEAD uniquement, toute autre methode repond 405 ;
//  - reseau local uniquement : les adresses publiques sont refusees a la garde-fou, meme si la
//    machine est directement exposee ;
//  - aucune valeur inventee : avant la premiere mesure, /api/metrics repond 503, jamais un 0.
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { buildRemotePage } from "./remotePage.js";

export const DEFAULT_PORT = 8791;

let lastPayload = null;
let lastTimestamp = null;
let activeInstance = null;

// La collecte existante (Si.observe dans handlers/metrics.js) appelle ca a chaque tick :
// c'est la meme sonde, pas une seconde.
export function publishMetrics(payload) {
  if (payload === null || payload === undefined) {
    lastPayload = null;
    lastTimestamp = null;
    return;
  }
  lastPayload = payload;
  lastTimestamp = Date.now();
}

function normalizeIp(ip) {
  if (!ip) return "";
  let value = String(ip);
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) value = mapped[1];
  const zone = value.indexOf("%");
  if (zone !== -1) value = value.slice(0, zone);
  return value.toLowerCase();
}

export function isLocalNetworkAddress(ip) {
  const value = normalizeIp(ip);
  if (!value) return false;

  if (value.includes(".")) {
    const parts = value.split(".").map(Number);
    if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
    const [a, b] = parts;
    return (
      a === 127 || // boucle
      a === 10 || // 10/8
      (a === 172 && b >= 16 && b <= 31) || // 172.16/12
      (a === 192 && b === 168) // 192.168/16
    );
  }

  if (value.includes(":")) {
    if (value === "::1") return true; // boucle IPv6
    if (value.startsWith("fe80")) return true; // link-local
    return value.startsWith("fc") || value.startsWith("fd"); // fc00::/7 unique-local
  }

  return false;
}

function respondJson(res, status, payload, { head = false, allow } = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    ...(allow ? { Allow: allow } : {}),
  });
  if (head) res.end();
  else res.end(body);
}

function handleRequest(req, res, { token, page }) {
  const isHead = req.method === "HEAD";

  if (req.method !== "GET" && req.method !== "HEAD") {
    respondJson(res, 405, { error: "lecture seule" }, { head: isHead, allow: "GET, HEAD" });
    return;
  }

  const ip = req.socket.remoteAddress;
  if (!isLocalNetworkAddress(ip)) {
    respondJson(res, 403, { error: "acces refuse : adresse hors reseau local" }, { head: isHead });
    return;
  }

  const url = new URL(req.url, "http://localhost");

  // Page mobile et module d'unites : code statique sans mesure, donc pas de jeton exige ;
  // aucune page n'est inventee si la source d'unites n'a pas pu etre lue (parite avant tout).
  if (page && page.unitsSource && (url.pathname === "/" || url.pathname === "/index.html")) {
    const html = buildRemotePage({ titre: "Metrx" });
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": Buffer.byteLength(html),
      "Cache-Control": "no-store",
    });
    if (isHead) res.end();
    else res.end(html);
    return;
  }

  if (page && page.unitsSource && url.pathname === "/units.js") {
    res.writeHead(200, {
      "Content-Type": "text/javascript; charset=utf-8",
      "Content-Length": Buffer.byteLength(page.unitsSource),
      "Cache-Control": "no-store",
    });
    if (isHead) res.end();
    else res.end(page.unitsSource);
    return;
  }

  // Icones : fournies au demarrage comme units.js ; absentes, elles font 404 sans eteindre la page.
  if (url.pathname === "/favicon.svg" && page && page.faviconSource) {
    res.writeHead(200, {
      "Content-Type": "image/svg+xml",
      "Content-Length": Buffer.byteLength(page.faviconSource),
      "Cache-Control": "no-store",
    });
    if (isHead) res.end();
    else res.end(page.faviconSource);
    return;
  }

  if (url.pathname === "/apple-touch-icon.png" && page && page.touchIconSource) {
    res.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": page.touchIconSource.length,
      "Cache-Control": "no-store",
    });
    if (isHead) res.end();
    else res.end(page.touchIconSource);
    return;
  }

  if (url.pathname === "/api/health") {
    respondJson(res, 200, { ok: true, service: "metrx-hardware-monitor", timestamp: Date.now() }, { head: isHead });
    return;
  }

  if (url.pathname === "/api/metrics") {
    if (token) {
      const received = req.headers["x-metrx-token"] || url.searchParams.get("token");
      if (received !== token) {
        respondJson(res, 401, { error: "jeton requis" }, { head: isHead });
        return;
      }
    }
    if (lastPayload === null) {
      respondJson(res, 503, { payload: null, error: "aucune mesure pour l'instant" }, { head: isHead });
      return;
    }
    respondJson(res, 200, { timestamp: lastTimestamp, payload: lastPayload }, { head: isHead });
    return;
  }

  respondJson(res, 404, { error: "introuvable" }, { head: isHead });
}

// active:false (le defaut) ou option absente => null, rien n'ecoute.
export async function startRemoteTelemetry({
  active = false,
  host = "0.0.0.0",
  port = DEFAULT_PORT,
  token = "",
  page = null,
} = {}) {
  if (!active) return null;

  if (activeInstance) await activeInstance.stop();

  const server = createServer((req, res) => handleRequest(req, res, { token, page }));

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host, port, exclusive: true }, resolve);
  });

  const instance = {
    server,
    host,
    port: server.address().port,
    tokenRequired: Boolean(token),
    stop() {
      return new Promise(resolve => {
        server.closeAllConnections();
        server.close(resolve);
        if (activeInstance === instance) activeInstance = null;
      });
    },
  };
  activeInstance = instance;
  return instance;
}

export async function stopRemoteTelemetry() {
  if (activeInstance) await activeInstance.stop();
}

export function remoteTelemetryState() {
  return activeInstance
    ? { active: true, port: activeInstance.port, tokenRequired: activeInstance.tokenRequired }
    : { active: false };
}

// L'URL que l'utilisateur tape sur son iPhone : une par adresse IPv4 du reseau local.
// Jamais 0.0.0.0 (adresse d'ecoute, pas de consultation) ni 127.0.0.1 (inutile a distance).
export function consultationUrls({ port, token = "" }) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new RangeError(`port tele-metrie invalide : ${port} (entier attendu entre 1024 et 65535)`);
  }
  const query = token ? `?token=${encodeURIComponent(String(token))}` : "";
  const urls = [];
  for (const iface of Object.values(networkInterfaces()).flat()) {
    if (!iface || iface.internal || iface.family !== "IPv4") continue;
    if (!isLocalNetworkAddress(iface.address)) continue;
    urls.push(`http://${iface.address}:${port}/${query}`);
  }
  return urls;
}
