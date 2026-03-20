// ============================================================
//  VÉLO TRACKER — Google Apps Script
//  Compteur de jours à vélo au boulot, par mois
// ============================================================

// --- CONFIGURATION ---
const SHEET_NAME = 'VeloData';
const SPREADSHEET_ID = ''; // Laisser vide = crée un nouveau classeur au premier lancement

// ============================================================
//  POINT D'ENTRÉE WEB APP
// ============================================================
function doGet() {
  return HtmlService
    .createHtmlOutput(getHtml())
    .setTitle('🚲 Vélo Tracker')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================================
//  FONCTIONS APPELÉES DEPUIS LE FRONT
// ============================================================

/** Retourne toutes les données nécessaires à l'affichage */
function getData() {
  const sheet = getSheet();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12

  // Lecture de toutes les lignes : [annee, mois, jours]
  const values = sheet.getDataRange().getValues();
  const stats = {};

  // Initialise tous les mois de l'année courante à 0
  for (let m = 1; m <= 12; m++) {
    stats[m] = 0;
  }

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row[0]) continue;
    const rowYear  = parseInt(row[0]);
    const rowMonth = parseInt(row[1]);
    const rowJours = parseInt(row[2]) || 0;
    if (rowYear === currentYear) {
      stats[rowMonth] = rowJours;
    }
  }

  const monthsData = [];
  for (let m = 1; m <= 12; m++) {
    monthsData.push({ month: m, days: stats[m] });
  }

  const totalYear = monthsData.reduce((s, d) => s + d.days, 0);

  return {
    year: currentYear,
    currentMonth: currentMonth,
    months: monthsData,
    total: totalYear
  };
}

/** Ajoute +1 au mois courant */
function increment() {
  return changeDay(+1);
}

/** Retire -1 au mois courant (minimum 0) */
function decrement() {
  return changeDay(-1);
}

function changeDay(delta) {
  const sheet = getSheet();
  const now = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  const values = sheet.getDataRange().getValues();
  let found = false;

  for (let i = 1; i < values.length; i++) {
    if (parseInt(values[i][0]) === year && parseInt(values[i][1]) === month) {
      const newVal = Math.max(0, (parseInt(values[i][2]) || 0) + delta);
      sheet.getRange(i + 1, 3).setValue(newVal);
      found = true;
      break;
    }
  }

  if (!found && delta > 0) {
    sheet.appendRow([year, month, 1]);
  }

  return getData();
}

// ============================================================
//  UTILITAIRES SPREADSHEET
// ============================================================
function getSheet() {
  let ss;
  try {
    if (SPREADSHEET_ID) {
      ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    } else {
      ss = SpreadsheetApp.getActive();
      if (!ss) {
        ss = SpreadsheetApp.create('VeloTracker');
      }
    }
  } catch(e) {
    ss = SpreadsheetApp.create('VeloTracker');
  }

  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Annee', 'Mois', 'Jours']);
    sheet.getRange('A1:C1').setFontWeight('bold');
  }
  return sheet;
}

