// Unités de Metrx : la valeur ET l'unité d'une mesure viennent toujours de la même règle.
// Oracle : tests/10-unites.test.js, lui-même décidé par specs/systeminformation.md (§ 4).
// Règle n°1 (readme.txt + consigne marché) : base 1024 avec les noms courants `o, Ko, Mo, Go, To`
// (Task Manager, HWiNFO), noms IEC et base 1000 seulement par réglage (`reglerUnites`).
// Règle n°2 (fiabilité) : une sonde muette (null, undefined, NaN, "N/A") ou une valeur impossible
// (octets négatifs) ne devient jamais un 0 affiché : elle est marquée `INDISPONIBLE`.
// Module Voltaire : aucun import, testable en Node natif (voir tests/harnais.mjs).

export const INDISPONIBLE = "indisponible";

const NOMS_MARCHE = ["o", "Ko", "Mo", "Go", "To", "Po", "Eo"];
const NOMS_IEC = ["o", "Kio", "Mio", "Gio", "Tio", "Pio", "Eio"];
const NOMS_SI = ["o", "kB", "MB", "GB", "TB", "PB", "EB"];
const NOMS_BITS = ["b/s", "Kb/s", "Mb/s", "Gb/s"];
const NOMS_OCTETS_PAR_SEC = ["o/s", "Ko/s", "Mo/s", "Go/s"];

const DEFAUT_REGLAGES = {
  base: 1024,
  nomsOctets: undefined,
  temperature: "°C",
  debit: "bits",
};

let reglages = { ...DEFAUT_REGLAGES };

export function reglerUnites(options = {}) {
  reglages = { ...reglages, ...options };
}

export function reinitialiserUnites() {
  reglages = { ...DEFAUT_REGLAGES };
}

export function unitesCourantes() {
  return { ...reglages };
}

function estMesure(valeur) {
  if (typeof valeur === "number") return Number.isFinite(valeur);
  if (typeof valeur === "string" && valeur.trim() !== "") {
    const n = Number(valeur.replace(",", "."));
    return Number.isFinite(n);
  }
  return false;
}

function versNombre(valeur) {
  return typeof valeur === "number" ? valeur : Number(String(valeur).replace(",", "."));
}

// Un seul arrondi, celui qui décide du nombre affiché ; l'unité du même appel ne peut donc
// pas contredire le nombre (ancienne divergence 1024/1000 corrigée, cf. specs § 4).
function arrondir(valeur, decimales) {
  return Number.parseFloat(valeur.toFixed(decimales));
}

function nomsSelonBase(base, noms) {
  if (noms === "iec") return NOMS_IEC;
  if (noms === "si") return NOMS_SI;
  if (noms) return NOMS_MARCHE;
  return base === 1000 ? NOMS_SI : NOMS_MARCHE;
}

function etage(octets, base) {
  if (!(octets > 0)) return 0;
  return Math.min(Math.floor(Math.log(octets) / Math.log(base)), NOMS_MARCHE.length - 1);
}

// formatBytes(octets, decimales | options) -> {value, unit}
// Options : {decimals, base: 1024|1000, names: "marche"|"iec"|"si"}.
// Sans `names` explicite, les noms suivent la base : 1024 -> noms du marche, 1000 -> noms SI
// (c'est ce que montre Task Manager dans les deux reglages).
export function formatBytes(octets, options = {}) {
  const opts = typeof options === "number" ? { decimals: options } : options;
  const decimales = Math.max(0, opts.decimals ?? 2);
  const base = opts.base ?? reglages.base;
  const noms = nomsSelonBase(base, opts.names ?? reglages.nomsOctets);

  if (!estMesure(octets) || versNombre(octets) < 0) return { value: 0, unit: noms[0] };
  const valeur = versNombre(octets);
  const i = etage(valeur, base);
  return { value: arrondir(valeur / base ** i, decimales), unit: noms[i] };
}

const FAMILLES_NOMS = { marche: NOMS_MARCHE, iec: NOMS_IEC, si: NOMS_SI };

