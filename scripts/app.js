// Variabili globali per filtri
let currentStatusFilter = 'all';
let currentSortFilter = 'none';
let currentSearchTerm = '';
let allManga = [];

// Inizializzazione dell'app
document.addEventListener('DOMContentLoaded', async () => {
    try {
        showMessage('Inizializzazione in corso...', 'info');
        await mangaManager.initialize();
        await loadManga();
        hideMessage();
    } catch (error) {
        showError('Errore nell\'inizializzazione: ' + error.message);
    }
});

// Carica tutti i manga
async function loadManga() {
    try {
        allManga = await mangaManager.getAllManga();
        await updateStats();
        filterAndDisplayManga();
    } catch (error) {
        showError('Errore nel caricamento dei manga: ' + error.message);
    }
}

// Filtra e mostra i manga
function filterAndDisplayManga() {
    let filteredManga = [...allManga];
    
    // Applica filtro di ricerca
    if (currentSearchTerm) {
        filteredManga = filteredManga.filter(manga => 
            manga.nome.toLowerCase().includes(currentSearchTerm.toLowerCase())
        );
    }
    
    // Applica filtro di stato
    if (currentStatusFilter === 'read') {
        filteredManga = filteredManga.filter(manga => manga.started);
    } else if (currentStatusFilter === 'unread') {
        filteredManga = filteredManga.filter(manga => !manga.started);
    }
    
    // Applica ordinamento
    if (currentSortFilter === 'newest') {
        filteredManga.sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated));
    } else if (currentSortFilter === 'oldest') {
        filteredManga.sort((a, b) => new Date(a.last_updated) - new Date(b.last_updated));
    }
    
    displayManga(filteredManga);
    updateFilterCounts();
}