// ============================================================
//  HTML / CSS / JS (interface front-end)
// ============================================================
function getHtml() {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🚲 Vélo Tracker</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --bg:        #0d1117;
    --surface:   #161b22;
    --surface2:  #1e2531;
    --accent:    #4ade80;
    --accent2:   #22c55e;
    --text:      #e6edf3;
    --muted:     #768390;
    --danger:    #f97316;
    --border:    #30363d;
    --radius:    14px;
    --font-head: 'Bebas Neue', sans-serif;
    --font-body: 'DM Sans', sans-serif;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-body);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px 16px 48px;
  }

  /* ---- HEADER ---- */
  header {
    text-align: center;
    margin-bottom: 32px;
  }
  header .title {
    font-family: var(--font-head);
    font-size: clamp(2.4rem, 8vw, 4rem);
    letter-spacing: 2px;
    color: var(--accent);
    line-height: 1;
  }
  header .subtitle {
    color: var(--muted);
    font-size: .85rem;
    font-weight: 300;
    margin-top: 4px;
    letter-spacing: .5px;
  }

  /* ---- MAIN CARD ---- */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 28px 24px;
    width: 100%;
    max-width: 480px;
    margin-bottom: 28px;
  }
  .card-title {
    font-family: var(--font-head);
    font-size: 1.1rem;
    letter-spacing: 1px;
    color: var(--muted);
    margin-bottom: 18px;
    text-transform: uppercase;
  }

  /* ---- COUNTER ---- */
  .counter-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .month-label {
    font-family: var(--font-head);
    font-size: 1.4rem;
    letter-spacing: 2px;
    color: var(--accent);
    text-transform: uppercase;
  }
  .count-display {
    font-family: var(--font-head);
    font-size: clamp(5rem, 18vw, 8rem);
    color: var(--text);
    line-height: 1;
    letter-spacing: -2px;
    transition: transform .1s ease;
  }
  .count-display.bump {
    transform: scale(1.12);
    color: var(--accent);
  }
  .count-sub {
    color: var(--muted);
    font-size: .8rem;
    font-weight: 300;
    margin-top: -6px;
  }

  /* ---- BUTTONS ---- */
  .btn-row {
    display: flex;
    gap: 14px;
    align-items: center;
    margin-top: 8px;
  }
  .btn-plus {
    background: var(--accent);
    color: #0d1117;
    border: none;
    border-radius: 50%;
    width: 90px;
    height: 90px;
    font-size: 2.8rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 0 0 0 rgba(74,222,128,.5);
    transition: transform .12s ease, box-shadow .2s ease, background .15s;
    flex-shrink: 0;
  }
  .btn-plus:hover {
    background: var(--accent2);
    box-shadow: 0 0 0 12px rgba(74,222,128,.12);
  }
  .btn-plus:active {
    transform: scale(.93);
    box-shadow: 0 0 0 4px rgba(74,222,128,.3);
  }
  .btn-minus {
    background: transparent;
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: 50%;
    width: 46px;
    height: 46px;
    font-size: 1.5rem;
    cursor: pointer;
    transition: color .15s, border-color .15s, transform .12s;
    flex-shrink: 0;
  }
  .btn-minus:hover {
    color: var(--danger);
    border-color: var(--danger);
  }
  .btn-minus:active {
    transform: scale(.9);
  }
  .btn-plus:disabled, .btn-minus:disabled {
    opacity: .4;
    cursor: not-allowed;
  }

  /* ---- STATS TABLE ---- */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .month-cell {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px 8px;
    text-align: center;
    transition: border-color .2s;
  }
  .month-cell.current {
    border-color: var(--accent);
    background: rgba(74,222,128,.06);
  }
  .month-cell.zero .mc-days {
    color: var(--muted);
  }
  .mc-name {
    font-size: .7rem;
    color: var(--muted);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: .5px;
    margin-bottom: 4px;
  }
  .mc-days {
    font-family: var(--font-head);
    font-size: 1.5rem;
    color: var(--text);
    line-height: 1;
  }
  .mc-unit {
    font-size: .6rem;
    color: var(--muted);
    font-weight: 300;
  }

  /* ---- TOTAL BADGE ---- */
  .total-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
    padding: 12px 16px;
    background: var(--surface2);
    border-radius: 10px;
    border: 1px solid var(--border);
  }
  .total-label {
    font-size: .8rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: .5px;
  }
  .total-value {
    font-family: var(--font-head);
    font-size: 1.8rem;
    color: var(--accent);
    letter-spacing: 1px;
  }
  .total-unit {
    font-size: .75rem;
    color: var(--muted);
    margin-left: 4px;
  }

  /* ---- LOADING ---- */
  .loading {
    opacity: .5;
    font-size: .85rem;
    color: var(--muted);
    text-align: center;
    padding: 20px;
  }

  /* ---- FOOTER ---- */
  footer {
    color: var(--muted);
    font-size: .72rem;
    text-align: center;
    margin-top: 12px;
    font-weight: 300;
  }
  footer span {
    color: var(--accent);
  }
