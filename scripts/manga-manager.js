class MangaManager {
    constructor() {
        this.db = null;
        this.s3 = null;
        this.bucketName = 's3db';
        this.fileName = null; // Sarà impostato dinamicamente
        this.isInitialized = false;
        this.isHandlingSchemaConflict = false;
    }

    // Inizializza DuckDB e S3
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Aspetta che DuckDB sia disponibile
            while (!window.duckdb) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Inizializza DuckDB con la nuova API
            const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
            const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
            
            const worker = await duckdb.createWorker(bundle.mainWorker);
            const logger = new duckdb.ConsoleLogger();
            this.db = new duckdb.AsyncDuckDB(logger, worker);
            await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);


            
            // Ottieni client S3
            this.s3 = authManager.getS3Client();
            if (!this.s3) {
                throw new Error('Client S3 non disponibile');
            }
             



            

            // Ottieni il nome del file dalle credenziali
            this.fileName = authManager.getDbFilename();
            console.log(`Utilizzando file database: ${this.fileName}`);

            // Crea la tabella se non esiste
            await this.createTable();
            
            // Carica i dati esistenti
            await this.loadFromS3();
            
            this.isInitialized = true;
            console.log('MangaManager inizializzato con successo');
            
        } catch (error) {
            console.error('Errore nell\'inizializzazione:', error);
            throw error;
        }
    }

    // Crea la tabella manga
    async createTable() {
        const conn = await this.db.connect();
        try {

            await conn.query(`
                CREATE SEQUENCE IF NOT EXISTS manga_id_seq START 1
            `);

            
            await conn.query(`
                CREATE TABLE IF NOT EXISTS manga (
                    id INTEGER PRIMARY KEY DEFAULT nextval('manga_id_seq'),
                    nome VARCHAR NOT NULL,
                    link VARCHAR NOT NULL UNIQUE,
                    started BOOLEAN DEFAULT FALSE,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            
            // Crea una sequenza per l'auto-incremento se non esiste
            
        } finally {
            await conn.close();
        }
    }

    // Versione corretta del caricamento
    async loadFromS3() {
        try {
            const params = {
                Bucket: this.bucketName,
                Key: this.fileName
            };
            
            const data = await this.s3.getObject(params).promise();
            const parquetData = new Uint8Array(data.Body);
            
            await this.db.registerFileBuffer(this.fileName, parquetData);
            
            const conn = await this.db.connect();
            try {
                // Prima verifica la struttura del file Parquet
                const schemaResult = await conn.query(`
                    DESCRIBE SELECT * FROM read_parquet('${this.fileName}') LIMIT 1
                `);
                
                console.log('Schema del file Parquet:', schemaResult.toArray());
                
                // Verifica se ci sono dati validi nel file
                const checkResult = await conn.query(`
                    SELECT COUNT(*) as count 
                    FROM read_parquet('${this.fileName}') 
                    WHERE nome IS NOT NULL AND nome != '' 
                    AND link IS NOT NULL AND link != ''
                `);
                
                const validRowCount = checkResult.toArray()[0].count;
                
                if (validRowCount > 0) {
                    // Inserisci i dati gestendo correttamente i NULL
                    await conn.query(`
                        INSERT INTO manga (nome, link, started, last_updated)
                        SELECT 
                            TRIM(nome) as nome,
                            TRIM(link) as link,
                            COALESCE(started, false) as started,
                            COALESCE(last_updated, CURRENT_TIMESTAMP) as last_updated
                        FROM read_parquet('${this.fileName}')
                        WHERE nome IS NOT NULL AND nome != '' AND TRIM(nome) != ''
                        AND link IS NOT NULL AND link != '' AND TRIM(link) != ''
                        ON CONFLICT (link) DO NOTHING
                    `);
                    
                    console.log(`Caricati ${validRowCount} manga validi da S3`);
                } else {
                    console.log('Nessun dato valido trovato nel file Parquet');
                }
            } finally {
                await conn.close();
            }
            
        } catch (error) {
            if (error.code === 'NoSuchKey') {
                console.log('File Parquet non trovato su S3, inizializzo con tabella vuota');
            } else {
                console.error('Errore nel caricamento da S3:', error);
                // Previeni il loop infinito
                if (!this.isHandlingSchemaConflict && 
                    (error.message.includes('schema') || 
                     error.message.includes('column') || 
                     error.message.includes('Binder Error') || 
                     error.message.includes('NOT NULL constraint'))) {
                    console.log('Ricreando la tabella per risolvere conflitti di schema...');
                    await this.handleSchemaConflict();
                }
            }
        }
    }

    // Metodo corretto per gestire conflitti di schema
    async handleSchemaConflict() {
        if (this.isHandlingSchemaConflict) {
            console.log('Gestione conflitto schema già in corso, saltando...');
            return;
        }
        
        this.isHandlingSchemaConflict = true;
        
        try {
            const conn = await this.db.connect();
            try {
                // Elimina la tabella esistente
                await conn.query('DROP TABLE IF EXISTS manga');
                await conn.query('DROP SEQUENCE IF EXISTS manga_id_seq');
                
                // Ricrea la tabella con la struttura corretta
                await this.createTable();
                
                console.log('Tabella ricreata con successo');
                
                // Prova a caricare solo i dati validi dal Parquet
                try {
                    const params = {
                        Bucket: this.bucketName,
                        Key: this.fileName
                    };
                    
                    const data = await this.s3.getObject(params).promise();
                    const parquetData = new Uint8Array(data.Body);
                    
                    await this.db.registerFileBuffer(this.fileName, parquetData);
                    
                    // Inserisci solo i dati validi, ignorando l'ID dal file
                    // Nel metodo handleSchemaConflict(), sostituisci la query di inserimento con questa:
                    await conn.query(`
                        INSERT INTO manga (nome, link, started, last_updated)
                        SELECT 
                            TRIM(nome) as nome,
                            TRIM(link) as link,
                            COALESCE(started, false) as started,
                            COALESCE(last_updated, CURRENT_TIMESTAMP) as last_updated
                        FROM read_parquet('${this.fileName}')
                        WHERE nome IS NOT NULL AND nome != '' AND TRIM(nome) != ''
                        AND link IS NOT NULL AND link != '' AND TRIM(link) != ''
                    `);
                    
                    console.log('Dati ricaricati con successo dopo la ricreazione della tabella');
                } catch (loadError) {
                    console.log('Impossibile ricaricare i dati dal Parquet, continuando con tabella vuota:', loadError.message);
                }
                
            } finally {
                await conn.close();
            }
        } catch (error) {
            console.error('Errore nella ricreazione della tabella:', error);
        } finally {
            this.isHandlingSchemaConflict = false;
        }
    }

    // Salva i dati su S3 (versione semplificata)
    async saveToS3() {
        try {
            const conn = await this.db.connect();
            
            try {
                // Esporta i dati in formato Parquet
                await conn.query(`
                    COPY (SELECT * FROM manga ORDER BY id) 
                    TO '${this.fileName}' (FORMAT PARQUET)
                `);
            } finally {
                await conn.close();
            }
            
            // Leggi il file generato direttamente
            const parquetBuffer = await this.db.copyFileToBuffer(this.fileName);
            
            if (parquetBuffer) {
                // Carica su S3
                const params = {
                    Bucket: this.bucketName,
                    Key: this.fileName,
                    Body: parquetBuffer,
                    ContentType: 'application/octet-stream'
                };
                
                await this.s3.upload(params).promise();
                console.log('Dati salvati su S3 con successo');
            } else {
                throw new Error('Impossibile leggere il file Parquet generato');
            }
        } catch (error) {
            console.error('Errore nel salvataggio su S3:', error);
            throw error;
        }
    }

    async addManga(nome, link, started = false) {
        const conn = await this.db.connect();
        try {
            // Escape delle virgolette singole per sicurezza SQL
            const escapedNome = nome.replace(/'/g, "''");
            const escapedLink = link.replace(/'/g, "''");
            
            await conn.query(`
                INSERT INTO manga (nome, link, started)
                VALUES ('${escapedNome}', '${escapedLink}', ${started})
            `);
            
            // Salva automaticamente su S3 dopo l'aggiunta
            await this.saveToS3();
            
            return true;
        } catch (error) {
            console.error('Errore nell\'aggiunta del manga:', error);
            return false;
        } finally {
            await conn.close();
        }
    }

    async deleteManga(link) {
        const conn = await this.db.connect();
        try {
            const escapedLink = link.replace(/'/g, "''");
            await conn.query(`DELETE FROM manga WHERE link = '${escapedLink}'`);
            
            // Salva automaticamente su S3 dopo l'eliminazione
            await this.saveToS3();
            
        } finally {
            await conn.close();
        }
    }

    async updateMangaStarted(link) {
        const conn = await this.db.connect();
        try {
            // Escape delle virgolette singole per sicurezza SQL
            const escapedLink = link.replace(/'/g, "''");
            
            // Prima ottieni lo stato attuale
            const currentResult = await conn.query(`
                SELECT started FROM manga WHERE link = '${escapedLink}'
            `);
            
            if (currentResult.toArray().length === 0) {
                throw new Error('Manga non trovato');
            }
            
            const currentStarted = currentResult.toArray()[0].started;
            const newStarted = !currentStarted; // Toggle dello stato
            
            await conn.query(`
                UPDATE manga SET started = ${newStarted}, last_updated = CURRENT_TIMESTAMP 
                WHERE link = '${escapedLink}'
            `);
            
            // Salva automaticamente su S3
            await this.saveToS3();
            
            return true;
        } catch (error) {
            console.error('Errore nell\'aggiornamento dello stato:', error);
            throw error;
        } finally {
            await conn.close();
        }
    }

    async updateManga(id, nome, link, started, lastUpdated = null) {
        const conn = await this.db.connect();
        try {
            const updateTime = lastUpdated || new Date().toISOString();
            // Escape delle virgolette singole per sicurezza SQL
            const escapedNome = nome.replace(/'/g, "''");
            
            // Aggiorna solo nome e timestamp, non il link
            await conn.query(`
                UPDATE manga 
                SET nome = '${escapedNome}', 
                    started = ${started}, 
                    last_updated = '${updateTime}'
                WHERE id = ${id}
            `);
            
            // Salva automaticamente su S3 dopo l'aggiornamento
            await this.saveToS3();
            
            return true;
        } catch (error) {
            console.error('Errore nell\'aggiornamento del manga:', error);
            throw error;
        } finally {
            await conn.close();
        }
    }

    async getAllManga() {
        const conn = await this.db.connect();
        try {
            const result = await conn.query('SELECT * FROM manga ORDER BY last_updated DESC');
            return result.toArray();
        } catch (error) {
            console.error('Errore nel recupero dei manga:', error);
            return [];
        } finally {
            await conn.close();
        }
    }

    async searchManga(searchTerm) {
        const conn = await this.db.connect();
        try {
            const result = await conn.query(`
                SELECT * FROM manga 
                WHERE nome ILIKE ? OR link ILIKE ?
                ORDER BY last_updated DESC
            `, [`%${searchTerm}%`, `%${searchTerm}%`]);
            return result.toArray();
        } catch (error) {
            console.error('Errore nella ricerca:', error);
            return [];
        } finally {
            await conn.close();
        }
    }

    async getStats() {
        const conn = await this.db.connect();
        try {
            const result = await conn.query(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN started = true THEN 1 END) as started,
                    COUNT(CASE WHEN started = false THEN 1 END) as not_started
                FROM manga
            `);
            return result.toArray()[0];
        } catch (error) {
            console.error('Errore nel calcolo delle statistiche:', error);
            return { total: 0, started: 0, not_started: 0 };
        } finally {
            await conn.close();
        }
    }

    async recompactIds() {
        const conn = await this.db.connect();
        try {
            // Crea una tabella temporanea con ID ricompattati
            await conn.query(`
                CREATE TEMPORARY TABLE manga_temp AS 
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY id) as new_id,
                    nome, link, started, last_updated,
                FROM manga
                ORDER BY id
            `);
            
            // Svuota la tabella originale
            await conn.query('DELETE FROM manga');
            
            // Reinserisci i dati con ID ricompattati
            await conn.query(`
                INSERT INTO manga (id, nome, link, started, last_updated)
                SELECT new_id, nome, link, started, last_updated
                FROM manga_temp
            `);
            
            // Aggiorna la sequenza
            const maxIdResult = await conn.query('SELECT MAX(id) as max_id FROM manga');
            const maxId = maxIdResult.toArray()[0].max_id || 0;
            await conn.query(`ALTER SEQUENCE manga_id_seq RESTART WITH ${maxId + 1}`);
            
            console.log('ID ricompattati con successo');
        } catch (error) {
            console.error('Errore nella ricompattazione degli ID:', error);
        } finally {
            await conn.close();
        }
    }

     // Nuova funzione per il backup
     async createBackup(customBucketName = null) {
         try {
             const targetBucket = customBucketName || this.bucketName;
             const backupFileName = `backup_${this.fileName}`;
             
             const conn = await this.db.connect();
             
             try {
                 // Esporta i dati in formato Parquet per il backup
                 await conn.query(`
                     COPY (SELECT * FROM manga ORDER BY id) 
                     TO '${backupFileName}' (FORMAT PARQUET)
                 `);
             } finally {
                 await conn.close();
             }
             
             // Leggi il file di backup generato
             const parquetBuffer = await this.db.copyFileToBuffer(backupFileName);
             
             if (parquetBuffer) {
                 // Carica il backup su S3
                 const params = {
                     Bucket: targetBucket,
                     Key: backupFileName,
                     Body: parquetBuffer,
                     ContentType: 'application/octet-stream'
                 };
                 
                 await this.s3.upload(params).promise();
                 console.log(`Backup salvato su S3 con successo: ${backupFileName}`);
                 return backupFileName;
             } else {
                 throw new Error('Impossibile leggere il file di backup generato');
             }
         } catch (error) {
             console.error('Errore nella creazione del backup:', error);
             throw error;
         }
     }



}

const mangaManager = new MangaManager();