/**
 * Métriques avancées de macOS, lues par `powermetrics`, qui exige les droits administrateur.
 *
 * L'utilisateur l'active dans « Paramètres > Zone de danger ». L'activation installe une règle
 * sudoers (mot de passe demandé une fois par macOS) qui autorise UNE commande exacte, avec des
 * arguments figés, pour l'utilisateur courant :
 *
 *   <utilisateur> ALL=(root) NOPASSWD: /usr/bin/powermetrics --samplers cpu_power\,gpu_power -i 1000 -f plist
 *
 * Aucune autre commande ni aucun autre argument ne peut tourner en root : en particulier pas
 * `-o <fichier>`, qui permettrait d'écrire n'importe où. La règle est validée par `visudo`
 * avant d'être installée, pour ne jamais casser `sudo`. Désactiver l'option la supprime.
 *
 * Le sidecar lance `sudo -n powermetrics …` et garde le dernier échantillon. `sudo` relaie
 * les signaux à powermetrics, et powermetrics s'arrête si le sidecar disparaît (tube fermé) :
 * aucun processus root ne reste orphelin.
 */
import { execFile, spawn } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SUDO = "/usr/bin/sudo";
const POWERMETRICS = "/usr/bin/powermetrics";
const SAMPLE_INTERVAL = 1000;
const POWERMETRICS_ARGS = [
  "--samplers",
  "cpu_power,gpu_power",
  "-i",
  String(SAMPLE_INTERVAL),
  "-f",
  "plist",
];
// Pas de « . » dans le nom : sudo ignore les fichiers de sudoers.d qui en contiennent
const SUDOERS_FILE = "/etc/sudoers.d/metrx";
// Au-delà, l'échantillon est trop vieux pour être affiché (powermetrics arrêté ou bloqué)
const SAMPLE_MAX_AGE = 5000;
const RESTART_DELAY = 30000;

const state = {
  sampler: null,
  stopping: false,
  restartTimer: null,
  buffer: "",
  sample: null,
  sampledAt: 0,
};

let log = () => {};

export const supported = process.platform === "darwin";

export function setLogger(logger) {
  log = logger;
}

/** Ligne sudoers ; les virgules des arguments doivent être échappées */
function sudoersRule(user) {
  const args = POWERMETRICS_ARGS.map(arg => arg.replaceAll(",", "\\,")).join(" ");

  return `${user} ALL=(root) NOPASSWD: ${POWERMETRICS} ${args}`;
}

/**
 * Contenu du fichier installé : la règle, précédée d'un commentaire qui dit d'où elle vient et
 * comment la retirer (elle reste si Metrx est mis à la corbeille avec l'option activée).
 */
function sudoersFile(user) {
  return (
    "# Added by Metrx (Settings > Danger Zone > Advanced metrics)\n" +
    `# To remove it: disable the option in Metrx, or sudo rm ${SUDOERS_FILE}\n` +
    sudoersRule(user) +
    "\n"
  );
}

function currentUser() {
  const { username } = userInfo();

  // Le nom est écrit dans la règle sudoers : on refuse tout caractère inattendu
  if (!/^[a-z_][a-z0-9_.-]*$/i.test(username)) {
    throw new Error(`Nom d'utilisateur inattendu : ${username}`);
  }

  return username;
}

/**
 * La règle autorise-t-elle la commande, sans mot de passe ? `-k` ignore les identifiants en
 * cache (un `sudo` tapé dans le terminal il y a moins de 5 min) : seule la règle compte.
 */
async function isAllowed() {
  if (!existsSync(SUDOERS_FILE)) {
    return false;
  }

  try {
    await execFileAsync(SUDO, ["-k", "-n", "-l", POWERMETRICS, ...POWERMETRICS_ARGS]);
    return true;
  } catch {
    return false;
  }
}

/** Échappe une chaîne pour AppleScript ("…") */
function appleScriptString(value) {
  return '"' + value.replaceAll("\\", "\\\\").replaceAll('"', '\\"') + '"';
}

/** Échappe un argument pour le shell (/bin/sh) lancé par `do shell script` */
function shellArg(value) {
  return "'" + value.replaceAll("'", "'\\''") + "'";
}

/**
 * Lance une commande en root via la fenêtre d'authentification de macOS.
 * Annuler la fenêtre rejette avec `canceled: true`.
 */
async function runAsAdministrator(command) {
  const script = `do shell script ${appleScriptString(command)} with administrator privileges`;

  try {
    await execFileAsync("/usr/bin/osascript", ["-e", script]);
  } catch (error) {
    // -128 : l'utilisateur a annulé la fenêtre d'authentification
    const canceled = /-128/.test(String(error?.stderr ?? error?.message));
    throw Object.assign(new Error(canceled ? "canceled" : String(error?.stderr || error)), {
      canceled,
    });
  }
}

