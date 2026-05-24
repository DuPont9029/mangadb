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
      console.debug(`[mangak] Added custom proxy: ${formattedProxy}`);
    }

    // Prova prima la chiamata diretta
    try {
      console.debug(`[mangak] Trying direct fetch: ${url}`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      attempts.push(`direct -> ${e.message || e}`);
      console.warn(`[mangak] Direct fetch failed, falling back to proxies`);
    }

    // Se fallisce, prova i proxy
    for (const proxyUrl of proxyUrls) {
      try {
        console.debug(`[mangak] Trying proxy: ${proxyUrl}`);
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.text();
      } catch (e) {
        attempts.push(`${proxyUrl} -> ${e.message || e}`);
        console.warn(`[mangak] Proxy failed: ${proxyUrl}`, e);
      }
    }

    throw new Error(
      `[mangak] Failed to fetch after attempts:\n${attempts.join("\n")}`,
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
    console.groupCollapsed(`[mangak] scraping: ${url}`);
    try {
      const html = await fetchHtml(url);

      // Metodo 1: Cerca nei dati JSON iniettati (MangaK è un'app Next.js)
      // Cerca l'array "latestChapters" e preleva il primo elemento
      const match = html.match(
        /"latestChapters":\[{"id":"[^"]*","name":"Chapter\s+([0-9.]+)"/i,
      );
      if (match) {
        const chapterNum = parseFloat(match[1]);
        console.log(`[mangak] found via JSON latestChapters: ${chapterNum}`);
        return chapterNum;
      }

      // Metodo 2: Parsing del DOM (fallback)
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const chapters = [];

      // Come richiesto: i capitoli sono dentro questa griglia
      const listItems = doc.querySelectorAll(
        ".grid.grid-cols-1.md\\:grid-cols-2.gap-1\\.5 a",
      );

      listItems.forEach((link) => {
        let text = link.textContent.trim();
        let chapterNum = extractChapterNumber(text);

        if (chapterNum !== null && !isNaN(chapterNum)) {
          chapters.push(chapterNum);
        }
      });

      console.log(
        `[mangak] found chapters in DOM: ${chapters.length}`,
        chapters,
      );
      if (chapters.length === 0) {
        throw new Error("Nessun capitolo trovato né nel JSON né nel DOM");
      }

      chapters.sort((a, b) => b - a);
      return chapters[0];
    } catch (err) {
      console.error("[mangak] Error:", err);
      throw err;
    } finally {
      console.groupEnd();
    }
  }

  const provider = {
    name: "mangak",
    match: (url, host) =>
      (host || "").includes("mangak.io") || (url || "").includes("mangak.io") || (url || "").includes("mangak"),
    getAvailableChapters: getAvailableChapters,
  };

  if (window.UpdateRouter) {
    window.UpdateRouter.registerProvider(provider);
    console.log("[mangak] Provider registered");
  } else {
    console.warn("[mangak] UpdateRouter not found");
  }

  window.MangakProvider = provider;
})();
