(function () {
  async function fetchHtml(url) {
    const parser = new DOMParser();
    const attempts = [];

    // Lista dei proxy CORS da utilizzare
    const proxyUrls = [
      `https://mangadb-cors-proxy-g9xw27m9e-dupont9029s-projects.vercel.app/api/index?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${url}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.cors.lol/?url=${url}`,
      `https://api.cors.lol/?url=${encodeURIComponent(url)}`,
    ];

    // Aggiungi custom proxy se presente
    const customProxy = localStorage.getItem("custom_proxy_url");
    if (customProxy) {
      let formattedProxy = customProxy;
      if (!customProxy.includes("url=")) {
        const separator = customProxy.includes("?") ? "&" : "?";
        formattedProxy = `${customProxy}${separator}url=${encodeURIComponent(url)}`;
      } else {
        formattedProxy = `${customProxy}${encodeURIComponent(url)}`;
      }
      proxyUrls.unshift(formattedProxy);
      console.debug(`[mangafire] Added custom proxy: ${formattedProxy}`);
    }

    for (const proxyUrl of proxyUrls) {
      try {
        console.debug(`[mangafire] Trying proxy: ${proxyUrl}`);
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const doc = parser.parseFromString(html, "text/html");
        return doc;
      } catch (e) {
        attempts.push(`${proxyUrl} -> ${e.message || e}`);
        console.warn(`[mangafire] Proxy failed: ${proxyUrl}`, e);
      }
    }

    // Ultimo tentativo: diretto
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const html = await res.text();
      return parser.parseFromString(html, "text/html");
    } catch (err) {
      attempts.push(`direct:${url} -> ${err.message || err}`);
      throw new Error(
        `[mangafire] Failed to fetch after attempts:\n${attempts.join("\n")}`,
      );
    }
  }

  function extractChapterNumber(text) {
    if (!text) return null;
    const patterns = [
      /Chapter\s+(\d+(?:\.\d+)?)/i,
      /Capitolo\s+(\d+(?:\.\d+)?)/i,
      /Ep(?:isode)?\.?\s*(\d+(?:\.\d+)?)/i,
      /Ch\.?\s*(\d+(?:\.\d+)?)/i,
      /^(\d+(?:\.\d+)?)$/,
    ];
    for (const re of patterns) {
      const m = text.match(re);
      if (m) return parseFloat(m[1]);
    }
    return null;
  }

  async function getAvailableChapters(url) {
    console.groupCollapsed(`[mangafire] scraping: ${url}`);
    try {
      const doc = await fetchHtml(url);
      const chapters = [];

      // Selettore basato sull'HTML di esempio (delete.html)
      // <ul class="scroll-sm"> <li class="item" data-number="3.5"> ... </li> </ul>
      const listItems = doc.querySelectorAll("ul.scroll-sm li.item");

      if (listItems.length === 0) {
        console.warn("[mangafire] Nessun capitolo trovato con selettore standard");
      }

      listItems.forEach((li) => {
        // Tentativo 1: attributo data-number
        let chapterNum = null;
        const dataNum = li.getAttribute("data-number");
        
        if (dataNum) {
          chapterNum = parseFloat(dataNum);
        }

        // Tentativo 2: parsing del testo
        if (chapterNum === null || isNaN(chapterNum)) {
          const text = li.textContent.trim();
          chapterNum = extractChapterNumber(text);
        }

        if (chapterNum !== null && !isNaN(chapterNum)) {
          chapters.push(chapterNum);
        }
      });

      console.debug(`[mangafire] found ${chapters.length} chapters`, chapters);
      
      if (chapters.length === 0) {
        // Fallback: prova a cercare in altri elementi se il layout cambia
        // A volte mangafire usa .chapter-list o simili in altre view
        const fallbackItems = doc.querySelectorAll(".chapter-list li a, .list-body li a");
        fallbackItems.forEach(a => {
           const num = extractChapterNumber(a.textContent);
           if (num !== null) chapters.push(num);
        });
      }

      if (chapters.length === 0) return 0;
      
      const maxChapter = Math.max(...chapters);
      console.log(`[mangafire] Max chapter: ${maxChapter}`);
      return maxChapter;
    } catch (err) {
      console.error(`[mangafire] Error:`, err);
      return 0;
    } finally {
      console.groupEnd();
    }
  }

  const provider = {
    name: "mangafire",
    match: (url, host) =>
      (host || "").toLowerCase().includes("mangafire") ||
      (url || "").toLowerCase().includes("mangafire"),
    getAvailableChapters: async (url) => await getAvailableChapters(url),
  };

  if (window.UpdateRouter) {
    if (!window.UpdateRouter.hasProvider(provider.name)) {
      window.UpdateRouter.registerProvider(provider);
      console.log("[mangafire] Provider registered");
    }
  }

  window.MangafireProvider = provider;
})();
