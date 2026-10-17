// Unités de Metrx : la valeur ET l'unité d'une mesure viennent toujours de la même règle.
// Règle n°1 (ce que montrent Task Manager et HWiNFO) : base 1024 avec les noms courants
// `o, Ko, Mo, Go, To` ; noms IEC et base 1000 seulement par réglage (`setUnitSettings`).
// Règle n°2 (fiabilité) : une sonde muette (null, undefined, NaN, "N/A") ou une valeur impossible
// (octets négatifs) ne devient jamais un 0 affiché : elle est marquée `UNAVAILABLE`.
// Sémantique des sources systeminformation, relevée sur machine : le CPU arrive déjà en GHz,
// la VRAM en MiB, les débits réseau en octets par seconde.
// Aucun import : ce fichier est servi tel quel à la page distante, qui l'exécute dans Safari.

export const UNAVAILABLE = "indisponible";

const MARKET_NAMES = ["o", "Ko", "Mo", "Go", "To", "Po", "Eo"];
const IEC_NAMES = ["o", "Kio", "Mio", "Gio", "Tio", "Pio", "Eio"];
const SI_NAMES = ["o", "kB", "MB", "GB", "TB", "PB", "EB"];
const BIT_RATE_NAMES = ["b/s", "Kb/s", "Mb/s", "Gb/s"];
const BYTE_RATE_NAMES = ["o/s", "Ko/s", "Mo/s", "Go/s"];

const DEFAULT_SETTINGS = {
  base: 1024,
  byteNames: undefined,
  temperature: "°C",
  speed: "bits",
};

let settings = { ...DEFAULT_SETTINGS };

export function setUnitSettings(options = {}) {
  settings = { ...settings, ...options };
}

export function resetUnitSettings() {
  settings = { ...DEFAULT_SETTINGS };
}

export function currentUnitSettings() {
  return { ...settings };
}

function isMeasure(valeur) {
  if (typeof valeur === "number") return Number.isFinite(valeur);
  if (typeof valeur === "string" && valeur.trim() !== "") {
    const n = Number(valeur.replace(",", "."));
    return Number.isFinite(n);
  }
  return false;
}

function toNumber(valeur) {
  return typeof valeur === "number" ? valeur : Number(String(valeur).replace(",", "."));
}

// Un seul arrondi, celui qui décide du nombre affiché ; l'unité du même appel ne peut donc
// pas contredire le nombre (jamais l'ancienne divergence : valeur passée en Go, unité restée Mo).
function round(value, decimals) {
  return Number.parseFloat(value.toFixed(decimals));
}

function namesForBase(base, names) {
  if (names === "iec") return IEC_NAMES;
  if (names === "si") return SI_NAMES;
  if (names) return MARKET_NAMES;
  return base === 1000 ? SI_NAMES : MARKET_NAMES;
}

function tier(bytes, base) {
  if (!(bytes > 0)) return 0;
  return Math.min(Math.floor(Math.log(bytes) / Math.log(base)), MARKET_NAMES.length - 1);
}

// formatBytes(bytes, decimals | options) -> {value, unit}
// Options : {decimals, base: 1024|1000, names: "market"|"iec"|"si"}.
// Sans `names` explicite, les noms suivent la base : 1024 -> noms du marché, 1000 -> noms SI
// (c'est ce que montre Task Manager dans les deux réglages).
export function formatBytes(bytes, options = {}) {
  const opts = typeof options === "number" ? { decimals: options } : options;
  const decimals = Math.max(0, opts.decimals ?? 2);
  const base = opts.base ?? settings.base;
  const names = namesForBase(base, opts.names ?? settings.byteNames);

  if (!isMeasure(bytes) || toNumber(bytes) < 0) return { value: 0, unit: names[0] };
  const value = toNumber(bytes);
  const i = tier(value, base);
  return { value: round(value / base ** i, decimals), unit: names[i] };
}

const NAME_FAMILIES = { market: MARKET_NAMES, iec: IEC_NAMES, si: SI_NAMES };