const NOMS_OCTETS = new Map();
for (const [fam, noms] of Object.entries(FAMILLES_NOMS)) {
  noms.forEach((nom, i) => NOMS_OCTETS.set(nom.toLowerCase(), { i, fam }));
}
NOMS_OCTETS.set("b", { i: 0, fam: "marche" });
NOMS_OCTETS.set("octets", { i: 0, fam: "marche" });
[["kib", 1], ["mib", 2], ["gib", 3], ["tib", 4], ["pib", 5], ["eib", 6]].forEach(([nom, i]) =>
  NOMS_OCTETS.set(nom, { i, fam: "iec" }),
);

function estUniteOctets(unit) {
  return NOMS_OCTETS.has(String(unit).toLowerCase());
}

const TYPES = {
  octets: { decimales: 2 },
  frequence: { decimales: 2 },
  temperature: { decimales: 0 },
  pourcent: { decimales: 0 },
  watts: { decimales: 1 },
  ventilation: { decimales: 0 },
  debit: { decimales: 1 },
};

// formatMetric(valeur, type, options) -> {value, unit} (propriétés énumérables seules),
// + `available` et `text` NON énumérables : le contrat du test est un deepEqual strict
// sur {value, unit}, tout en laissant l'état de la sonde consultable.
export function formatMetric(valeur, type, options = {}) {
  const regle = TYPES[type];
  if (!regle) throw new Error(`type de mesure inconnu : ${type}`);

  const muet = !estMesure(valeur);
  const n = muet ? 0 : versNombre(valeur);
  const impossible = (type === "octets" || type === "debit" || type === "watts") && n < 0;

  if (muet || impossible) {
    const r = { value: null, unit: null };
    Object.defineProperty(r, "available", { value: false, enumerable: false });
    Object.defineProperty(r, "text", { value: INDISPONIBLE, enumerable: false });
    return r;
  }

  let value;
  let unit;
  switch (type) {
    case "octets": {
      const b = formatBytes(n, options);
      value = b.value;
      unit = b.unit;
      break;
    }
    case "frequence": {
      // La fiche § 1 : le CPU arrive déjà en GHz, l'horloge GPU en MHz. On ne re-convertis
      // jamais une valeur GHz ; une valeur MHz ne monte en GHz qu'au-dessus de 1000 MHz.
      const source = options.source ?? "GHz";
      const ghz = source === "GHz" ? n : n / 1000;
      if (ghz >= 1) {
        value = arrondir(ghz, 2);
        unit = "GHz";
      } else {
        value = arrondir(ghz * 1000, 0);
        unit = "MHz";
      }
      break;
    }
    case "temperature": {
      const vers = options.temperature ?? reglages.temperature;
      if (vers === "°F") {
        value = arrondir((n * 9) / 5 + 32, 1);
        unit = "°F";
      } else {
        value = arrondir(n, 0);
        unit = "°C";
      }
      break;
    }
    case "pourcent":
    case "ventilation": {
      value = arrondir(n, 0);
      unit = "%";
      break;
    }
    case "watts": {
      value = arrondir(n, 1);
      unit = "W";
      break;
    }
    case "debit": {
      // Source : octets/seconde (README systeminformation:682). Affichage bits/s comme
      // Task Manager (fiche § 4), base 1000 ; l'option `unites: "octets"` garde Ko/s, Mo/s.
      const bits = (options.unites ?? reglages.debit) !== "octets";
      if (bits) {
        const octetsParSec = n * 8;
        const i = Math.min(Math.floor(Math.log(Math.max(octetsParSec, 1)) / Math.log(1000)), NOMS_BITS.length - 1);
        value = arrondir(octetsParSec / 1000 ** i, i === 0 ? 0 : 1);
        unit = NOMS_BITS[i];
      } else {
        const i = etage(n, 1024);
        value = arrondir(n / 1024 ** i, i === 0 ? 0 : 2);
        unit = NOMS_OCTETS_PAR_SEC[Math.min(i, NOMS_OCTETS_PAR_SEC.length - 1)];
      }
      break;
    }
  }

  const r = { value, unit };
  Object.defineProperty(r, "available", { value: true, enumerable: false });
  Object.defineProperty(r, "text", { value: `${value} ${unit}`, enumerable: false });
  return r;
}

