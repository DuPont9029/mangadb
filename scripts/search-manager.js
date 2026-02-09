// Search Manager per MangaDB
// Gestisce la ricerca live su provider esterni

const SearchManager = {
  debounceTimer: null,
  minChars: 3,

  // Configurazione Proxy
  // Usiamo corsproxy.io come default, fallback ad altri se necessario
  defaultProxy: "https://corsproxy.io/?",

  get proxyUrl() {
    return localStorage.getItem("custom_proxy_url") || this.defaultProxy;
  },

  init() {
    const nameInput = document.getElementById("manga-name");
    const suggestionsBox = document.getElementById("search-suggestions");

    if (!nameInput || !suggestionsBox) return;

    nameInput.addEventListener("input", (e) => {
      const query = e.target.value.trim();

      // Nascondi suggerimenti se query troppo corta
      if (query.length < this.minChars) {
        this.hideSuggestions();
        return;
      }

      // Debounce
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.performSearch(query), 500);
    });

    // Chiudi suggerimenti quando si clicca fuori
    document.addEventListener("click", (e) => {
      if (!suggestionsBox.contains(e.target) && e.target !== nameInput) {
        this.hideSuggestions();
      }
    });
  },

  async performSearch(query) {
    this.showLoading(true);
    this.hideSuggestions(); // Nascondi vecchi risultati mentre carica

    try {
      // Esegui ricerche in parallelo
      const results = await Promise.allSettled([
        this.searchMangaBuddy(query),
        this.searchManhwaBuddy(query),
        this.searchMangaNato(query),
        this.searchMangaDex(query),
        this.searchNatoMangaProvider(query),
      ]);

      // Appiattisci risultati
      const flatResults = [];
      results.forEach((res) => {
        if (res.status === "fulfilled") {
          flatResults.push(...res.value);
        }
      });

      this.showSuggestions(flatResults);
    } catch (error) {
      console.error("Errore ricerca globale:", error);
    } finally {
      this.showLoading(false);
    }
  },

  // Provider: NatoManga (via ManganatoProvider)
  async searchNatoMangaProvider(query) {
    if (
      window.ManganatoProvider &&
      typeof window.ManganatoProvider.search === "function"
    ) {
      try {
        return await window.ManganatoProvider.search(query);
      } catch (e) {
        console.warn("NatoManga Provider search failed:", e);
        return [];
      }
    }
    return [];
  },

  // Provider: ManhwaBuddy
  async searchManhwaBuddy(query) {
    try {
      const targetUrl = `https://manhwabuddy.com/search/?s=${encodeURIComponent(query)}`;
      const response = await fetch(
        this.proxyUrl + encodeURIComponent(targetUrl),
      );
      if (!response.ok) throw new Error("Network response was not ok");

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const results = [];
      // Selector update based on user request:
      // Container: .latest-list.flex
      // Item: .latest-item.flex
      // Link/Title: a tag inside item
      const items = doc.querySelectorAll(".latest-list .latest-item");

      items.forEach((item) => {
        const linkEl = item.querySelector("a");
        if (linkEl) {
          let link = linkEl.getAttribute("href");
          if (link && !link.startsWith("http")) {
            link = "https://manhwabuddy.com" + link;
          }

          const title =
            linkEl.getAttribute("title") || linkEl.textContent.trim();
          const img = item.querySelector("img")?.getAttribute("src");

          if (title && link) {
            results.push({
              title: title,
              link: link,
              source: "ManhwaBuddy",
              cover: img,
            });
          }
        }
      });
      return results;
    } catch (e) {
      console.warn("ManhwaBuddy search failed:", e);
      return [];
    }
  },

  // Provider: MangaBuddy
  async searchMangaBuddy(query) {
    try {
      const targetUrl = `https://mangabuddy.com/api/manga/search?q=${encodeURIComponent(query)}`;
      const response = await fetch(
        this.proxyUrl + encodeURIComponent(targetUrl),
      );
      if (!response.ok) throw new Error("Network response was not ok");

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const results = [];
      // MangaBuddy returns partial HTML with <li> or similar
      const items = doc.querySelectorAll("li, .novel__item, .search-item");

      items.forEach((item) => {
        const linkEl = item.querySelector("a");
        if (linkEl) {
          let link = linkEl.getAttribute("href");
          if (link && !link.startsWith("http")) {
            link = "https://mangabuddy.com" + link;
          }

          // Use title attribute if available (often contains full title), fallback to text
          const title =
            linkEl.getAttribute("title") ||
            linkEl.textContent.trim() ||
            item.textContent.trim();

          // Image is often nested inside the link element
          const imgEl =
            linkEl.querySelector("img") || item.querySelector("img");
          const img =
            imgEl?.getAttribute("src") || imgEl?.getAttribute("data-src");

          results.push({
            title: title,
            link: link,
            source: "MangaBuddy",
            cover: img,
          });
        }
      });
      return results;
    } catch (e) {
      console.warn("MangaBuddy search failed:", e);
      return [];
    }
  },

  // Provider: MangaDex (API)
  async searchMangaDex(query) {
    try {
      const url = `https://api.mangadex.org/manga?title=${encodeURIComponent(query)}&limit=5&includes[]=cover_art&order[relevance]=desc`;
      const response = await fetch(url);

      if (!response.ok) throw new Error(`MangaDex error: ${response.status}`);

      const data = await response.json();

      return data.data.map((manga) => {
        const title =
          manga.attributes.title.en || Object.values(manga.attributes.title)[0];
        const coverRel = manga.relationships.find(
          (r) => r.type === "cover_art",
        );
        const coverFile = coverRel ? coverRel.attributes?.fileName : null;
        const coverUrl = coverFile
          ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFile}.256.jpg`
          : null;

        return {
          title: title,
          link: `https://mangadex.org/title/${manga.id}`,
          source: "MangaDex",
          cover: coverUrl,
        };
      });
    } catch (e) {
      console.warn("MangaDex search failed:", e);
      return [];
    }
  },

  // Provider: Manganato / Mangakakalot
  async searchMangaNato(query) {
    try {
      // Usiamo Mangakakalot che è spesso più stabile di Manganato (spesso dietro Cloudflare pesante)
      const targetUrl = `https://mangakakalot.com/search/story/${encodeURIComponent(query.replace(/\s+/g, "_"))}`;
      const response = await fetch(
        this.proxyUrl + encodeURIComponent(targetUrl),
      );

      if (!response.ok) throw new Error("Network response was not ok");

      const html = await response.text();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const results = [];
      // Selettori multipli per coprire Manganato, Mangakakalot e varianti
      const items = doc.querySelectorAll(
        ".search-story-item, .item-r-st, .daily-update .story_item, .story_item",
      );

      items.forEach((item) => {
        const linkEl = item.querySelector("a.item-img, .story_name a");
        const titleEl = item.querySelector(
          ".item-right h3 a, .item-title, .story_name a",
        );
        const imgEl = item.querySelector("img");

        if (linkEl && titleEl) {
          results.push({
            title: titleEl.textContent.trim(),
            link: linkEl.getAttribute("href"),
            source: "Mangakakalot", // Aggiornato nome fonte
            cover: imgEl?.getAttribute("src"),
          });
        }
      });
      return results;
    } catch (e) {
      console.warn("Manganato/Mangakakalot search failed:", e);
      return [];
    }
  },

  showSuggestions(results) {
    const box = document.getElementById("search-suggestions");
    if (!box) return;

    box.innerHTML = "";

    if (results.length === 0) {
      box.innerHTML =
        '<div class="dropdown-item text-muted">Nessun risultato trovato</div>';
      box.classList.add("show");
      return;
    }

    results.slice(0, 10).forEach((manga) => {
      // Max 10 risultati
      const item = document.createElement("a");
      item.className = "dropdown-item d-flex align-items-center gap-2 py-2";
      item.href = "#";
      item.onclick = (e) => {
        e.preventDefault();
        this.selectManga(manga);
      };

      const coverHtml = manga.cover
        ? `<img src="${manga.cover}" style="width: 30px; height: 45px; object-fit: cover; border-radius: 4px;">`
        : `<div style="width: 30px; height: 45px; background: #eee; border-radius: 4px;"></div>`;

      item.innerHTML = `
                ${coverHtml}
                <div class="overflow-hidden">
                    <div class="text-truncate fw-bold">${manga.title}</div>
                    <div class="small text-muted d-flex align-items-center gap-1">
                        <span class="badge bg-secondary" style="font-size: 0.6rem;">${manga.source}</span>
                        <span class="text-truncate" style="max-width: 150px;">${manga.link}</span>
                    </div>
                </div>
            `;
      box.appendChild(item);
    });

    box.classList.add("show");
  },

  hideSuggestions() {
    const box = document.getElementById("search-suggestions");
    if (box) box.classList.remove("show");
  },

  showLoading(isLoading) {
    const loader = document.getElementById("search-loading");
    if (loader) {
      if (isLoading) loader.classList.remove("d-none");
      else loader.classList.add("d-none");
    }
  },

  selectManga(manga) {
    const nameInput = document.getElementById("manga-name");
    const linkInput = document.getElementById("manga-link");

    if (nameInput) {
      nameInput.value = manga.title;
      nameInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    if (linkInput) {
      linkInput.value = manga.link;
      linkInput.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // Visual feedback
    const suggestionsBox = document.getElementById("search-suggestions");
    if (suggestionsBox) {
      suggestionsBox.innerHTML = `
                <div class="alert alert-success m-2 py-2 px-3 small">
                    <i class="fas fa-check"></i> Dati caricati da ${manga.source}
                </div>
            `;
      setTimeout(() => this.hideSuggestions(), 2000);
    } else {
      this.hideSuggestions();
    }
  },
};

// Inizializza quando il DOM è pronto
document.addEventListener("DOMContentLoaded", () => {
  // Aspetta un attimo per assicurarsi che il modale esista nel DOM
  setTimeout(() => SearchManager.init(), 1000);
});

// Espone globalmente per debug
window.SearchManager = SearchManager;
