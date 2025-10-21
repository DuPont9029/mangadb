(function() {
  // Scraping MangaBuddy
  async function fetchHtml(mangaUrl) {
    const response = await fetch(mangaUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
  }

  async function primaryGetAvailable(mangaUrl) {
    const doc = await fetchHtml(mangaUrl);
    const latestChaptersElement = doc.querySelector('.latest-chapters');
    if (!latestChaptersElement) {
      throw new Error('Elemento latest-chapters non trovato');
    }
    const chapterText = latestChaptersElement.textContent;
    const chapterMatch = chapterText.match(/Chapter\s+(\d+(?:\.\d+)?)/i);
    if (!chapterMatch) {
      throw new Error('Numero capitolo non trovato nel testo: ' + chapterText);
    }
    return parseFloat(chapterMatch[1]);
  }

  async function alternativeGetAvailable(mangaUrl) {
    const doc = await fetchHtml(mangaUrl);
    const selectors = [
      '.latest-chapters',
      '.chapter-list .chapter-item:first-child',
      '.manga-chapters .chapter:first-child',
      '[class*="chapter"]:first-child'
    ];
    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element) {
        const chapterMatch = element.textContent.match(/Chapter\s+(\d+(?:\.\d+)?)/i);
        if (chapterMatch) {
          return parseFloat(chapterMatch[1]);
        }
      }
    }
    throw new Error('Numero capitolo non trovato con nessun metodo');
  }

  async function getAvailableChapters(url) {
    try {
      return await primaryGetAvailable(url);
    } catch (error) {
      console.warn(`Primary scraping fallito per ${url}:`, error.message);
      return await alternativeGetAvailable(url);
    }
  }

  const provider = {
    name: 'mangabuddy',
    match: (url, host) => (host || '').includes('mangabuddy.com'),
    getAvailableChapters: async (url) => await getAvailableChapters(url),
  };

  if (window.UpdateRouter) {
    if (!window.UpdateRouter.hasProvider(provider.name)) {
      window.UpdateRouter.registerProvider(provider);
    }
  }

  // Esporta per debug opzionale
  window.MangaBuddyProvider = provider;
})();