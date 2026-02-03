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

    for (const proxyUrl of proxyUrls) {
      try {
        console.debug(`[ravenscans] Trying proxy: ${proxyUrl}`);
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const doc = parser.parseFromString(html, "text/html");
        return doc;
      } catch (e) {
        attempts.push(`${proxyUrl} -> ${e.message || e}`);
        console.warn(`[ravenscans] Proxy failed: ${proxyUrl}`, e);
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
        `[ravenscans] Failed to fetch after attempts:\n${attempts.join("\n")}`,
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
    console.groupCollapsed(`[ravenscans] scraping: ${url}`);
    try {
      const doc = await fetchHtml(url);
      const chapters = [];

      // Selettore specifico per ravenscans basato sull'immagine fornita
      const listItems = doc.querySelectorAll("#chapterlist ul li");

      listItems.forEach((li) => {
        const numAttr = li.getAttribute("data-num");
        let chapterNum = null;

        // Prima prova a usare l'attributo data-num
        if (numAttr) {
          chapterNum = parseFloat(numAttr);
        } else {
          // Fallback: cerca nel testo o nei figli
          const chapterNameElement = li.querySelector(".chapternum") || li;
          chapterNum = extractChapterNumber(chapterNameElement.textContent);
        }

        if (chapterNum !== null && !isNaN(chapterNum)) {
          chapters.push(chapterNum);
        }
      });

      console.log(`[ravenscans] found chapters: ${chapters.length}`, chapters);
      if (chapters.length === 0) {
        throw new Error("Nessun capitolo trovato");
      }
      // Ordina decrescente e prendi il primo (il più recente)
      chapters.sort((a, b) => b - a);
      return chapters[0];
    } catch (err) {
      console.error("[ravenscans] Error:", err);
      // Rilancia l'errore per farlo gestire al chiamante (updates.js)
      throw err;
    } finally {
      console.groupEnd();
    }
  }

  const provider = {
    name: "ravenscans",
    match: (url) =>
      url.includes("ravenscans.com") || url.includes("raven-scans.com"),
    getAvailableChapters: getAvailableChapters,
  };

  if (window.UpdateRouter) {
    window.UpdateRouter.registerProvider(provider);
    console.log("[ravenscans] Provider registered");
  } else {
    console.warn("[ravenscans] UpdateRouter not found");
  }

  window.RavenscansProvider = provider;
})();
