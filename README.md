


          
# 🚀 MangaDB - Gestione Manga Spaziale ✨

<div align="center">

![MangaDB Logo](https://img.shields.io/badge/📚-MangaDB-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQgNkgyMFYxOEg0VjZaIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+)

**🌟 La tua collezione manga sempre organizzata nel cloud! 🌟**

[![DuckDB](https://img.shields.io/badge/DuckDB-WASM-orange?style=flat-square&logo=duckdb)](https://duckdb.org/)
[![AWS S3](https://img.shields.io/badge/AWS-S3-yellow?style=flat-square&logo=amazon-aws)](https://aws.amazon.com/s3/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple?style=flat-square&logo=bootstrap)](https://getbootstrap.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-green?style=flat-square&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

</div>

---

## 🎯 Cos'è MangaDB?

**MangaDB** è un'applicazione web moderna e potente per gestire la tua collezione di manga direttamente nel browser! Utilizza tecnologie all'avanguardia come **DuckDB WASM** per il database locale e **AWS S3** per il backup cloud.

### ✨ Caratteristiche Spaziali

🔥 **Database In-Memory Ultra Veloce**
- Powered by DuckDB WASM
- Query SQL lightning-fast
- Zero configurazione server

☁️ **Backup Cloud Automatico**
- Sincronizzazione con AWS S3
- Backup incrementali
- Accesso da qualsiasi dispositivo

🎨 **UI Moderna e Responsive**
- Design glassmorphism
- Animazioni fluide
- Mobile-first approach

🔒 **Sicurezza Enterprise**
- Autenticazione AWS IAM
- Policy granulari per bucket
- Crittografia end-to-end

---

## 🚀 Quick Start

### 📋 Prerequisiti

- Browser moderno (Chrome, Firefox, Safari, Edge)
- Credenziali AWS S3 (Access Key + Secret Key)
- Bucket S3 configurato

### ⚡ Installazione Istantanea

1. **Clone del repository**
   ```bash
   git clone https://github.com/tuousername/mangadb.git
   cd mangadb
   ```

2. **Avvia il server locale**
   ```bash
   # Con Python
   python -m http.server 8000
   
   # Con Node.js
   npx serve .
   
   # Con PHP
   php -S localhost:8000
   ```

3. **Apri nel browser**
   ```
   http://localhost:8000
   ```

4. **Configura AWS S3**
   - Inserisci le tue credenziali AWS
   - Specifica il nome del bucket
   - Scegli il nome del file database

---

## 🛠️ Architettura Tecnologica

```mermaid
graph TB
    A[🌐 Browser] --> B[📱 MangaDB UI]
    B --> C[🦆 DuckDB WASM]
    B --> D[☁️ AWS S3]
    C --> E[📊 Parquet Files]
    D --> F[🔄 Backup System]
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style C fill:#fff3e0
    style D fill:#e8f5e8
```

### 🧩 Stack Tecnologico

| Componente | Tecnologia | Descrizione |
|------------|------------|-------------|
| 🎨 **Frontend** | HTML5 + CSS3 + JavaScript ES6+ | UI moderna e responsive |
| 🗄️ **Database** | DuckDB WASM | Database analitico in-memory |
| ☁️ **Storage** | AWS S3 | Backup e sincronizzazione cloud |
| 📊 **Formato Dati** | Apache Parquet | Compressione ottimale |
| 🎭 **UI Framework** | Bootstrap 5.3 | Design system moderno |
| 🔧 **Build Tools** | Vanilla JS | Zero dependencies |

---

## 🎮 Funzionalità Principali

### 📚 Gestione Manga
- ➕ **Aggiungi manga** con nome e link
- ✏️ **Modifica** informazioni esistenti
- 🗑️ **Elimina** manga dalla collezione
- 🔍 **Ricerca** avanzata per nome
- 📊 **Statistiche** dettagliate

### 🏷️ Sistema di Stato
- 📖 **Letti** - Manga completati
- ⏰ **Non Letti** - Da leggere
- 🔄 **Toggle rapido** dello stato

### ☁️ Backup e Sincronizzazione
- 💾 **Salvataggio automatico** su S3
- 🔄 **Backup manuale** con nome personalizzato
- 📥 **Caricamento** da backup esistenti
- 🗜️ **Ricompattazione** database

### 🎨 Interfaccia Utente
- 🌙 **Design glassmorphism** moderno
- 📱 **Responsive** su tutti i dispositivi
- ⚡ **Animazioni** fluide
- 🎯 **UX ottimizzata**

---

## 🔧 Configurazione AWS S3

### 🔐 Policy IAM Raccomandata

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::your-bucket-name",
                "arn:aws:s3:::your-bucket-name/*"
            ]
        }
    ]
}
```

### 🛡️ Sicurezza Best Practices

- ✅ Usa credenziali IAM dedicate
- ✅ Limita l'accesso al singolo bucket
- ✅ Abilita la crittografia S3
- ✅ Monitora gli accessi con CloudTrail
- ✅ Usa policy con principio del minimo privilegio

---

## 📁 Struttura del Progetto

```
📦 mangadb/
├── 🏠 index.html              # Homepage principale
├── 🔐 login.html              # Pagina di autenticazione
├── 📜 delete.min.js           # DuckDB WASM bundle
├── 📂 scripts/
│   ├── 🎮 app.js              # Logica applicazione
│   ├── 🗄️ manga-manager.js    # Gestione database
│   ├── 🔑 auth.js             # Autenticazione AWS
│   ├── ☁️ aws-sdk.min.js      # AWS SDK
│   ├── 🎨 bootstrap1.min.js   # Bootstrap JS
│   └── 🏹 arrow.min.js        # Apache Arrow
├── 🎨 style/
│   ├── 🎭 bootstrap1.css      # Bootstrap CSS
│   ├── 🎯 fontawesome1.css    # Font Awesome
│   └── 📝 webfonts/           # Font files
└── 📋 README.md               # Questo file
```

---

## 🎯 Roadmap Futura

### 🚀 Versione 2.0
- [ ] 🏷️ **Tag personalizzati** per manga
- [ ] 📊 **Dashboard analytics** avanzata
- [ ] 🔄 **Sincronizzazione real-time**
- [ ] 📱 **PWA support** per mobile
- [ ] 🌙 **Dark mode** nativo

### 🌟 Versione 3.0
- [ ] 👥 **Condivisione collezioni**
- [ ] 🤖 **AI recommendations**
- [ ] 📚 **Import da MyAnimeList**
- [ ] 🔔 **Notifiche push**
- [ ] 🌐 **Multi-lingua**

---

## 🤝 Contribuire

### 🎯 Come Contribuire

1. **Fork** il repository
2. **Crea** un branch per la tua feature
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit** le tue modifiche
   ```bash
   git commit -m '✨ Add amazing feature'
   ```
4. **Push** al branch
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Apri** una Pull Request

### 🐛 Segnalare Bug

Usa il [sistema di issue](https://github.com/DuPont9029/mangadb/issues) per segnalare bug o richiedere nuove funzionalità.

---

## 📄 Licenza

```
MIT License

Copyright (c) 2024 MangaDB

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<div align="center">

### 🌟 Se ti piace MangaDB, lascia una stella! ⭐

**Made with ❤️ by DuPont9029**

[![GitHub stars](https://img.shields.io/github/stars/DuPont9029/mangadb?style=social)](https://github.com/DuPont9029/mangadb/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/DuPont9029/mangadb?style=social)](https://github.com/DuPont9029/mangadb/network)
[![GitHub issues](https://img.shields.io/github/issues/DuPont9029/mangadb)](https://github.com/DuPont9029/mangadb/issues)

</div>

---

*🚀 Porta la tua collezione manga nello spazio con MangaDB!! 🌌*
        
