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
            showMessage('Controllo aggiornamenti già in corso...', 'info');
            return;
        }

        try {
            this.updatesInProgress = true;
            showMessage('Controllo aggiornamenti in corso...', 'info');
            
            // Ottieni tutti i manga dal database
            const allManga = await mangaManager.getAllManga();
            const targetManga = allManga.filter(manga => {
                if (!manga.link) return false;
                try {
                    return !!(window.UpdateRouter && window.UpdateRouter.getProviderForUrl(manga.link));
                } catch (e) {
                    return false;
                }
            });

            if (targetManga.length === 0) {
                showMessage('Nessun manga aggiornabile trovato per i provider registrati', 'info');
                return;
            }

            showMessage(`Controllo ${targetManga.length} manga...`, 'info');
            
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
                const promises = batch.map(manga => this.checkSingleMangaUpdate(manga));
                await Promise.allSettled(promises);
                
                // Piccola pausa tra i batch per non sovraccaricare il server
                if (i + batchSize < targetManga.length) {
                    await this.delay(1000);
                }
            }

            // Mostra risultati
            const updatesCount = this.mangaWithUpdates.size;
            if (updatesCount > 0) {
                showMessage(`Trovati ${updatesCount} manga con nuovi capitoli!`, 'success');
                // Ricarica la visualizzazione per mostrare i pallini
                filterAndDisplayManga();
            } else {
                showMessage('Nessun nuovo capitolo trovato', 'info');
            }
            
            // Completa progress a fine scansione
            this.completeProgress();

        } catch (error) {
            console.error('Errore nel controllo aggiornamenti:', error);
            showError('Errore nel controllo aggiornamenti: ' + error.message);
        } finally {
            this.updatesInProgress = false;
        }
    }

    // Controlla un singolo manga
    async checkSingleMangaUpdate(manga) {
        let provider = null;
        try {
            let availableChapters;
            const router = window.UpdateRouter;
            provider = router ? router.getProviderForUrl(manga.link) : null;
            console.log(`[Update] Controllo: ${manga.nome} (${manga.link}) via ${provider ? provider.name : 'nessun provider'}`);
            if (provider) {
                availableChapters = await provider.getAvailableChapters(manga.link);
            } else {
                console.warn(`Nessun provider registrato per ${manga.nome} (${manga.link}). Skipping.`);
                return; // Non usare alcun fallback
            }

            // Arrotonda i capitoli letti per evitare problemi di precisione float
            const readChapters = Math.round((manga.chapter_read || 0) * 10) / 10;
            
            // Logga sempre il link scansionato e i capitoli trovati
            this.appendScanLog(manga.link, availableChapters);
            this.incrementProgress();
            console.log(`[Update] Capitoli disponibili trovati: ${availableChapters} per ${manga.nome}`);
            
            if (availableChapters > readChapters) {
                this.mangaWithUpdates.add(manga.link);
                console.log(`Nuovo capitolo per ${manga.nome}: ${availableChapters} disponibili, ${readChapters} letti`);
            }
            
        } catch (error) {
            // Logga l'errore per il singolo manga e avanza il progress
            this.appendScanLog(manga.link, 'errore');
            this.incrementProgress();
            console.error(`[Update] Errore nel controllo di ${manga.nome} (${manga.link}) via ${provider ? provider.name : 'nessun provider'}:`, error);
        }
    }



    // Controlla se un manga ha aggiornamenti
    hasUpdates(mangaLink) {
        return this.mangaWithUpdates.has(mangaLink);
    }

    // Utility per delay
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Pulisce la cache degli aggiornamenti
    clearUpdatesCache() {
        this.mangaWithUpdates.clear();
    }

    // ===== UI Progress Helpers =====
    initScanUI(total) {
        this.totalToProcess = total || 0;
        this.processedCount = 0;
        const wrap = document.getElementById('scan-ui');
        const bar = document.getElementById('scan-progress-bar');
        const text = document.getElementById('scan-progress-text');
        const logs = document.getElementById('scan-logs');
        if (wrap && bar && text && logs) {
            wrap.style.display = total > 0 ? 'block' : 'none';
            bar.style.width = '0%';
            text.textContent = `0% (0/${total})`;
            logs.innerHTML = '';
        }
    }

    setProgress(current, total) {
        const bar = document.getElementById('scan-progress-bar');
        const text = document.getElementById('scan-progress-text');
        if (!bar || !text) return;
        const safeTotal = total || this.totalToProcess || 0;
        const safeCurrent = Math.min(current || 0, safeTotal);
        const percent = safeTotal > 0 ? Math.round((safeCurrent / safeTotal) * 100) : 0;
        bar.style.width = `${percent}%`;
        text.textContent = `${percent}% (${safeCurrent}/${safeTotal})`;
    }

    incrementProgress() {
        this.processedCount = Math.min(this.processedCount + 1, this.totalToProcess);
        this.setProgress(this.processedCount, this.totalToProcess);
    }

    appendScanLog(link, chapters) {
        const logs = document.getElementById('scan-logs');
        if (!logs) return;
        const safeLink = typeof link === 'string' ? link : '';
        let chaptersText;
        if (chapters === 'errore') {
            chaptersText = 'errore';
        } else if (typeof chapters === 'number') {
            chaptersText = `capitoli trovati: ${chapters}`;
        } else {
            chaptersText = `${chapters}`;
        }
        const item = document.createElement('div');
        item.className = 'scan-log-item';
        item.innerHTML = `<a href="${safeLink}" target="_blank">${safeLink}</a> — ${chaptersText}`;
        logs.appendChild(item);
    }

    clearScanLogs() {
        const logs = document.getElementById('scan-logs');
        if (logs) logs.innerHTML = '';
    }

    completeProgress() {
        this.setProgress(this.totalToProcess, this.totalToProcess);
        const wrap = document.getElementById('scan-ui');
        if (wrap && this.totalToProcess === 0) {
            wrap.style.display = 'none';
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