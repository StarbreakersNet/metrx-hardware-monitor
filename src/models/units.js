/**
 * Unités des valeurs mesurées. L'identifiant sert aux calculs (formatage, échelle) et à la fusion
 * des graphiques (seules les séries de même unité sont fusionnables) ; il n'est jamais affiché.
 * Le symbole visible est traduit dans locales/*.json (`units.labels.<id>`).
 *
 * Les octets et les hertz sont stockés dans l'unité de base et affichés avec le multiple adapté
 * (Ko, Mo, Go… / kHz, MHz, GHz…).
 */
export const UNITS = Object.freeze({
  PERCENT: "percent",
  BYTES: "bytes",
  HERTZ: "hertz",
  CELSIUS: "celsius",
  WATT: "watt",
});

function multiply(value, factor) {
  return value === undefined || value === null ? value : value * factor;
}

/** systeminformation donne la VRAM en Mio : conversion en octets pour la comparer à la RAM */
export function mebibytesToBytes(value) {
  return multiply(value, 1024 * 1024);
}

/** Fréquence du GPU (systeminformation : MHz) en hertz */
export function megahertzToHertz(value) {
  return multiply(value, 1e6);
}

/** Fréquence du CPU (systeminformation : GHz) en hertz */
export function gigahertzToHertz(value) {
  return multiply(value, 1e9);
}