/**
 * `installed` : le fichier sudoers existe. `outdated` : il existe mais n'autorise plus la commande
 * de cette version (arguments de powermetrics changés, autre utilisateur…) ; il faut le
 * réinstaller ou le supprimer.
 */
export async function status() {
  if (!supported) {
    return { supported: false, enabled: false, installed: false, outdated: false, sampling: false };
  }

  const installed = existsSync(SUDOERS_FILE);
  const enabled = await isAllowed();

  return {
    supported: true,
    enabled,
    installed,
    outdated: installed && !enabled,
    sampling: Boolean(state.sampler) && getSample() !== null,
    rule: sudoersRule(currentUser()),
    file: SUDOERS_FILE,
  };
}

export async function enable() {
  if (!supported) {
    throw new Error("Non disponible sur ce système");
  }

  const tempFile = join(tmpdir(), `metrx-sudoers-${process.pid}`);

  writeFileSync(tempFile, sudoersFile(currentUser()), { mode: 0o600 });

  try {
    // visudo valide la syntaxe avant l'installation (root:wheel, 0440, comme l'exige sudo)
    await runAsAdministrator(
      `/usr/sbin/visudo -cf ${shellArg(tempFile)} && ` +
        `/usr/bin/install -m 0440 -o root -g wheel ${shellArg(tempFile)} ${SUDOERS_FILE}`
    );
  } finally {
    rmSync(tempFile, { force: true });
  }

  startSampler();
  return status();
}

export async function disable() {
  if (!supported) {
    return status();
  }

  stopSampler();
  await runAsAdministrator(`/bin/rm -f ${SUDOERS_FILE}`);
  return status();
}

/** Démarre la lecture si la règle est installée (au lancement du sidecar) */
export async function init() {
  if (supported && (await isAllowed())) {
    startSampler();
  }
}

