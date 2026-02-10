


          
#  MangaDB 

<div align="center">

![MangaDB Logo](https://img.shields.io/badge/📚-MangaDB-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQgNkgyMFYxOEg0VjZaIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+)

**collezione manga sempre organizzata nel cloud! **

[![DuckDB](https://img.shields.io/badge/DuckDB-WASM-orange?style=flat-square&logo=duckdb)](https://duckdb.org/)
[![AWS S3](https://img.shields.io/badge/AWS-S3-yellow?style=flat-square&logo=amazon-aws)](https://aws.amazon.com/s3/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple?style=flat-square&logo=bootstrap)](https://getbootstrap.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-green?style=flat-square&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

</div>

---

##  Cos'è MangaDB?

**MangaDB** è un'applicazione web moderna e potente per gestire la tua collezione di manga direttamente nel browser! Utilizza tecnologie all'avanguardia come **DuckDB WASM** per il database locale e **AWS S3** per il backup cloud.

###  Caratteristiche Spaziali

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

## 🌐 Siti Supportati

<div align="center">

| Logo | Sito | Descrizione |
|:---:|:---|:---|
| <img src="https://www.google.com/s2/favicons?domain=mangabuddy.com&sz=64" width="32"> | **MangaBuddy** | Ampia collezione di manga e manhua |
| <img src="https://www.google.com/s2/favicons?domain=manhwabuddy.com&sz=64" width="32"> | **ManhwaBuddy** | Specializzato in manhwa e webtoon coreani |
| <img src="https://www.google.com/s2/favicons?domain=ravenscans.com&sz=64" width="32"> | **RavenScans** | Scanlation group con titoli esclusivi |
| <img src="https://www.google.com/s2/favicons?domain=mangafire.to&sz=64" width="32"> | **MangaFire** | Interfaccia moderna e aggiornamenti rapidi |

</div>

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
---
config:
  layout: fixed
---
flowchart TB
    A["🌐 Browser"] --> B["📱 MangaDB UI"] & n6["proxy"]
    B --> C["🦆 DuckDB WASM"]
    C --> E["📊 Parquet Files"]
    E --> D["☁️ AWS S3"]
    F["🔄 Backup System"] --> D
    n1["providers"] -- nuovi capitoli --> B
    n1 --> n2["mangabuddy"] & n3["manhwabuddy"] & n4["ravenscans"] & n5["mangafire"]
    B -- ricerca diretta --> n2
    n6 --> n1

    n6@{ shape: rect}
    n1@{ shape: rect}
    n2@{ shape: rect}
    n3@{ shape: rect}
    n4@{ shape: rect}
    n5@{ shape: rect}
    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style n6 fill:#FFF9C4
    style C fill:#fff3e0
    style D fill:#e8f5e8
    style n2 fill:#2962FF,color:#FFFFFF
    style n3 fill:#E1BEE7
    style n4 fill:#FFCDD2
    style n5 fill:#BBDEFB
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
  "syntax_version": "itworks",
  "statement": [
    {
      "effect": "allow",
      "action": [
        "s3:DeleteObject"
      ],
      "resource": [
        "crn:object:objectname/*"
      ]
    },
    {
      "effect": "allow",
      "action": [
        "s3:GetObject"
      ],
      "resource": [
        "crn:object:objectname/*"
      ]
    },
    {
      "effect": "allow",
      "action": [
        "s3:PutObject"
      ],
      "resource": [
        "crn:object:objectname/*"
      ]
    },
    {
      "effect": "allow",
      "action": [
        "s3:ListBucket"
      ],
      "resource": [
        "crn:object:objectname"
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
- [X] 🔎 **Cerca updates** avanzato
- [X] 📱 **PWA support** per mobile
- [ ] 🏷️ **Tag personalizzati** per manga
- [ ] 🌙 **Dark mode** nativo


### 🌟 Versione 3.0
- [ ] 👥 **Condivisione collezioni**
- [ ] 🤖 **AI recommendations**
- [ ] 📚 **Accesso con google**
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

<div align="center">

### 🌟 Se ti piace MangaDB, lascia una stella! ⭐

**Made with ❤️ by DuPont9029**

[![GitHub stars](https://img.shields.io/github/stars/DuPont9029/mangadb?style=social)](https://github.com/DuPont9029/mangadb/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/DuPont9029/mangadb?style=social)](https://github.com/DuPont9029/mangadb/network)
[![GitHub issues](https://img.shields.io/github/issues/DuPont9029/mangadb)](https://github.com/DuPont9029/mangadb/issues)

</div>

---

*🚀 Porta la tua collezione manga nello spazio con MangaDB!! 🌌*
        