const BYTE_UNIT_INDEX = new Map();
for (const [family, names] of Object.entries(NAME_FAMILIES)) {
  names.forEach((name, i) => BYTE_UNIT_INDEX.set(name.toLowerCase(), { i, fam: family }));
}
BYTE_UNIT_INDEX.set("b", { i: 0, fam: "market" });
BYTE_UNIT_INDEX.set("octets", { i: 0, fam: "market" });
[["kib", 1], ["mib", 2], ["gib", 3], ["tib", 4], ["pib", 5], ["eib", 6]].forEach(([nom, i]) =>
  BYTE_UNIT_INDEX.set(nom, { i, fam: "iec" }),
);

function isByteUnit(unit) {
  return BYTE_UNIT_INDEX.has(String(unit).toLowerCase());
}

const TYPES = new Set(["bytes", "frequency", "temperature", "percent", "watts", "fan", "speed"]);

// formatMetric(value, type, options) -> {value, unit} (propriétés énumérables seules),
// + `available` et `text` NON énumérables : un deepEqual strict reste possible sur
// {value, unit}, tout en laissant l'état de la sonde consultable.
export function formatMetric(raw, type, options = {}) {
  if (!TYPES.has(type)) throw new Error(`type de mesure inconnu : ${type}`);

  const silent = !isMeasure(raw);
  const n = silent ? 0 : toNumber(raw);
  const impossible = (type === "bytes" || type === "speed" || type === "watts") && n < 0;

  if (silent || impossible) {
    const r = { value: null, unit: null };
    Object.defineProperty(r, "available", { value: false, enumerable: false });
    Object.defineProperty(r, "text", { value: UNAVAILABLE, enumerable: false });
    return r;
  }

  let value;
  let unit;
  switch (type) {
    case "bytes": {
      const b = formatBytes(n, options);
      value = b.value;
      unit = b.unit;
      break;
    }
    case "frequency": {
      // Sémantique systeminformation : le CPU arrive déjà en GHz, l'horloge GPU en MHz.
      // On ne re-convertit jamais une valeur GHz ; une valeur MHz ne monte en GHz qu'au-dessus de 1000 MHz.
      const source = options.source ?? "GHz";
      const ghz = source === "GHz" ? n : n / 1000;
      if (ghz >= 1) {
        value = round(ghz, 2);
        unit = "GHz";
      } else {
        value = round(ghz * 1000, 0);
        unit = "MHz";
      }
      break;
    }
    case "temperature": {
      const target = options.temperature ?? settings.temperature;
      if (target === "°F") {
        value = round((n * 9) / 5 + 32, 1);
        unit = "°F";
      } else {
        value = round(n, 0);
        unit = "°C";
      }
      break;
    }
    case "percent":
    case "fan": {
      value = round(n, 0);
      unit = "%";
      break;
    }
    case "watts": {
      value = round(n, 1);
      unit = "W";
      break;
    }
    case "speed": {
      // Source systeminformation : networkStats.rx_sec/tx_sec en OCTETS par seconde.
      // Affichage bits/s comme Task Manager (base 1000) ; l'option `units: "bytes"` garde Ko/s, Mo/s.
      const bits = (options.units ?? settings.speed) !== "bytes";
      if (bits) {
        const bytesPerSec = n * 8;
        const i = Math.min(Math.floor(Math.log(Math.max(bytesPerSec, 1)) / Math.log(1000)), BIT_RATE_NAMES.length - 1);
        value = round(bytesPerSec / 1000 ** i, i === 0 ? 0 : 1);
        unit = BIT_RATE_NAMES[i];
      } else {
        const i = tier(n, 1024);
        value = round(n / 1024 ** i, i === 0 ? 0 : 2);
        unit = BYTE_RATE_NAMES[Math.min(i, BYTE_RATE_NAMES.length - 1)];
      }
      break;
    }
  }

  const r = { value, unit };
  Object.defineProperty(r, "available", { value: true, enumerable: false });
  Object.defineProperty(r, "text", { value: `${value} ${unit}`, enumerable: false });
  return r;
}

