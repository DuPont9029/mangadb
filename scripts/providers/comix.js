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
      // Se l'utente ha inserito "url=", lo usiamo così com'è, altrimenti appendiamo
      let formattedProxy = customProxy;
      if (!customProxy.includes("url=")) {
        // Aggiungi separatore query string corretto
        const separator = customProxy.includes("?") ? "&" : "?";
        formattedProxy = `${customProxy}${separator}url=${encodeURIComponent(url)}`;
      } else {
        // Sostituisci eventuale placeholder o appendi
        formattedProxy = `${customProxy}${encodeURIComponent(url)}`;
      }
      // Metti il custom proxy all'inizio della lista
      proxyUrls.unshift(formattedProxy);
      console.debug(`[comix] Added custom proxy: ${formattedProxy}`);
    }

    for (const proxyUrl of proxyUrls) {
      try {
        console.debug(`[comix] Trying proxy: ${proxyUrl}`);
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const doc = parser.parseFromString(html, "text/html");
        return doc;
      } catch (e) {
        attempts.push(`${proxyUrl} -> ${e.message || e}`);
        console.warn(`[comix] Proxy failed: ${proxyUrl}`, e);
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
        `[comix] Failed to fetch after attempts:\n${attempts.join("\n")}`,
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
    console.groupCollapsed(`[comix] scraping: ${url}`);
    try {
      const doc = await fetchHtml(url);
      const chapters = [];

      // Selettore specifico per comix basato sull'immagine fornita (es: <a class="mchap-row__primary">Ch.4.3</a>)
      const listItems = doc.querySelectorAll(
        ".mchap-list .mchap-item .mchap-row__primary",
      );

      listItems.forEach((link) => {
        let chapterNum = extractChapterNumber(link.textContent.trim());

        if (chapterNum !== null && !isNaN(chapterNum)) {
          chapters.push(chapterNum);
        }
      });

      console.log(`[comix] found chapters: ${chapters.length}`, chapters);
      if (chapters.length === 0) {
        throw new Error("Nessun capitolo trovato");
      }
      // Ordina decrescente e prendi il primo (il più recente)
      chapters.sort((a, b) => b - a);
      return chapters[0];
    } catch (err) {
      console.error("[comix] Error:", err);
      // Rilancia l'errore per farlo gestire al chiamante (updates.js)
      throw err;
    } finally {
      console.groupEnd();
    }
  }

  const provider = {
    name: "comix",
    match: (url, host) =>
      (host || "").includes("comix.to") || (url || "").includes("comix.to"),
    getAvailableChapters: getAvailableChapters,
  };

  if (window.UpdateRouter) {
    window.UpdateRouter.registerProvider(provider);
    console.log("[comix] Provider registered");
  } else {
    console.warn("[comix] UpdateRouter not found");
  }

  window.ComixProvider = provider;
})();