function startSampler() {
  if (state.sampler) {
    return;
  }

  clearTimeout(state.restartTimer);
  state.stopping = false;
  state.buffer = "";

  const sampler = spawn(SUDO, ["-k", "-n", POWERMETRICS, ...POWERMETRICS_ARGS], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  state.sampler = sampler;
  sampler.stdout.setEncoding("utf8");
  sampler.stdout.on("data", chunk => readOutput(chunk));
  sampler.stderr.on("data", chunk => log("powermetrics :", String(chunk).trim()));
  sampler.on("error", error => log("powermetrics n'a pas pu démarrer :", error.message));
  sampler.on("exit", code => {
    state.sampler = null;
    state.sample = null;

    if (state.stopping) {
      return;
    }

    // Arrêt inattendu : on réessaie plus tard si la règle est toujours là
    log(`powermetrics s'est arrêté (code ${code}), nouvel essai dans ${RESTART_DELAY / 1000} s`);
    state.restartTimer = setTimeout(() => init(), RESTART_DELAY);
    state.restartTimer.unref?.();
  });
}

export function stopSampler() {
  state.stopping = true;
  clearTimeout(state.restartTimer);
  state.sampler?.kill();
  state.sampler = null;
  state.sample = null;
}

/** powermetrics sépare ses échantillons plist par un caractère NUL */
function readOutput(chunk) {
  state.buffer += chunk;

  const parts = state.buffer.split("\0");
  state.buffer = parts.pop();

  const last = parts.reverse().find(part => part.includes("<plist"));

  if (!last) {
    return;
  }

  try {
    state.sample = extractMetrics(parsePlist(last));
    state.sampledAt = Date.now();
  } catch (error) {
    log("Échantillon powermetrics illisible :", error.message);
  }
}

function toNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** Puissance en W : powermetrics donne des mW, ou une énergie (mJ) sur la durée de l'échantillon */
function powerInWatts(milliwatts, millijoules, elapsedNs) {
  if (toNumber(milliwatts) !== undefined) {
    return milliwatts / 1000;
  }
  if (toNumber(millijoules) !== undefined && elapsedNs > 0) {
    return millijoules / (elapsedNs / 1e9) / 1000;
  }
  return undefined;
}

/**
 * Fréquence du GPU en MHz. Malgré son nom, `gpu.freq_hz` est en MHz sur Apple Silicon (776.9 sur
 * un M4, quand les cœurs CPU sont bien en Hz : 4460000000) ; une valeur en Hz est convertie.
 */
function gpuFrequencyInMegahertz(value) {
  const frequency = toNumber(value);

  if (frequency === undefined) {
    return undefined;
  }
  return frequency > 1e5 ? frequency / 1e6 : frequency;
}

/** Valeurs utiles d'un échantillon powermetrics (format plist, Apple Silicon et Intel) */
export function extractMetrics(sample) {
  const processor = sample?.processor ?? {};
  const gpu = sample?.gpu ?? {};
  const elapsedNs = toNumber(sample?.elapsed_ns);

  const cpuFrequencies = (processor.clusters ?? [])
    .flatMap(cluster => cluster.cpus ?? [])
    .map(cpu => toNumber(cpu.freq_hz))
    .filter(frequency => frequency > 0);

  // Mac Intel : une fréquence globale du package
  const packageFrequency = toNumber(processor.freq_hz);

  if (!cpuFrequencies.length && packageFrequency > 0) {
    cpuFrequencies.push(packageFrequency);
  }

  return {
    cpuFrequencies,
    cpuPower: powerInWatts(processor.cpu_power, processor.cpu_energy, elapsedNs),
    gpuFrequency: gpuFrequencyInMegahertz(gpu.freq_hz),
    gpuPower: powerInWatts(
      processor.gpu_power ?? gpu.gpu_power,
      processor.gpu_energy ?? gpu.gpu_energy,
      elapsedNs
    ),
  };
}

function getSample() {
  return state.sample && Date.now() - state.sampledAt < SAMPLE_MAX_AGE ? state.sample : null;
}

function round(value, decimals = 2) {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

/**
 * Complète les données de systeminformation avec le dernier échantillon :
 * fréquence CPU réelle (au lieu de la nominale), horloge et puissance du GPU intégré,
 * puissance du CPU (`cpuPower`, absent de systeminformation).
 */
export function enrich(data) {
  const sample = getSample();

  if (!sample) {
    return;
  }

  if (data.cpuCurrentSpeed && sample.cpuFrequencies.length) {
    const cores = sample.cpuFrequencies.map(frequency => round(frequency / 1e9));
    const average = cores.reduce((sum, core) => sum + core, 0) / cores.length;

    data.cpuCurrentSpeed = {
      min: Math.min(...cores),
      max: Math.max(...cores),
      avg: round(average),
      cores,
      measured: true,
    };
  }

  if (Array.isArray(data.gpu)) {
    data.gpu
      .filter(controller => controller?.bus === "Built-In")
      .forEach(controller => {
        if (sample.gpuFrequency !== undefined) {
          controller.clockCore = round(sample.gpuFrequency, 0);
        }
        if (sample.gpuPower !== undefined) {
          controller.powerDraw = round(sample.gpuPower);
        }
      });
  }

  if ((data.currentLoad || data.cpuCurrentSpeed) && sample.cpuPower !== undefined) {
    data.cpuPower = { draw: round(sample.cpuPower) };
  }
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeText(text) {
  return text.replace(/&(amp|lt|gt|quot|apos);/g, (_, name) => ENTITIES[name]);
}

/** Lecteur minimal de plist XML (dict, array, string, integer, real, true, false, date, data) */
export function parsePlist(xml) {
  const tokens = [];

  for (const match of xml.matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>|([^<]+)/g)) {
    if (match[2]) {
      tokens.push({ tag: match[2], close: match[1] === "/", selfClose: match[3] === "/" });
    } else if (match[4].trim()) {
      tokens.push({ text: match[4] });
    }
  }

  let position = tokens.findIndex(token => token.tag === "plist" && !token.close) + 1;

  if (position === 0) {
    throw new Error("Pas de balise <plist>");
  }

  function readText() {
    let text = "";

    if (tokens[position]?.text !== undefined) {
      text = tokens[position].text;
      position++;
    }
    position++; // balise fermante

    return decodeText(text);
  }

  function readValue() {
    const token = tokens[position++];

    if (!token?.tag || token.close) {
      throw new Error("plist invalide");
    }

    if (token.selfClose) {
      return { true: true, false: false, dict: {}, array: [] }[token.tag] ?? "";
    }

    switch (token.tag) {
      case "dict": {
        const dict = {};

        while (!(tokens[position]?.tag === "dict" && tokens[position].close)) {
          position++; // <key>
          const key = readText();
          dict[key] = readValue();
        }
        position++;

        return dict;
      }
      case "array": {
        const array = [];

        while (!(tokens[position]?.tag === "array" && tokens[position].close)) {
          array.push(readValue());
        }
        position++;

        return array;
      }
      case "integer":
      case "real":
        return Number(readText());
      default:
        return readText();
    }
  }

  return readValue();
}