// formatDuration(seconds) -> "5h 12m 27s", "1j 02h 03m" ; la source `time.uptime` est en secondes.
export function formatDuration(seconds) {
  if (!isMeasure(seconds) || toNumber(seconds) < 0) return UNAVAILABLE;
  const total = Math.floor(toNumber(seconds));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad2 = (v) => String(v).padStart(2, "0");
  if (d > 0) return `${d}j ${pad2(h)}h ${pad2(m)}m`;
  if (h > 0) return `${h}h ${pad2(m)}m ${pad2(s)}s`;
  if (m > 0) return `${m}m ${pad2(s)}s`;
  return `${s}s`;
}

// Une valeur donnée dans une unité nommée (la VRAM arrive en MiB) s'affiche un étage au-dessus,
// valeur et unité calculées ensemble (954 Mo -> "0.93 Go"). Les octets bruts ("B", "o")
// s'auto-échelonnent. Une seule règle pour les deux, plus de divergence valeur/unité.
function displayBytes(n, unit, decimals) {
  const { i, fam } = BYTE_UNIT_INDEX.get(String(unit).toLowerCase());
  if (i === 0) return formatBytes(n, { decimals });
  const base = fam === "si" ? 1000 : 1024;
  const names = NAME_FAMILIES[fam];
  let value = n / base;
  let j = i + 1;
  while (value >= base && j < names.length - 1) {
    value /= base;
    j += 1;
  }
  return { value: round(value, decimals), unit: names[j] };
}

// Conserver la signature appelée aujourd'hui par ChartLine.vue et cie (appUtils.js) :
// nombre nu quand `showUnit` est faux (n-number-animation), texte sinon. Une valeur muette
// renvoie UNAVAILABLE, jamais 0.
export function formatValue({ value, unit, showUnit = false, decimals = 2 } = {}) {
  if (!isMeasure(value)) return showUnit ? UNAVAILABLE : null;

  const n = toNumber(value);
  if (isByteUnit(unit)) {
    const shown = displayBytes(n, unit, decimals);
    return showUnit ? `${shown.value} ${shown.unit}` : shown.value;
  }

  switch (String(unit)) {
    case "%": {
      // Charge et utilisation se lisent en entier : la précision est décidée par l'unité,
      // pas par l'appelant (ancien code : Math.round ici, décimale partout ailleurs).
      const v = Math.round(n);
      return showUnit ? `${v} %` : v;
    }
    case "°C":
    case "°F": {
      const m = formatMetric(n, "temperature", { temperature: unit });
      return showUnit ? `${m.value} ${m.unit}` : m.value;
    }
    case "GHz":
    case "Mhz":
    case "MHz":
    case "Ghz": {
      const m = formatMetric(n, "frequency", { source: String(unit).toLowerCase().endsWith("hz") && String(unit).toLowerCase().startsWith("m") ? "MHz" : "GHz" });
      return showUnit ? `${m.value} ${m.unit}` : m.value;
    }
    case "W": {
      // Puissance en W, 1 décimale, décidée par l'unité.
      const v = round(n, 1);
      return showUnit ? `${v} W` : v;
    }
    case "o/s":
    case "b/s": {
      // Le débit réseau arrive en OCTETS par seconde (networkStats.rx_sec) ; la même règle
      // que formatMetric("speed") décide bits ou octets (réglage `speed`, défaut = bits comme
      // Task Manager). Valeur et unité calculées ensemble, jamais l'une sans l'autre.
      const m = formatMetric(n, "speed");
      return showUnit ? `${m.value} ${m.unit}` : m.value;
    }
    case "s":
      return showUnit ? formatDuration(n) : Math.round(n);
    default: {
      const v = decimals > 0 ? round(n, decimals) : Math.round(n);
      return showUnit ? `${v} ${unit}` : v;
    }
  }
}

// Conserver la signature appelée aujourd'hui (appUtils.js) : l'unité annoncée est celle
// que formatValue afficherait pour la même valeur — une seule règle, plus de divergence.
export function getValueUnit(value, unit) {
  if (!isMeasure(value)) return unit;
  if (unit === "o/s" || unit === "b/s") return formatMetric(toNumber(value), "speed").unit;
  if (!isByteUnit(unit)) return unit;
  return displayBytes(toNumber(value), unit, 2).unit;
}