</style>
</head>
<body>

<header>
  <div class="title">🚲 VÉLO TRACKER</div>
  <div class="subtitle" id="yearLabel">Chargement…</div>
</header>

<!-- COMPTEUR MOIS EN COURS -->
<div class="card">
  <div class="card-title">Mois en cours</div>
  <div class="counter-section">
    <div class="month-label" id="currentMonthLabel">—</div>
    <div class="count-display" id="countDisplay">—</div>
    <div class="count-sub">jours à vélo</div>
    <div class="btn-row">
      <button class="btn-minus" id="btnMinus" onclick="doDecrement()" title="Retirer un jour">−</button>
      <button class="btn-plus"  id="btnPlus"  onclick="doIncrement()" title="Ajouter un jour">+</button>
    </div>
  </div>
</div>

<!-- STATS PAR MOIS -->
<div class="card">
  <div class="card-title">Bilan <span id="statsYear">—</span></div>
  <div class="stats-grid" id="statsGrid">
    <div class="loading">Chargement des données…</div>
  </div>
  <div class="total-bar">
    <span class="total-label">Total année</span>
    <span>
      <span class="total-value" id="totalValue">—</span>
      <span class="total-unit">jours</span>
    </span>
  </div>
</div>

<footer>Données enregistrées dans Google Sheets · <span>Espace culturel l'Hermine</span></footer>

<script>
  const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin',
                     'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jui',
                        'Jul','Aoû','Sep','Oct','Nov','Déc'];
  let busy = false;

  function setBusy(state) {
    busy = state;
    document.getElementById('btnPlus').disabled  = state;
    document.getElementById('btnMinus').disabled = state;
  }

  function render(data) {
    // Header
    document.getElementById('yearLabel').textContent = 'Suivi ' + data.year;
    document.getElementById('statsYear').textContent = data.year;

    // Compteur mois courant
    const curDays = data.months[data.currentMonth - 1].days;
    document.getElementById('currentMonthLabel').textContent =
      MONTHS_FR[data.currentMonth - 1].toUpperCase();
    const disp = document.getElementById('countDisplay');
    disp.textContent = curDays;

    // Total
    document.getElementById('totalValue').textContent = data.total;

    // Grille des mois
    const grid = document.getElementById('statsGrid');
    grid.innerHTML = '';
    data.months.forEach(function(m) {
      const cell = document.createElement('div');
      cell.className = 'month-cell'
        + (m.month === data.currentMonth ? ' current' : '')
        + (m.days === 0 ? ' zero' : '');
      cell.innerHTML =
        '<div class="mc-name">' + MONTHS_SHORT[m.month - 1] + '</div>' +
        '<div class="mc-days">' + m.days + '</div>' +
        '<div class="mc-unit">jour' + (m.days > 1 ? 's' : '') + '</div>';
      grid.appendChild(cell);
    });
  }

  function bumpAnim() {
    const el = document.getElementById('countDisplay');
    el.classList.add('bump');
    setTimeout(function(){ el.classList.remove('bump'); }, 180);
  }

  function doIncrement() {
    if (busy) return;
    setBusy(true);
    bumpAnim();
    google.script.run
      .withSuccessHandler(function(data){ render(data); setBusy(false); })
      .withFailureHandler(function(e){ alert('Erreur : ' + e.message); setBusy(false); })
      .increment();
  }

  function doDecrement() {
    if (busy) return;
    setBusy(true);
    google.script.run
      .withSuccessHandler(function(data){ render(data); setBusy(false); })
      .withFailureHandler(function(e){ alert('Erreur : ' + e.message); setBusy(false); })
      .decrement();
  }

  // Chargement initial
  (function init() {
    setBusy(true);
    google.script.run
      .withSuccessHandler(function(data){ render(data); setBusy(false); })
      .withFailureHandler(function(e){ alert('Erreur : ' + e.message); setBusy(false); })
      .getData();
  })();
</script>
</body>
</html>`;
}

