// Variabili globali per filtri
let currentStatusFilter = "all";
let currentSortFilter = "none";
let currentSearchTerm = "";
let allManga = [];

// Theme Manager
const defaultTheme = {
  "--primary-color": "#0ea5e9",
  "--secondary-color": "#0284c7",
  "--success-color": "#10b981",
  "--danger-color": "#ef4444",
  "--warning-color": "#f59e0b",
  "--bg-body-start": "#0ea5e9",
  "--bg-body-end": "#0284c7",
  "--bg-container-rgb": "255, 255, 255",
  "--bg-card": "#ffffff",
  "--bg-filter-section": "#f8fafc",
  "--bg-input": "#f8fafc",
  "--text-main": "#374151",
  "--text-muted": "#64748b",
  "--border-color": "#e2e8f0",
};

// Helper to convert hex to rgb
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "255, 255, 255";
}

// Helper to convert rgb string "r, g, b" to hex
function rgbToHex(rgbStr) {
  const [r, g, b] = rgbStr.split(",").map((x) => parseInt(x.trim()));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function loadTheme() {
  const savedTheme = JSON.parse(localStorage.getItem("mangadb_theme") || "{}");
  const theme = { ...defaultTheme, ...savedTheme };

  Object.entries(theme).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
}

function saveThemeSettings() {
  const containerHex = document.getElementById("theme-bg-container").value;
  const containerRgb = hexToRgb(containerHex);

  const theme = {
    "--primary-color": document.getElementById("theme-primary").value,
    "--secondary-color": document.getElementById("theme-secondary").value,
    "--success-color": document.getElementById("theme-success").value,
    "--danger-color": document.getElementById("theme-danger").value,
    "--warning-color": document.getElementById("theme-warning").value,
    "--bg-body-start": document.getElementById("theme-bg-body-start").value,
    "--bg-body-end": document.getElementById("theme-bg-body-end").value,
    "--bg-container-rgb": containerRgb,
    "--bg-card": document.getElementById("theme-bg-card").value,
    "--bg-filter-section": document.getElementById("theme-bg-filter-section")
      .value,
    "--bg-input":
      document.getElementById("theme-bg-card").value === "#000000"
        ? "#1f2937"
        : "#f8fafc", // Simple dark mode logic for input
    "--text-main": document.getElementById("theme-text-main").value,
    "--text-muted": document.getElementById("theme-text-muted").value,
    "--border-color":
      document.getElementById("theme-bg-card").value === "#000000" ||
      document.getElementById("theme-bg-card").value < "#444444"
        ? "#374151"
        : "#e2e8f0",
  };

  // Advanced dark mode logic: if card is dark, make input and border dark
  // Check brightness of card bg
  const cardHex = theme["--bg-card"];
  const r = parseInt(cardHex.substr(1, 2), 16);
  const g = parseInt(cardHex.substr(3, 2), 16);
  const b = parseInt(cardHex.substr(5, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

  if (yiq < 128) {
    theme["--bg-input"] = "#1f2937"; // Dark input
    theme["--border-color"] = "#374151"; // Dark border
  } else {
    theme["--bg-input"] = "#f8fafc"; // Light input
    theme["--border-color"] = "#e2e8f0"; // Light border
  }

  localStorage.setItem("mangadb_theme", JSON.stringify(theme));
  loadTheme();
}

function resetTheme() {
  if (confirm("Vuoi davvero ripristinare i colori di default?")) {
    localStorage.removeItem("mangadb_theme");
    loadTheme();
    openSettings(); // Refresh inputs
  }
}

// Inizializzazione dell'app
document.addEventListener("DOMContentLoaded", async () => {
  try {
    loadTheme();
    showMessage("Inizializzazione in corso...", "info");
    await mangaManager.initialize();
    await loadManga();
    hideMessage();
  } catch (error) {
    showError("Errore nell'inizializzazione: " + error.message);
  }
});

// Carica tutti i manga
async function loadManga() {
  try {
    allManga = await mangaManager.getAllManga();
    await updateStats();
    filterAndDisplayManga();
  } catch (error) {
    showError("Errore nel caricamento dei manga: " + error.message);
  }
}

// Filtra e mostra i manga
function filterAndDisplayManga() {
  let filteredManga = [...allManga];

  // Applica filtro di ricerca
  if (currentSearchTerm) {
    filteredManga = filteredManga.filter((manga) =>
      manga.nome.toLowerCase().includes(currentSearchTerm.toLowerCase()),
    );
  }

  // Applica filtro di stato
  if (currentStatusFilter === "read") {
    filteredManga = filteredManga.filter(
      (manga) =>
        manga.status === "reading" ||
        (manga.status === undefined && manga.started),
    );
  } else if (currentStatusFilter === "unread") {
    filteredManga = filteredManga.filter(
      (manga) =>
        manga.status === "unread" ||
        (manga.status === undefined && !manga.started),
    );
  } else if (currentStatusFilter === "planning") {
    filteredManga = filteredManga.filter(
      (manga) => manga.status === "planning",
    );
  } else if (currentStatusFilter === "dropped") {
    filteredManga = filteredManga.filter((manga) => manga.status === "dropped");
  } else if (currentStatusFilter === "completed") {
    filteredManga = filteredManga.filter(
      (manga) => manga.status === "completed",
    );
  } else if (currentStatusFilter === "updates") {
    filteredManga = filteredManga.filter(
      (manga) =>
        typeof mangaHasUpdates !== "undefined" && mangaHasUpdates(manga.link),
    );
  } // Applica ordinamento
  if (currentSortFilter === "newest") {
    filteredManga.sort(
      (a, b) => new Date(b.last_updated) - new Date(a.last_updated),
    );
  } else if (currentSortFilter === "oldest") {
    filteredManga.sort(
      (a, b) => new Date(a.last_updated) - new Date(b.last_updated),
    );
  }

  displayManga(filteredManga);
  updateFilterCounts();
}

// Mostra i manga nella griglia
function displayManga(manga) {
  const grid = document.getElementById("manga-grid");

  if (manga.length === 0) {
    grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #64748b;">
                <i class="fas fa-book-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <h3>Nessun manga trovato</h3>
                <p>Aggiungi il tuo primo manga cliccando il pulsante +</p>
            </div>
        `;
    return;
  }

  grid.innerHTML = manga
    .map((m) => {
      const safeLink = m.link.replace(/'/g, "\\'");
      const safeName = escapeHtml(m.nome);
      const chaptersRead = Math.round((m.chapter_read || 0) * 10) / 10;

      // Controlla se il manga ha aggiornamenti
      const hasUpdates =
        typeof mangaHasUpdates !== "undefined" && mangaHasUpdates(m.link);
      let statusClass = "";
      const status = m.status || (m.started ? "reading" : "unread");

      if (hasUpdates) {
        statusClass = "has-updates";
      } else if (status === "unread") {
        statusClass = "unread";
      } else if (status === "planning") {
        statusClass = "planning";
      } else if (status === "dropped") {
        statusClass = "dropped";
      } else if (status === "completed") {
        statusClass = "completed";
      }

      return `
        <div class="manga-card">
            <div class="manga-status ${statusClass}" title="${status}"></div>
            <div class="manga-title">${safeName}</div>
            <a href="${escapeHtml(m.link)}" target="_blank" class="manga-link">
                <i class="fas fa-external-link-alt"></i> Vai al manga
            </a>
            <div class="manga-date">
                <i class="fas fa-book-reader"></i>
                Capitoli letti: <strong>${chaptersRead}</strong>
            </div>
            <div class="manga-date">
                <i class="fas fa-clock"></i>
                Aggiornato: ${formatDate(m.last_updated)}
            </div>
            <div class="manga-actions">
                <button class="btn-modern btn-success-modern" onclick="toggleMangaStatus('${safeLink}')" title="Cambia stato rapido (Letto/Non Letto)">
                    <i class="fas fa-${m.started ? "undo" : "check"}"></i>
                    ${m.started ? "Non Letto" : "Letto"}
                </button>
                <button class="btn-modern btn-primary-modern" onclick="editManga(${m.id})">
                    <i class="fas fa-edit"></i> Modifica
                </button>
                <button class="btn-modern btn-danger-modern" onclick="deleteMangaConfirm('${safeLink}', '${safeName}')">
                    <i class="fas fa-trash"></i> Elimina
                </button>
            </div>
        </div>
        `;
    })
    .join("");
}

// Aggiorna le statistiche
async function updateStats() {
  try {
    const stats = await mangaManager.getStats();
    document.getElementById("stat-total").textContent = stats.total;
    document.getElementById("stat-read").textContent = stats.reading;
    document.getElementById("stat-unread").textContent = stats.unread;
    document.getElementById("stat-planning").textContent = stats.planning;
    document.getElementById("stat-dropped").textContent = stats.dropped;
    document.getElementById("stat-completed").textContent = stats.completed;
    document.getElementById("total-count").textContent = stats.total;
  } catch (error) {
    console.error("Errore nell'aggiornamento delle statistiche:", error);
  }
}

// Aggiorna i conteggi nei filtri
function updateFilterCounts() {
  const readCount = allManga.filter(
    (m) => m.status === "reading" || (m.status === undefined && m.started),
  ).length;
  const unreadCount = allManga.filter(
    (m) => m.status === "unread" || (m.status === undefined && !m.started),
  ).length;
  const planningCount = allManga.filter((m) => m.status === "planning").length;
  const droppedCount = allManga.filter((m) => m.status === "dropped").length;
  const completedCount = allManga.filter(
    (m) => m.status === "completed",
  ).length;
  const updatesCount = allManga.filter(
    (m) => typeof mangaHasUpdates !== "undefined" && mangaHasUpdates(m.link),
  ).length;

  document.querySelector('[data-filter="read"]').innerHTML = `
        <i class="fas fa-check"></i> Letti (${readCount})
    `;
  document.querySelector('[data-filter="unread"]').innerHTML = `
        <i class="fas fa-clock"></i> Non Letti (${unreadCount})
    `;
  document.querySelector('[data-filter="planning"]').innerHTML = `
        <i class="fas fa-calendar"></i> Pianificati (${planningCount})
    `;
  document.querySelector('[data-filter="dropped"]').innerHTML = `
        <i class="fas fa-times"></i> Abbandonati (${droppedCount})
    `;
  document.querySelector('[data-filter="completed"]').innerHTML = `
        <i class="fas fa-check-double"></i> Completati (${completedCount})
    `;
  document.querySelector('[data-filter="updates"]').innerHTML = `
        <i class="fas fa-bell"></i> Novità (${updatesCount})
    `;
}

// Imposta filtro di stato
function setStatusFilter(filter) {
  currentStatusFilter = filter;

  // Aggiorna UI
  document.querySelectorAll("[data-filter]").forEach((el) => {
    el.classList.remove("active");
  });
  document.querySelector(`[data-filter="${filter}"]`).classList.add("active");

  filterAndDisplayManga();
}

// Imposta filtro di ordinamento
function setSortFilter(sort) {
  currentSortFilter = sort;

  // Aggiorna UI
  document.querySelectorAll("[data-sort]").forEach((el) => {
    el.classList.remove("active");
  });
  document.querySelector(`[data-sort="${sort}"]`).classList.add("active");

  filterAndDisplayManga();
}

// Cerca manga
function searchManga() {
  currentSearchTerm = document.getElementById("search-input").value.trim();
  filterAndDisplayManga();
}

// Event listener per ricerca in tempo reale
document.getElementById("search-input").addEventListener("input", (e) => {
  currentSearchTerm = e.target.value.trim();
  filterAndDisplayManga();
});

// Modifica manga
function editManga(id) {
  const manga = allManga.find((m) => m.id === id);
  if (!manga) return;

  document.getElementById("modalTitle").textContent = "Modifica Manga";
  document.getElementById("manga-id").value = manga.id;
  document.getElementById("manga-name").value = manga.nome;
  document.getElementById("manga-link").value = manga.link;

  // Determine status
  const status = manga.status || (manga.started ? "reading" : "unread");
  document.getElementById("manga-status").value = status;

  document.getElementById("manga-chapters").value =
    Math.round((manga.chapter_read || 0) * 10) / 10;

  new bootstrap.Modal(document.getElementById("mangaModal")).show();
}

// Salva manga (aggiungi o modifica)
async function saveManga() {
  const id = document.getElementById("manga-id").value;
  const nome = document.getElementById("manga-name").value.trim();
  const link = document.getElementById("manga-link").value.trim();
  const status = document.getElementById("manga-status").value;
  const started = status === "reading";
  const chapterRead =
    parseFloat(document.getElementById("manga-chapters").value) || 0.0;

  if (!nome || !link) {
    showError("Nome e link sono obbligatori");
    return;
  }

  try {
    if (id) {
      // Modifica
      await mangaManager.updateManga(
        parseInt(id),
        nome,
        link,
        started,
        chapterRead,
        null,
        status,
      );
      showMessage("Manga aggiornato con successo!");
    } else {
      // Aggiungi
      await mangaManager.addManga(nome, link, started, chapterRead, status);
      showMessage("Manga aggiunto con successo!");
    }

    // Chiudi modal e ricarica
    bootstrap.Modal.getInstance(document.getElementById("mangaModal")).hide();
    await loadManga();
  } catch (error) {
    showError("Errore nel salvataggio: " + error.message);
  }
}

// Mostra modal per aggiungere manga
function showAddModal() {
  document.getElementById("modalTitle").textContent = "Aggiungi Manga";
  document.getElementById("manga-form").reset();
  document.getElementById("manga-id").value = "";
  document.getElementById("manga-chapters").value = "0.0"; // Default a 0.0
  document.getElementById("manga-status").value = "unread";
  new bootstrap.Modal(document.getElementById("mangaModal")).show();
}

// Cambia stato di lettura
async function toggleMangaStatus(link) {
  try {
    await mangaManager.updateMangaStarted(link);
    await loadManga();
    showMessage("Stato aggiornato con successo!");
  } catch (error) {
    showError("Errore nell'aggiornamento: " + error.message);
  }
}

// Conferma eliminazione
function deleteMangaConfirm(link, nome) {
  if (confirm(`Sei sicuro di voler eliminare "${nome}"?`)) {
    deleteManga(link);
  }
}

// Elimina manga
async function deleteManga(link) {
  try {
    await mangaManager.deleteManga(link);
    await loadManga();
    showMessage("Manga eliminato con successo!");
  } catch (error) {
    showError("Errore nell'eliminazione: " + error.message);
  }
}

// Salva su S3
async function saveToS3() {
  try {
    showMessage("Salvataggio su S3 in corso...", "info");
    await mangaManager.saveToS3();
    showMessage("Dati salvati su S3 con successo!");
  } catch (error) {
    showError("Errore nel salvataggio su S3: " + error.message);
  }
}

// Ricompatta ID
async function recompactIds() {
  if (
    !confirm(
      "Sei sicuro di voler ricompattare gli ID? Questa operazione non può essere annullata.",
    )
  ) {
    return;
  }

  try {
    const total = await mangaManager.recompactIds();
    await loadManga();
    showMessage(`ID ricompattati con successo! Totale record: ${total}`);
  } catch (error) {
    showError("Errore nella ricompattazione: " + error.message);
  }
}

async function createBackup() {
  try {
    // Chiedi all'utente il bucket di destinazione (opzionale)
    const customBucket = prompt(
      "Inserisci il nome del bucket per il backup (lascia vuoto per usare quello corrente):",
    );

    // Se l'utente preme Cancel, interrompi l'operazione
    if (customBucket === null) {
      showMessage("Backup annullato dall'utente", "info");
      return;
    }

    showMessage("Creazione backup in corso...", "info");

    const backupFileName = await mangaManager.createBackup(
      customBucket || null,
    );
    showMessage(`Backup creato con successo: ${backupFileName}`, "success");
  } catch (error) {
    console.error("Errore nella creazione del backup:", error);
    showError("Errore nella creazione del backup: " + error.message);
  }
}

// Impostazioni
function openSettings() {
  const customProxy = localStorage.getItem("custom_proxy_url") || "";
  document.getElementById("custom-proxy").value = customProxy;

  // Load theme colors
  const savedTheme = JSON.parse(localStorage.getItem("mangadb_theme") || "{}");
  const theme = { ...defaultTheme, ...savedTheme };

  // Set values for color inputs
  document.getElementById("theme-primary").value = theme["--primary-color"];
  document.getElementById("theme-secondary").value = theme["--secondary-color"];
  document.getElementById("theme-success").value = theme["--success-color"];
  document.getElementById("theme-danger").value = theme["--danger-color"];
  document.getElementById("theme-warning").value = theme["--warning-color"];

  // New fields
  document.getElementById("theme-bg-body-start").value =
    theme["--bg-body-start"];
  document.getElementById("theme-bg-body-end").value = theme["--bg-body-end"];
  document.getElementById("theme-bg-card").value = theme["--bg-card"];
  document.getElementById("theme-bg-filter-section").value =
    theme["--bg-filter-section"];
  document.getElementById("theme-text-main").value = theme["--text-main"];
  document.getElementById("theme-text-muted").value = theme["--text-muted"];

  // Container needs hex from rgb
  document.getElementById("theme-bg-container").value = rgbToHex(
    theme["--bg-container-rgb"],
  );

  new bootstrap.Modal(document.getElementById("settingsModal")).show();
}

function saveSettings() {
  const customProxy = document.getElementById("custom-proxy").value.trim();
  if (customProxy) {
    localStorage.setItem("custom_proxy_url", customProxy);
  } else {
    localStorage.removeItem("custom_proxy_url");
  }

  saveThemeSettings();

  bootstrap.Modal.getInstance(document.getElementById("settingsModal")).hide();
  showMessage("Impostazioni salvate!");
}

// Menu Toggle
function toggleMenu() {
  document.getElementById("main-menu").classList.toggle("show");
}

// Chiudi menu se si clicca fuori
document.addEventListener("click", function (event) {
  const menu = document.getElementById("main-menu");
  const btn = document.querySelector(".menu-btn");
  if (
    menu &&
    btn &&
    !menu.contains(event.target) &&
    !btn.contains(event.target)
  ) {
    menu.classList.remove("show");
  }
});

// Utility functions
function showMessage(message, type = "success") {
  const alert = document.getElementById("message-alert");
  const text = document.getElementById("message-text");

  text.textContent = message;
  alert.className = `alert-modern alert-${type === "info" ? "primary" : "success"}-modern`;
  alert.style.display = "block";

  if (type !== "info") {
    setTimeout(() => {
      alert.style.display = "none";
    }, 3000);
  }
}

function showError(message) {
  const alert = document.getElementById("error-alert");
  const text = document.getElementById("error-text");

  text.textContent = message;
  alert.style.display = "block";

  setTimeout(() => {
    alert.style.display = "none";
  }, 5000);
}

function hideMessage() {
  document.getElementById("message-alert").style.display = "none";
  document.getElementById("error-alert").style.display = "none";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("it-IT", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
