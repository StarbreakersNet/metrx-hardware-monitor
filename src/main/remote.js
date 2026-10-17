// Tele-metrie a distance (cases 13-15 du PLAN.md, consigne durable 2).
//
// Regles heritees de la consigne :
//  - module `node:` pur : pas d'electron ici, pour qu'il soit testable sans lancer l'app ;
//  - ETEINT par defaut : rien n'ecoute tant que l'utilisateur n'a pas active l'option ;
//  - lecture seule : GET/HEAD uniquement, toute autre methode repond 405 ;
//  - reseau local uniquement : les adresses publiques sont refusees a la garde-fou, meme si la
//    machine est directement exposee ;
//  - aucune valeur inventee : avant la premiere mesure, /api/metrics repond 503, jamais un 0.
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { construirePage } from "./pageDistante.js";

const PORT_DEFAUT = 8791;

let dernierPayload = null;
let dernierHorodatage = null;
let instanceActive = null;

// La collecte existante (Si.observe dans handlers/metrics.js) appelle ca a chaque tick :
// c'est la meme sonde, pas une seconde.
export function publierMetriques(payload) {
  if (payload === null || payload === undefined) {
    dernierPayload = null;
    dernierHorodatage = null;
    return;
  }
  dernierPayload = payload;
  dernierHorodatage = Date.now();
}

function normaliserIp(ip) {
  if (!ip) return "";
  let value = String(ip);
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) value = mapped[1];
  const zone = value.indexOf("%");
  if (zone !== -1) value = value.slice(0, zone);
  return value.toLowerCase();
}

export function estAdresseReseauLocal(ip) {
  const value = normaliserIp(ip);
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

function repondreJson(res, status, objet, { head = false, allow } = {}) {
  const corps = JSON.stringify(objet);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(corps),
    "Cache-Control": "no-store",
    ...(allow ? { Allow: allow } : {}),
  });
  if (head) res.end();
  else res.end(corps);
}

function traitement(req, res, { jeton, page }) {
  const tete = req.method === "HEAD";

  if (req.method !== "GET" && req.method !== "HEAD") {
    repondreJson(res, 405, { error: "lecture seule" }, { head: tete, allow: "GET, HEAD" });
    return;
  }

  const ip = req.socket.remoteAddress;
  if (!estAdresseReseauLocal(ip)) {
    repondreJson(res, 403, { error: "acces refuse : adresse hors reseau local" }, { head: tete });
    return;
  }

  const url = new URL(req.url, "http://localhost");

  // Page mobile et module d'unites : code statique sans mesure, donc pas de jeton exige ;
  // aucune page n'est inventee si la source d'unites n'a pas pu etre lue (parite avant tout).
  if (page && page.unitsSource && (url.pathname === "/" || url.pathname === "/index.html")) {
    const corps = construirePage({ titre: "Metrx" });
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": Buffer.byteLength(corps),
      "Cache-Control": "no-store",
    });
    if (tete) res.end();
    else res.end(corps);
    return;
  }

  if (page && page.unitsSource && url.pathname === "/units.js") {
    res.writeHead(200, {
      "Content-Type": "text/javascript; charset=utf-8",
      "Content-Length": Buffer.byteLength(page.unitsSource),
      "Cache-Control": "no-store",
    });
    if (tete) res.end();
    else res.end(page.unitsSource);
    return;
  }

  if (url.pathname === "/api/health") {
    repondreJson(res, 200, { ok: true, service: "metrx-hardware-monitor", horodatage: Date.now() }, { head: tete });
    return;
  }

  if (url.pathname === "/api/metrics") {
    if (jeton) {
      const recu = req.headers["x-metrx-jeton"] || url.searchParams.get("token");
      if (recu !== jeton) {
        repondreJson(res, 401, { error: "jeton requis" }, { head: tete });
        return;
      }
    }
    if (dernierPayload === null) {
      repondreJson(res, 503, { payload: null, error: "aucune mesure pour l'instant" }, { head: tete });
      return;
    }
    repondreJson(res, 200, { horodatage: dernierHorodatage, payload: dernierPayload }, { head: tete });
    return;
  }

  repondreJson(res, 404, { error: "introuvable" }, { head: tete });
}

// active:false (le defaut) ou option absente => null, rien n'ecoute.
export async function initialiserTeleMetrie({
  active = false,
  hote = "0.0.0.0",
  port = PORT_DEFAUT,
  jeton = "",
  page = null,
} = {}) {
  if (!active) return null;

  if (instanceActive) await instanceActive.arreter();

  const serveur = createServer((req, res) => traitement(req, res, { jeton, page }));

  await new Promise((resolve, reject) => {
    serveur.once("error", reject);
    serveur.listen({ host: hote, port, exclusive: true }, resolve);
  });

  const instance = {
    serveur,
    hote,
    port: serveur.address().port,
    jeton: Boolean(jeton),
    arreter() {
      return new Promise(resolve => {
        serveur.closeAllConnections();
        serveur.close(resolve);
        if (instanceActive === instance) instanceActive = null;
      });
    },
  };
  instanceActive = instance;
  return instance;
}

export async function arreterTeleMetrie() {
  if (instanceActive) await instanceActive.arreter();
}

export function etatTeleMetrie() {
  return instanceActive
    ? { actif: true, port: instanceActive.port, protege: instanceActive.jeton }
    : { actif: false };
}

// L'URL que l'utilisateur tape sur son iPhone : une par adresse IPv4 du reseau local.
// Jamais 0.0.0.0 (adresse d'ecoute, pas de consultation) ni 127.0.0.1 (inutile a distance).
export function urlConsultation({ port, jeton = "" }) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new RangeError(`port tele-metrie invalide : ${port} (entier attendu entre 1024 et 65535)`);
  }
  const query = jeton ? `?token=${encodeURIComponent(String(jeton))}` : "";
  const urls = [];
  for (const adresse of Object.values(networkInterfaces()).flat()) {
    if (!adresse || adresse.internal || adresse.family !== "IPv4") continue;
    if (!estAdresseReseauLocal(adresse.address)) continue;
    urls.push(`http://${adresse.address}:${port}/${query}`);
  }
  return urls;
}
