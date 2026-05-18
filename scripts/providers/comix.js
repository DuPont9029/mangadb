(function () {
  async function fetchHtml(url) {
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
      console.debug(`[comix] Added custom proxy: ${formattedProxy}`);
    }

    // Prova prima la chiamata diretta (che fallisce nel browser per CORS)
    try {
      console.debug(`[comix] Trying direct fetch: ${url}`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      attempts.push(`direct -> ${e.message || e}`);
      console.warn(`[comix] Direct fetch failed, falling back to proxies`);
    }

    // Se la chiamata diretta fallisce, prova i proxy
    for (const proxyUrl of proxyUrls) {
      try {
        console.debug(`[comix] Trying proxy: ${proxyUrl}`);
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
      } catch (e) {
        attempts.push(`${proxyUrl} -> ${e.message || e}`);
        console.warn(`[comix] Proxy failed: ${proxyUrl}`, e);
      }
    }

    throw new Error(
      `[comix] Failed to fetch after attempts:\n${attempts.join("\n")}`,
    );
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
      const html = await fetchHtml(url);

      // Metodo 1: Cerca il latestChapter nel JSON della pagina (più affidabile per app SPA)
      let match = html.match(/"latestChapter":\s*([0-9.]+)/);
      if (match) {
        const chapterNum = parseFloat(match[1]);
        console.log(`[comix] found via JSON latestChapter: ${chapterNum}`);
        return chapterNum;
      }

      // Metodo 2: Cerca nel latestChapterUrl del JSON
      match = html.match(/"latestChapterUrl":"[^"]+chapter-([0-9.]+)/i);
      if (match) {
        const chapterNum = parseFloat(match[1]);
        console.log(`[comix] found via JSON latestChapterUrl: ${chapterNum}`);
        return chapterNum;
      }

      // Metodo 3: Fallback al DOM parsing (se la pagina è renderizzata)
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const chapters = [];

      const listItems = doc.querySelectorAll(
        ".mchap-list .mchap-item .mchap-row__primary",
      );

      listItems.forEach((link) => {
        let chapterNum = extractChapterNumber(link.textContent.trim());

        if (chapterNum !== null && !isNaN(chapterNum)) {
          chapters.push(chapterNum);
        }
      });

      console.log(
        `[comix] found chapters in DOM: ${chapters.length}`,
        chapters,
      );
      if (chapters.length === 0) {
        throw new Error("Nessun capitolo trovato né nel JSON né nel DOM");
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
