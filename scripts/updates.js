// Funzione per controllare gli aggiornamenti dei manga su MangaBuddy
class MangaUpdater {
  constructor() {
    this.updatesInProgress = false;
    this.mangaWithUpdates = new Set();
    // Stato progress
    this.totalToProcess = 0;
    this.processedCount = 0;
  }

  // Funzione principale per controllare tutti gli aggiornamenti
  async checkAllUpdates() {
    if (this.updatesInProgress) {
      showMessage("Controllo aggiornamenti già in corso...", "info");
      return;
    }

    try {
      this.updatesInProgress = true;
      showMessage("Controllo aggiornamenti in corso...", "info");

      // Ottieni tutti i manga dal database
      const allManga = await mangaManager.getAllManga();
      const targetManga = allManga.filter((manga) => {
        // Scansiona solo i manga in lettura
        if (!manga.link || manga.status !== "reading") return false;
        try {
          return !!(
            window.UpdateRouter &&
            window.UpdateRouter.getProviderForUrl(manga.link)
          );
        } catch (e) {
          return false;
        }
      });

      if (targetManga.length === 0) {
        showMessage(
          "Nessun manga aggiornabile trovato per i provider registrati",
          "info",
        );
        return;
      }

      showMessage(`Controllo ${targetManga.length} manga...`, "info");

      // Reset dei manga con aggiornamenti e progress UI
      this.mangaWithUpdates.clear();
      this.totalToProcess = targetManga.length;
      this.processedCount = 0;
      this.initScanUI(this.totalToProcess);
      this.clearScanLogs();

      // Controlla ogni manga (con limite per evitare sovraccarico)
      const batchSize = 5; // Controlla 5 manga alla volta
      for (let i = 0; i < targetManga.length; i += batchSize) {
        const batch = targetManga.slice(i, i + batchSize);
        const promises = batch.map((manga) =>
          this.checkSingleMangaUpdate(manga),
        );
        await Promise.allSettled(promises);

        // Piccola pausa tra i batch per non sovraccaricare il server
        if (i + batchSize < targetManga.length) {
          await this.delay(1000);
        }
      }

      // Mostra risultati
      const updatesCount = this.mangaWithUpdates.size;
      if (updatesCount > 0) {
        showMessage(
          `Trovati ${updatesCount} manga con nuovi capitoli!`,
          "success",
        );
        // Ricarica la visualizzazione per mostrare i pallini
        filterAndDisplayManga();
      } else {
        showMessage("Nessun nuovo capitolo trovato", "info");
      }

      // Completa progress a fine scansione
      this.completeProgress();
    } catch (error) {
      console.error("Errore nel controllo aggiornamenti:", error);
      showError("Errore nel controllo aggiornamenti: " + error.message);
    } finally {
      this.updatesInProgress = false;
    }
  }

  // Controlla un singolo manga
  async checkSingleMangaUpdate(manga) {
    let provider = null;
    let availableChapters = null;
    let lastError = null;
    let fallbackLogs = [];

    try {
      const router = window.UpdateRouter;
      provider = router ? router.getProviderForUrl(manga.link) : null;
      console.log(
        `[Update] Controllo: ${manga.nome} (${manga.link}) via ${provider ? provider.name : "nessun provider"}`,
      );

      if (!provider) {
        console.warn(
          `Nessun provider registrato per ${manga.nome} (${manga.link}). Skipping.`,
        );
        this.appendScanLog(manga, "error", "Nessun provider registrato");
        this.incrementProgress();
        return;
      }

      try {
        availableChapters = await provider.getAvailableChapters(manga.link);
      } catch (e) {
        lastError = e;
        console.warn(
          `[Update] Main link fallito per ${manga.nome}, provo i fallback. Errore: ${e.message}`,
        );
        fallbackLogs.push(`Main link fallito: ${e.message}`);

        let fallbacks = [];
        try {
          if (manga.fallbacks) {
            fallbacks =
              typeof manga.fallbacks === "string"
                ? JSON.parse(manga.fallbacks)
                : manga.fallbacks;
          }
        } catch (err) {
          console.error("Errore parsing fallbacks:", err);
          fallbackLogs.push(`Errore parsing fallbacks JSON`);
        }

        if (fallbacks && fallbacks.length > 0) {
          for (const fallbackUrl of fallbacks) {
            try {
              const fbProvider = router.getProviderForUrl(fallbackUrl);
              if (!fbProvider) {
                console.warn(
                  `[Update] Nessun provider per il fallback: ${fallbackUrl}`,
                );
                fallbackLogs.push(
                  `Nessun provider per fallback: ${fallbackUrl}`,
                );
                continue;
              }
              console.log(
                `[Update] Provo fallback per ${manga.nome}: ${fallbackUrl} via ${fbProvider.name}`,
              );
              availableChapters =
                await fbProvider.getAvailableChapters(fallbackUrl);
              lastError = null; // Successo! Resetta l'errore
              fallbackLogs.push(
                `Fallback successo via ${fbProvider.name} (${fallbackUrl}): trovati ${availableChapters} capitoli`,
              );
              break; // Interrompi il ciclo dei fallback
            } catch (fallbackErr) {
              console.warn(
                `[Update] Fallback ${fallbackUrl} fallito per ${manga.nome}: ${fallbackErr.message}`,
              );
              fallbackLogs.push(
                `Fallback fallito via ${fbProvider ? fbProvider.name : "unknown"} (${fallbackUrl}): ${fallbackErr.message}`,
              );
              lastError = fallbackErr; // Salva l'ultimo errore
            }
          }
        } else {
          fallbackLogs.push(`Nessun link di fallback impostato o trovato.`);
        }
      }

      if (lastError) {
        throw lastError; // Se dopo tutti i tentativi (main + fallback) c'è ancora errore
      }

      // Arrotonda i capitoli letti per evitare problemi di precisione float
      const readChapters = Math.round((manga.chapter_read || 0) * 10) / 10;

      this.incrementProgress();
      console.log(
        `[Update] Capitoli disponibili trovati: ${availableChapters} per ${manga.nome}`,
      );

      if (availableChapters > readChapters) {
        this.mangaWithUpdates.add(manga.link);
        console.log(
          `Nuovo capitolo per ${manga.nome}: ${availableChapters} disponibili, ${readChapters} letti`,
        );
        this.appendScanLog(
          manga,
          "success",
          `capitoli trovati: ${availableChapters} (Nuovi!)`,
          fallbackLogs,
        );
      } else {
        this.appendScanLog(
          manga,
          "normal",
          `capitoli trovati: ${availableChapters}`,
          fallbackLogs,
        );
      }
    } catch (error) {
      this.incrementProgress();
      console.error(
        `[Update] Errore nel controllo di ${manga.nome} (${manga.link}):`,
        error,
      );
      this.appendScanLog(
        manga,
        "error",
        `capitoli trovati: errore`,
        fallbackLogs,
      );
    }
  }

