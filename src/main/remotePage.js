// La page mobile du tableau de bord distant (option tele-metrie).
// Module VOLONTAIREMENT sans import : buildRemotePage() renvoie une chaine autonome (HTML+CSS+JS),
// sans CDN ni URL externe — elle doit ouvrir sur Safari iOS meme sans Internet.
// Les unites ne sont PAS ici : la page fait `import ... from "./units.js"` (route servie par
// remote.js avec le fichier units.js exact), donc le formatage reste un seul endroit.
// Le JS embarque evite les backticks : la page est generee dans un gabarit, ${} serait a echapper.

export function buildRemotePage({ titre = "Metrx" } = {}) {
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
<link rel="icon" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
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
#freshness { font-size: 12px; color: #8b93a3; }
#freshness.green::before, #freshness.orange::before, #freshness.red::before {
  content: ""; display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px;
}
#freshness.green::before { background: #3fb950; }
#freshness.orange::before { background: #d29922; }
#freshness.red::before { background: #f85149; }
main { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.card { background: #141923; border: 1px solid #232a38; border-radius: 14px; padding: 12px 13px; }
.card h2 { font: 11px/1.3 inherit; font-weight: 500; letter-spacing: .03em; text-transform: uppercase; color: #8b93a3; margin-bottom: 7px; }
.value { font-size: 21px; font-weight: 650; font-variant-numeric: tabular-nums; }
.sub { font-size: 11px; color: #8b93a3; margin-top: 3px; }
#message { grid-column: 1 / -1; text-align: center; color: #8b93a3; padding: 40px 0; }
</style>
</head>
<body>
<header><h1>` +
    t +
    `</h1><span id="freshness">hors ligne</span></header>
<main id="cards"><p id="message">Connexion…</p></main>
<script type="module">
import { formatValue, formatDuration } from "./units.js";

var REFRESH_MS = 2000;
var token = new URLSearchParams(location.search).get("token") || "";
var main = document.getElementById("cards");
var dot = document.getElementById("freshness");

function card(title, value, sub) {
  var div = document.createElement("div");
  div.className = "card";
  var h2 = document.createElement("h2");
  h2.textContent = title;
  var p = document.createElement("p");
  p.className = "value";
  p.textContent = value;
  div.append(h2, p);
  if (sub) {
    var s = document.createElement("p");
    s.className = "sub";
    s.textContent = sub;
    div.append(s);
  }
  return div;
}

// Une ligne = une sonde ; formatValue decide de la valeur ET de l'unite.
// Valeur muette (null/NaN) => carte absente, jamais un 0 invente (meme regle que l'app).
function row(title, value, unit) {
  var text = formatValue({ value: value, unit: unit, showUnit: true });
  return text === null ? null : card(title, text);
}

function render(p) {
  var cards = [];
  if (p.currentLoad) cards.push(row("CPU - charge", p.currentLoad.currentLoad, "%"));
  if (p.cpuCurrentSpeed) cards.push(row("CPU - horloge", p.cpuCurrentSpeed.avg, "GHz"));
  if (p.cpuTemperature) cards.push(row("CPU - temperature", p.cpuTemperature.main, "°C"));
  var controllers = (p.graphics && p.graphics.controllers) || [];
  controllers.forEach(function (c, i) {
    var name = controllers.length > 1 ? "GPU " + i : "GPU";
    cards.push(row(name + " - utilisation", c.utilizationGpu, "%"));
    cards.push(row(name + " - VRAM", c.memoryUsed, "Mo"));
    cards.push(row(name + " - temperature", c.temperatureGpu, "°C"));
    cards.push(row(name + " - puissance", c.powerDraw, "W"));
    cards.push(row(name + " - horloge", c.clockCore, "MHz"));
    cards.push(row(name + " - ventilateur", c.fanSpeed, "%"));
  });
  if (p.mem) {
    var used = formatValue({ value: p.mem.used, unit: "B", showUnit: true });
    if (used !== null) {
      var total = formatValue({ value: p.mem.total, unit: "B", showUnit: true });
      cards.push(card("RAM - utilisee", used, total ? "sur " + total : ""));
    }
  }
  if (p.time && p.time.uptime) cards.push(card("Systeme - uptime", formatDuration(p.time.uptime)));
  var visible = cards.filter(Boolean);
  main.textContent = "";
  if (visible.length === 0) {
    var empty = document.createElement("p");
    empty.id = "message";
    empty.textContent = "Aucune sonde active sur cette machine.";
    main.append(empty);
    return;
  }
  main.append.apply(main, visible);
}

function showMessage(text) {
  main.textContent = "";
  var p = document.createElement("p");
  p.id = "message";
  p.textContent = text;
  main.append(p);
}

function mark(ageSec, klass) {
  dot.textContent = ageSec === null ? "hors ligne" : ageSec <= 1 ? "a l'instant" : "il y a " + Math.round(ageSec) + " s";
  dot.className = klass;
}

async function load() {
  var url = "/api/metrics";
  if (token) url += "?token=" + encodeURIComponent(token);
  try {
    var res = await fetch(url, { cache: "no-store" });
    if (res.status === 503) { showMessage("Aucune mesure pour l'instant."); mark(0, "orange"); return; }
    if (!res.ok) { showMessage("Refuse par la machine (" + res.status + ")."); mark(null, "red"); return; }
    var body = await res.json();
    render(body.payload);
    mark((Date.now() - body.timestamp) / 1000, (Date.now() - body.timestamp) < 6000 ? "green" : "orange");
  } catch (e) {
    showMessage("Machine injoignable.");
    mark(null, "red");
  }
}

load();
setInterval(load, REFRESH_MS);
</script>
</body>
</html>
`;
}
