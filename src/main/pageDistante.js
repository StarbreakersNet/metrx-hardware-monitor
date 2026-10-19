// Case 14 - la page mobile du tableau de bord distant (consigne durable 2).
// Module VOLONTAIREMENT sans import : construirePage() renvoie une chaine autonome (HTML+CSS+JS),
// sans CDN ni URL externe — elle doit ouvrir sur Safari iOS meme sans Internet.
// Les unites ne sont PAS ici : la page fait `import ... from "./units.js"` (route servie par
// remote.js avec le fichier units.js exact), donc le formatage reste un seul endroit (case 4).
// Le JS embarque evite les backticks : la page est generee dans un gabarit, ${} serait a echapper.

export function construirePage({ titre = "Metrx" } = {}) {
  const t = String(titre).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#0b0e14">
<title>` +
    t +
    `</title>
<style>
:root { color-scheme: dark; }
* { box-sizing: border-box; margin: 0; }
body {
  font: 15px/1.4 -apple-system, "Segoe UI", Roboto, sans-serif;
  background: #0b0e14; color: #e6e9ef;
  padding: calc(env(safe-area-inset-top) + 12px) 14px calc(env(safe-area-inset-bottom) + 20px);
}
header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 14px; }
h1 { font-size: 19px; font-weight: 650; }
#fraicheur { font-size: 12px; color: #8b93a3; }
#fraicheur.vert::before, #fraicheur.orange::before, #fraicheur.rouge::before {
  content: ""; display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px;
}
#fraicheur.vert::before { background: #3fb950; }
#fraicheur.orange::before { background: #d29922; }
#fraicheur.rouge::before { background: #f85149; }
main { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.carte { background: #141923; border: 1px solid #232a38; border-radius: 14px; padding: 12px 13px; }
.carte h2 { font: 11px/1.3 inherit; font-weight: 500; letter-spacing: .03em; text-transform: uppercase; color: #8b93a3; margin-bottom: 7px; }
.valeur { font-size: 21px; font-weight: 650; font-variant-numeric: tabular-nums; }
.sous { font-size: 11px; color: #8b93a3; margin-top: 3px; }
#etat { grid-column: 1 / -1; text-align: center; color: #8b93a3; padding: 40px 0; }
</style>
</head>
<body>
<header><h1>` +
    t +
    `</h1><span id="fraicheur">hors ligne</span></header>
<main id="cartes"><p id="etat">Connexion…</p></main>
<script type="module">
import { formatValue, formatDuree } from "./units.js";

var REFRESH_MS = 2000;
var jeton = new URLSearchParams(location.search).get("token") || "";
var main = document.getElementById("cartes");
var pastille = document.getElementById("fraicheur");

function carte(titre, valeur, sous) {
  var div = document.createElement("div");
  div.className = "carte";
  var h2 = document.createElement("h2");
  h2.textContent = titre;
  var p = document.createElement("p");
  p.className = "valeur";
  p.textContent = valeur;
  div.append(h2, p);
  if (sous) {
    var s = document.createElement("p");
    s.className = "sous";
    s.textContent = sous;
    div.append(s);
  }
  return div;
}

// Une ligne = une sonde ; formatValue decide de la valeur ET de l'unite (case 4).
// Valeur muette (null/NaN) => carte absente, jamais un 0 invente (meme regle que l'app).
function ligne(titre, value, unit) {
  var texte = formatValue({ value: value, unit: unit, showUnit: true });
  return texte === null ? null : carte(titre, texte);
}

function rendre(p) {
  var cartes = [];
  if (p.currentLoad) cartes.push(ligne("CPU - charge", p.currentLoad.currentLoad, "%"));
  if (p.cpuCurrentSpeed) cartes.push(ligne("CPU - horloge", p.cpuCurrentSpeed.avg, "GHz"));
  if (p.cpuTemperature) cartes.push(ligne("CPU - temperature", p.cpuTemperature.main, "°C"));
  var controleurs = (p.graphics && p.graphics.controllers) || [];
  controleurs.forEach(function (c, i) {
    var nom = controleurs.length > 1 ? "GPU " + i : "GPU";
    cartes.push(ligne(nom + " - utilisation", c.utilizationGpu, "%"));
    cartes.push(ligne(nom + " - VRAM", c.memoryUsed, "Mo"));
    cartes.push(ligne(nom + " - temperature", c.temperatureGpu, "°C"));
    cartes.push(ligne(nom + " - puissance", c.powerDraw, "W"));
    cartes.push(ligne(nom + " - horloge", c.clockCore, "MHz"));
    cartes.push(ligne(nom + " - ventilateur", c.fanSpeed, "%"));
  });
  if (p.mem) {
    var utilisee = formatValue({ value: p.mem.used, unit: "B", showUnit: true });
    if (utilisee !== null) {
      var total = formatValue({ value: p.mem.total, unit: "B", showUnit: true });
      cartes.push(carte("RAM - utilisee", utilisee, total ? "sur " + total : ""));
    }
  }
  if (p.time && p.time.uptime) cartes.push(carte("Systeme - uptime", formatDuree(p.time.uptime)));
  var visibles = cartes.filter(Boolean);
  main.textContent = "";
  if (visibles.length === 0) {
    var vide = document.createElement("p");
    vide.id = "etat";
    vide.textContent = "Aucune sonde active sur cette machine.";
    main.append(vide);
    return;
  }
  main.append.apply(main, visibles);
}

function etat(texte) {
  main.textContent = "";
  var p = document.createElement("p");
  p.id = "etat";
  p.textContent = texte;
  main.append(p);
}

function marquer(ageSec, classe) {
  pastille.textContent = ageSec === null ? "hors ligne" : ageSec <= 1 ? "a l'instant" : "il y a " + Math.round(ageSec) + " s";
  pastille.className = classe;
}

async function charger() {
  var url = "/api/metrics";
  if (jeton) url += "?token=" + encodeURIComponent(jeton);
  try {
    var res = await fetch(url, { cache: "no-store" });
    if (res.status === 503) { etat("Aucune mesure pour l'instant."); marquer(0, "orange"); return; }
    if (!res.ok) { etat("Refuse par la machine (" + res.status + ")."); marquer(null, "rouge"); return; }
    var corps = await res.json();
    rendre(corps.payload);
    marquer((Date.now() - corps.horodatage) / 1000, (Date.now() - corps.horodatage) < 6000 ? "vert" : "orange");
  } catch (e) {
    etat("Machine injoignable.");
    marquer(null, "rouge");
  }
}

charger();
setInterval(charger, REFRESH_MS);
</script>
</body>
</html>
`;
}