  // Controlla se un manga ha aggiornamenti
  hasUpdates(mangaLink) {
    return this.mangaWithUpdates.has(mangaLink);
  }

  // Utility per delay
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Pulisce la cache degli aggiornamenti
  clearUpdatesCache() {
    this.mangaWithUpdates.clear();
  }

  // ===== UI Progress Helpers =====
  initScanUI(total) {
    this.totalToProcess = total || 0;
    this.processedCount = 0;
    const wrap = document.getElementById("scan-ui");
    const bar = document.getElementById("scan-progress-bar");
    const text = document.getElementById("scan-progress-text");
    const logs = document.getElementById("scan-logs");
    if (wrap && bar && text && logs) {
      wrap.style.display = total > 0 ? "block" : "none";
      bar.style.width = "0%";
      text.textContent = `0% (0/${total})`;
      logs.innerHTML = "";
    }
  }

  setProgress(current, total) {
    const bar = document.getElementById("scan-progress-bar");
    const text = document.getElementById("scan-progress-text");
    if (!bar || !text) return;
    const safeTotal = total || this.totalToProcess || 0;
    const safeCurrent = Math.min(current || 0, safeTotal);
    const percent =
      safeTotal > 0 ? Math.round((safeCurrent / safeTotal) * 100) : 0;
    bar.style.width = `${percent}%`;
    text.textContent = `${percent}% (${safeCurrent}/${safeTotal})`;
  }

  incrementProgress() {
    this.processedCount = Math.min(
      this.processedCount + 1,
      this.totalToProcess,
    );
    this.setProgress(this.processedCount, this.totalToProcess);
  }

  // Aggiunge un log alla UI
  appendScanLog(manga, type, message, fallbackLogs = []) {
    const logsContainer = document.getElementById("scan-logs");
    if (!logsContainer) return;

    const logLine = document.createElement("div");
    logLine.className = "scan-log-line";

    const safeLink = typeof manga.link === "string" ? manga.link : "";

    const mainText = document.createElement("div");

    // Creazione del link cliccabile
    const linkEl = document.createElement("a");
    linkEl.href = safeLink;
    linkEl.target = "_blank";
    linkEl.textContent = safeLink;

    // Stile del link basato sul tipo di messaggio
    if (type === "success") {
      linkEl.style.color = "var(--success-color)";
      linkEl.style.fontWeight = "bold";
      mainText.style.color = "var(--success-color)";
      mainText.style.fontWeight = "bold";
    } else if (type === "error") {
      linkEl.style.color = "var(--danger-color)";
      mainText.style.color = "var(--danger-color)";
    } else {
      linkEl.style.color = "#64748b";
      mainText.style.color = "#64748b";
    }

    mainText.appendChild(linkEl);
    mainText.appendChild(document.createTextNode(` — ${message}`));

    logLine.appendChild(mainText);

    if (fallbackLogs && fallbackLogs.length > 0) {
      const fbContainer = document.createElement("div");
      fbContainer.style.marginLeft = "15px";
      fbContainer.style.fontSize = "0.85em";
      fbContainer.style.color =
        type === "error" ? "var(--danger-color)" : "#f59e0b";
      fbContainer.style.opacity = "0.9";

      fallbackLogs.forEach((fbLog) => {
        const fbLine = document.createElement("div");
        fbLine.textContent = `↳ ${fbLog}`;
        fbContainer.appendChild(fbLine);
      });
      logLine.appendChild(fbContainer);
    }

    logsContainer.appendChild(logLine);
    logsContainer.scrollTop = logsContainer.scrollHeight;
  }

  clearScanLogs() {
    const logs = document.getElementById("scan-logs");
    if (logs) logs.innerHTML = "";
  }

  completeProgress() {
    this.setProgress(this.totalToProcess, this.totalToProcess);
    const wrap = document.getElementById("scan-ui");
    if (wrap && this.totalToProcess === 0) {
      wrap.style.display = "none";
    }
  }
}

// Istanza globale del manga updater
const mangaUpdater = new MangaUpdater();

// Funzione globale per controllare gli aggiornamenti (chiamata dal pulsante)
async function checkMangaUpdates() {
  await mangaUpdater.checkAllUpdates();
}

// Funzione per verificare se un manga ha aggiornamenti (usata nella visualizzazione)
function mangaHasUpdates(mangaLink) {
  return mangaUpdater.hasUpdates(mangaLink);
}