// Mostra i manga nella griglia
function displayManga(manga) {
    const grid = document.getElementById('manga-grid');
    
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
    
    grid.innerHTML = manga.map(m => {
        const safeLink = m.link.replace(/'/g, "\\'");
        const safeName = escapeHtml(m.nome);
        const chaptersRead = Math.round((m.chapter_read || 0) * 10) / 10;
        
        // Controlla se il manga ha aggiornamenti
        const hasUpdates = typeof mangaHasUpdates !== 'undefined' && mangaHasUpdates(m.link);
        let statusClass = '';
        if (hasUpdates) {
            statusClass = 'has-updates';
        } else if (!m.started) {
            statusClass = 'unread';
        }
        
        return `
        <div class="manga-card">
            <div class="manga-status ${statusClass}"></div>
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
                <button class="btn-modern btn-success-modern" onclick="toggleMangaStatus('${safeLink}')">
                    <i class="fas fa-${m.started ? 'undo' : 'check'}"></i>
                    ${m.started ? 'Non Letto' : 'Letto'}
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
    }).join('');
}

// Aggiorna le statistiche
async function updateStats() {
    try {
        const stats = await mangaManager.getStats();
        document.getElementById('stat-total').textContent = stats.total;
        document.getElementById('stat-read').textContent = stats.started;  // Cambiato da stats.read a stats.started
        document.getElementById('stat-unread').textContent = stats.not_started;  // Cambiato da stats.unread a stats.not_started
        document.getElementById('total-count').textContent = stats.total;
    } catch (error) {
        console.error('Errore nell\'aggiornamento delle statistiche:', error);
    }
}

// Aggiorna i conteggi nei filtri
function updateFilterCounts() {
    const readCount = allManga.filter(m => m.started).length;
    const unreadCount = allManga.filter(m => !m.started).length;
    
    document.querySelector('[data-filter="read"]').innerHTML = `
        <i class="fas fa-check"></i> Letti (${readCount})
    `;
    document.querySelector('[data-filter="unread"]').innerHTML = `
        <i class="fas fa-clock"></i> Non Letti (${unreadCount})
    `;
}

// Imposta filtro di stato
function setStatusFilter(filter) {
    currentStatusFilter = filter;
    
    // Aggiorna UI
    document.querySelectorAll('[data-filter]').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    
    filterAndDisplayManga();
}

// Imposta filtro di ordinamento
function setSortFilter(sort) {
    currentSortFilter = sort;
    
    // Aggiorna UI
    document.querySelectorAll('[data-sort]').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelector(`[data-sort="${sort}"]`).classList.add('active');
    
    filterAndDisplayManga();
}

// Cerca manga
function searchManga() {
    currentSearchTerm = document.getElementById('search-input').value.trim();
    filterAndDisplayManga();
}

// Event listener per ricerca in tempo reale
document.getElementById('search-input').addEventListener('input', (e) => {
    currentSearchTerm = e.target.value.trim();
    filterAndDisplayManga();
});

// Modifica manga
function editManga(id) {
    const manga = allManga.find(m => m.id === id);
    if (!manga) return;
    
    document.getElementById('modalTitle').textContent = 'Modifica Manga';
    document.getElementById('manga-id').value = manga.id;
    document.getElementById('manga-name').value = manga.nome;
    document.getElementById('manga-link').value = manga.link;
    document.getElementById('manga-started').checked = manga.started;
    document.getElementById('manga-chapters').value = Math.round((manga.chapter_read || 0) * 10) / 10;
    
    new bootstrap.Modal(document.getElementById('mangaModal')).show();
}

// Salva manga (aggiungi o modifica)
async function saveManga() {
    const id = document.getElementById('manga-id').value;
    const nome = document.getElementById('manga-name').value.trim();
    const link = document.getElementById('manga-link').value.trim();
    const started = document.getElementById('manga-started').checked;
    const chapterRead = parseFloat(document.getElementById('manga-chapters').value) || 0.0;
    
    if (!nome || !link) {
        showError('Nome e link sono obbligatori');
        return;
    }
    
    try {
        if (id) {
            // Modifica
            await mangaManager.updateManga(parseInt(id), nome, link, started, chapterRead);
            showMessage('Manga aggiornato con successo!');
        } else {
            // Aggiungi
            await mangaManager.addManga(nome, link, started, chapterRead);
            showMessage('Manga aggiunto con successo!');
        }
        
        // Chiudi modal e ricarica
        bootstrap.Modal.getInstance(document.getElementById('mangaModal')).hide();
        await loadManga();
        
    } catch (error) {
        showError('Errore nel salvataggio: ' + error.message);
    }
}

// Mostra modal per aggiungere manga
function showAddModal() {
    document.getElementById('modalTitle').textContent = 'Aggiungi Manga';
    document.getElementById('manga-form').reset();
    document.getElementById('manga-id').value = '';
    document.getElementById('manga-chapters').value = '0.0'; // Default a 0.0
    new bootstrap.Modal(document.getElementById('mangaModal')).show();
}

// Cambia stato di lettura
async function toggleMangaStatus(link) {
    try {
        await mangaManager.updateMangaStarted(link);
        await loadManga();
        showMessage('Stato aggiornato con successo!');
    } catch (error) {
        showError('Errore nell\'aggiornamento: ' + error.message);
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
        showMessage('Manga eliminato con successo!');
    } catch (error) {
        showError('Errore nell\'eliminazione: ' + error.message);
    }
}

// Salva su S3
async function saveToS3() {
    try {
        showMessage('Salvataggio su S3 in corso...', 'info');
        await mangaManager.saveToS3();
        showMessage('Dati salvati su S3 con successo!');
    } catch (error) {
        showError('Errore nel salvataggio su S3: ' + error.message);
    }
}

// Ricompatta ID
async function recompactIds() {
    if (!confirm('Sei sicuro di voler ricompattare gli ID? Questa operazione non può essere annullata.')) {
        return;
    }
    
    try {
        const total = await mangaManager.recompactIds();
        await loadManga();
        showMessage(`ID ricompattati con successo! Totale record: ${total}`);
    } catch (error) {
        showError('Errore nella ricompattazione: ' + error.message);
    }
}


async function createBackup() {
    try {
        // Chiedi all'utente il bucket di destinazione (opzionale)
        const customBucket = prompt('Inserisci il nome del bucket per il backup (lascia vuoto per usare quello corrente):');
        
        // Se l'utente preme Cancel, interrompi l'operazione
        if (customBucket === null) {
            showMessage('Backup annullato dall\'utente', 'info');
            return;
        }
        
        showMessage('Creazione backup in corso...', 'info');
        
        const backupFileName = await mangaManager.createBackup(customBucket || null);
        showMessage(`Backup creato con successo: ${backupFileName}`, 'success');
    } catch (error) {
        console.error('Errore nella creazione del backup:', error);
        showError('Errore nella creazione del backup: ' + error.message);
    }
}

// Utility functions
function showMessage(message, type = 'success') {
    const alert = document.getElementById('message-alert');
    const text = document.getElementById('message-text');
    
    text.textContent = message;
    alert.className = `alert-modern alert-${type === 'info' ? 'primary' : 'success'}-modern`;
    alert.style.display = 'block';
    
    if (type !== 'info') {
        setTimeout(() => {
            alert.style.display = 'none';
        }, 3000);
    }
}

function showError(message) {
    const alert = document.getElementById('error-alert');
    const text = document.getElementById('error-text');
    
    text.textContent = message;
    alert.style.display = 'block';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

function hideMessage() {
    document.getElementById('message-alert').style.display = 'none';
    document.getElementById('error-alert').style.display = 'none';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Aggiungi pulsanti per operazioni avanzate
document.addEventListener('DOMContentLoaded', () => {
    // Aggiungi pulsante salva S3 nell'header
    const header = document.querySelector('.header');
    if (header) {
        const saveBtn = document.createElement('button');
        saveBtn.className = 'logout-btn';
        saveBtn.style.right = '120px';
        saveBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Salva S3';
        saveBtn.onclick = saveToS3;
        header.appendChild(saveBtn);
        
        const compactBtn = document.createElement('button');
        compactBtn.className = 'logout-btn';
        compactBtn.style.right = '240px';
        compactBtn.innerHTML = '<i class="fas fa-compress-alt"></i> Ricompatta';
        compactBtn.onclick = recompactIds;
        header.appendChild(compactBtn);
        
        // Pulsante di backup posizionato a sinistra del titolo
        const backupBtn = document.createElement('button');
        backupBtn.className = 'logout-btn';
        backupBtn.style.left = '1rem';  // Posiziona a sinistra
        backupBtn.style.right = 'auto'; // Rimuovi il posizionamento a destra
        backupBtn.innerHTML = '<i class="fas fa-archive"></i> Backup';
        backupBtn.onclick = createBackup;
        header.appendChild(backupBtn);
    }
});