// formatDuree(secondes) -> "5h 12m 27s", "1j 02h 03m" ; la source `time.uptime` est en secondes.
export function formatDuree(secondes) {
  if (!estMesure(secondes) || versNombre(secondes) < 0) return INDISPONIBLE;
  const total = Math.floor(versNombre(secondes));
  const j = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const deuxChiffres = (v) => String(v).padStart(2, "0");
  if (j > 0) return `${j}j ${deuxChiffres(h)}h ${deuxChiffres(m)}m`;
  if (h > 0) return `${h}h ${deuxChiffres(m)}m ${deuxChiffres(s)}s`;
  if (m > 0) return `${m}m ${deuxChiffres(s)}s`;
  return `${s}s`;
}

// Une valeur donnee dans une unite nommee (la VRAM arrive en MiB) s'affiche un etage au-dessus,
// valeur et unite calculees ensemble (test 10-unites : 954 Mo -> "0.93 Go"). Les octets bruts
// ("B", "o") s'auto-echelonnent. Une seule regle pour les deux, plus de divergence 1024/1000.
function afficherOctets(n, unit, decimals) {
  const { i, fam } = NOMS_OCTETS.get(String(unit).toLowerCase());
  if (i === 0) return formatBytes(n, { decimals });
  const base = fam === "si" ? 1000 : 1024;
  const noms = FAMILLES_NOMS[fam];
  let valeur = n / base;
  let j = i + 1;
  while (valeur >= base && j < noms.length - 1) {
    valeur /= base;
    j += 1;
  }
  return { value: arrondir(valeur, decimals), unit: noms[j] };
}

// Conserver la signature appelée aujourd'hui par ChartLine.vue et cie (appUtils.js:81) :
// nombre nu quand `showUnit` est faux (n-number-animation), texte sinon. Une valeur muette
// renvoie INDISPONIBLE, jamais 0.
export function formatValue({ value, unit, showUnit = false, decimals = 2 } = {}) {
  if (!estMesure(value)) return showUnit ? INDISPONIBLE : null;

  const n = versNombre(value);
  if (estUniteOctets(unit)) {
    const affiche = afficherOctets(n, unit, decimals);
    return showUnit ? `${affiche.value} ${affiche.unit}` : affiche.value;
  }

  switch (String(unit)) {
    case "%": {
      // Fiche § 4 : charge et utilisation se lisent en entier — la precision est decidee par
      // l'unite, pas par l'appelant (ancien code : Math.round ici, decimal partout ailleurs).
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
      const m = formatMetric(n, "frequence", { source: String(unit).toLowerCase().endsWith("hz") && String(unit).toLowerCase().startsWith("m") ? "MHz" : "GHz" });
      return showUnit ? `${m.value} ${m.unit}` : m.value;
    }
    case "W": {
      // Fiche § 4 : puissance en W, 1 decimale, decidee par l'unite.
      const v = arrondir(n, 1);
      return showUnit ? `${v} W` : v;
    }
    case "o/s":
    case "b/s": {
      // Case 11 : le debit arrive en OCTETS par seconde (networkStats.rx_sec) ; la meme
      // regle que formatMetric("debit") decida bits ou octets (reglage `debit`, defs = bits
      // comme Task Manager). Valeur et unite calculees ensemble, jamais l'une sans l'autre.
      const m = formatMetric(n, "debit");
      return showUnit ? `${m.value} ${m.unit}` : m.value;
    }
    case "s":
      return showUnit ? formatDuree(n) : Math.round(n);
    default: {
      const v = decimals > 0 ? arrondir(n, decimals) : Math.round(n);
      return showUnit ? `${v} ${unit}` : v;
    }
  }
}

// Conserver la signature appelée aujourd'hui (appUtils.js:110) : l'unité annoncée est celle
// que formatValue afficherait pour la même valeur — une seule règle, plus de divergence.
export function getValueUnit(value, unit) {
  if (!estMesure(value)) return unit;
  if (unit === "o/s" || unit === "b/s") return formatMetric(versNombre(value), "debit").unit;
  if (!estUniteOctets(unit)) return unit;
  return afficherOctets(versNombre(value), unit, 2).unit;
}
