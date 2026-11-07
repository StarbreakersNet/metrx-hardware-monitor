/**
 * Unités des valeurs mesurées. L'identifiant sert aux calculs (formatage, échelle) et à la fusion
 * des graphiques (seules les séries de même unité sont fusionnables) ; il n'est jamais affiché.
 * Le libellé visible est traduit dans locales/*.json (`units.labels.<id>`).
 */
export const UNITS = Object.freeze({
  PERCENT: "percent",
  BYTES: "bytes",
  CELSIUS: "celsius",
  WATT: "watt",
  MEGAHERTZ: "megahertz",
  GIGAHERTZ: "gigahertz",
});

/** systeminformation donne la VRAM en Mio : conversion en octets pour la comparer à la RAM */
export function mebibytesToBytes(value) {
  return value === undefined || value === null ? value : value * 1024 * 1024;
}
