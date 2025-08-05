

class AuthManager {
    constructor() {
        this.s3 = null;
        this.credentials = null;
    }

    // Verifica se l'utente è autenticato
    isAuthenticated() {
        const creds = localStorage.getItem('aws_credentials');
        return creds !== null;
    }

    // Salva le credenziali nel localStorage
    saveCredentials(accessKey, secretKey, region, endpoint, dbFilename) {
        const credentials = {
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
            region: region,
            endpoint: endpoint,
            dbFilename: dbFilename || 'mangadb.parquet'
        };
        
        localStorage.setItem('aws_credentials', JSON.stringify(credentials));
        this.credentials = credentials;
        this.initializeS3();
    }

    // Carica le credenziali dal localStorage
    loadCredentials() {
        const creds = localStorage.getItem('aws_credentials');
        if (creds) {
            this.credentials = JSON.parse(creds);
            this.initializeS3();
            return true;
        }
        return false;
    }

    // Inizializza il client S3
    initializeS3() {
        if (!this.credentials) return;

        AWS.config.update({
            accessKeyId: this.credentials.accessKeyId,
            secretAccessKey: this.credentials.secretAccessKey,
            region: this.credentials.region
        });

        this.s3 = new AWS.S3({
            endpoint: this.credentials.endpoint,
            s3ForcePathStyle: true
        });
    }

    // Testa la connessione S3
    async testConnection() {
        if (!this.s3) {
            throw new Error('S3 client non inizializzato');
        }

        try {
            await this.s3.listBuckets().promise();
            return true;
        } catch (error) {
            throw new Error('Credenziali S3 non valide: ' + error.message);
        }
    }

    // Logout
    logout() {
        localStorage.removeItem('aws_credentials');
        this.credentials = null;
        this.s3 = null;
        window.location.href = 'index.html';
    }

    // Ottieni il client S3
    getS3Client() {
        return this.s3;
    }

    // Ottieni le credenziali
    getCredentials() {
        return this.credentials;
    }

    getDbFilename() {
        return this.credentials ? this.credentials.dbFilename : 'mangadb.parquet';
    }
}

// Istanza globale
const authManager = new AuthManager();

// Funzioni per il login
// Gestisce tutti i percorsi di login possibili
if (window.location.pathname.includes('index.html') || 
    window.location.pathname === '/' || 
    window.location.pathname === '/mangadb/') {
    
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const accessKey = document.getElementById('access_key').value;
        const secretKey = document.getElementById('secret_key').value;
        const region = document.getElementById('region').value;
        const endpoint = document.getElementById('endpoint').value;
        const dbFilename = document.getElementById('db_filename').value.trim() || 'mangadb.parquet';
        
        const errorAlert = document.getElementById('error-alert');
        const errorMessage = document.getElementById('error-message');
        const submitBtn = document.querySelector('.btn-login');
        const normalText = submitBtn.querySelector('.normal-text');
        const loadingText = submitBtn.querySelector('.loading');
        
        try {
            // Mostra loading
            normalText.style.display = 'none';
            loadingText.style.display = 'inline';
            submitBtn.disabled = true;
            errorAlert.style.display = 'none';
            
            // Salva credenziali e testa connessione
            authManager.saveCredentials(accessKey, secretKey, region, endpoint, dbFilename);
            await authManager.testConnection();
            
            // Redirect alla pagina principale
            window.location.href = 'mangadb.html';
            
        } catch (error) {
            errorMessage.textContent = error.message;
            errorAlert.style.display = 'block';
        } finally {
            // Nascondi loading
            normalText.style.display = 'inline';
            loadingText.style.display = 'none';
            submitBtn.disabled = false;
        }
    });
}

// Funzioni per la pagina principale
if (window.location.pathname.includes('mangadb.html')) {
    // Verifica autenticazione al caricamento
    if (!authManager.loadCredentials()) {
        window.location.href = 'index.html';
    }
}

// Funzione di logout globale
function logout() {
    authManager.logout();
}
