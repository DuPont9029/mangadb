// Funzione per controllare gli aggiornamenti dei manga su MangaBuddy
class MangaUpdater {
    constructor() {
        this.updatesInProgress = false;
        this.mangaWithUpdates = new Set();
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
            const mangaBuddyManga = allManga.filter(manga => 
                manga.link && manga.link.includes('mangabuddy.com')
            );

            if (mangaBuddyManga.length === 0) {
                showMessage('Nessun manga di MangaBuddy trovato', 'info');
                return;
            }

            showMessage(`Controllo ${mangaBuddyManga.length} manga...`, 'info');
            
            // Reset dei manga con aggiornamenti
            this.mangaWithUpdates.clear();
            
            // Controlla ogni manga (con limite per evitare sovraccarico)
            const batchSize = 5; // Controlla 5 manga alla volta
            for (let i = 0; i < mangaBuddyManga.length; i += batchSize) {
                const batch = mangaBuddyManga.slice(i, i + batchSize);
                const promises = batch.map(manga => this.checkSingleMangaUpdate(manga));
                await Promise.allSettled(promises);
                
                // Piccola pausa tra i batch per non sovraccaricare il server
                if (i + batchSize < mangaBuddyManga.length) {
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

        } catch (error) {
            console.error('Errore nel controllo aggiornamenti:', error);
            showError('Errore nel controllo aggiornamenti: ' + error.message);
        } finally {
            this.updatesInProgress = false;
        }
    }

    // Controlla un singolo manga
    async checkSingleMangaUpdate(manga) {
        try {
            const availableChapters = await this.getAvailableChapters(manga.link);
            // Arrotonda i capitoli letti per evitare problemi di precisione float
            const readChapters = Math.round((manga.chapter_read || 0) * 10) / 10;
            
            if (availableChapters > readChapters) {
                this.mangaWithUpdates.add(manga.link);
                console.log(`Nuovo capitolo per ${manga.nome}: ${availableChapters} disponibili, ${readChapters} letti`);
            }
            
        } catch (error) {
            console.warn(`Errore nel controllo di ${manga.nome}:`, error.message);
        }
    }

    // Estrae il numero di capitoli disponibili dalla pagina MangaBuddy
    async getAvailableChapters(mangaUrl) {
        try {
            // Fetch diretto senza proxy
            const response = await fetch(mangaUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const htmlContent = await response.text();
            
            // Crea un parser DOM temporaneo
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            
            // Cerca il tag con classe "latest-chapters"
            const latestChaptersElement = doc.querySelector('.latest-chapters');
            if (!latestChaptersElement) {
                throw new Error('Elemento latest-chapters non trovato');
            }
            
            // Cerca il testo "Chapter" seguito da un numero
            const chapterText = latestChaptersElement.textContent;
            const chapterMatch = chapterText.match(/Chapter\s+(\d+(?:\.\d+)?)/i);
            
            if (!chapterMatch) {
                throw new Error('Numero capitolo non trovato nel testo: ' + chapterText);
            }
            
            return parseFloat(chapterMatch[1]);
            
        } catch (error) {
            // Fallback: prova a usare un approccio alternativo
            return await this.getAvailableChaptersAlternative(mangaUrl);
        }
    }

    // Metodo alternativo per ottenere i capitoli
    async getAvailableChaptersAlternative(mangaUrl) {
        try {
            // Fetch diretto senza proxy alternativo
            const response = await fetch(mangaUrl);
            
            if (!response.ok) {
                throw new Error(`Impossibile accedere a ${mangaUrl}`);
            }
            
            const htmlContent = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            
            // Cerca in diversi possibili selettori
            const selectors = [
                '.latest-chapters',
                '.chapter-list .chapter-item:first-child',
                '.manga-chapters .chapter:first-child',
                '[class*="chapter"]:first-child'
            ];
            
            for (const selector of selectors) {
                const element = doc.querySelector(selector);
                if (element) {
                    const chapterMatch = element.textContent.match(/Chapter\s+(\d+(?:\.\d+)?)/i);
                    if (chapterMatch) {
                        return parseFloat(chapterMatch[1]);
                    }
                }
            }
            
            throw new Error('Numero capitolo non trovato con nessun metodo');
            
        } catch (error) {
            console.warn(`Fallback fallito per ${mangaUrl}:`, error.message);
            throw error;
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