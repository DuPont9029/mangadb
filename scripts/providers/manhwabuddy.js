(function() {
  async function fetchHtml(url) {
    const parser = new DOMParser();
    const gateRe = /Caution to under-aged viewers|Are you over 18/i;
    const attempts = [];

    // Prefer corsproxy.io first
    const proxyUrls = [
      `https://corsproxy.io/?${url}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.cors.lol/?url=${url}`,
      `https://api.cors.lol/?url=${encodeURIComponent(url)}`,
    ];
    for (const proxyUrl of proxyUrls) {
      try {
        console.debug(`[manhwabuddy] Trying proxy: ${proxyUrl}`);
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        const doc = parser.parseFromString(html, 'text/html');
        const bodyText = (doc.body && doc.body.textContent) || '';
        if (gateRe.test(bodyText)) {
          console.warn('[manhwabuddy] 18+ interstitial detected via corsproxy');
        }
        return doc;
      } catch (e) {
        attempts.push(`${proxyUrl} -> ${e.message || e}`);
        console.warn(`[manhwabuddy] Proxy failed: ${proxyUrl}`, e);
      }
    }

    // Last resort: try direct (likely CORS-blocked in browser)
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const html = await res.text();
      const doc = parser.parseFromString(html, 'text/html');
      const bodyText = (doc.body && doc.body.textContent) || '';
      if (gateRe.test(bodyText)) {
        console.warn('[manhwabuddy] 18+ interstitial detected (direct)');
      }
      return doc;
    } catch (err) {
      attempts.push(`direct:${url} -> ${err.message || err}`);
      throw new Error(`[manhwabuddy] Failed to fetch after attempts:\n${attempts.join('\n')}`);
    }
  }

  function extractChapterNumberFromTitle(title) {
    if (!title) return null;
    const patterns = [
      /Chapter\s+(\d+(?:\.\d+)?)/i,
      /Capitolo\s+(\d+(?:\.\d+)?)/i,
      /Ch\.?\s*(\d+(?:\.\d+)?)/i
    ];
    for (const re of patterns) {
      const m = title.match(re);
      if (m) return parseFloat(m[1]);
    }
    return null;
  }

  function extractChapterNumberFromText(text) {
    if (!text) return null;
    const patterns = [
      /Chapter\s+(\d+(?:\.\d+)?)/i,
      /Capitolo\s+(\d+(?:\.\d+)?)/i,
      /Ep(?:isode)?\.?\s*(\d+(?:\.\d+)?)/i,
      /Ch\.?\s*(\d+(?:\.\d+)?)/i
    ];
    for (const re of patterns) {
      const m = text.match(re);
      if (m) return parseFloat(m[1]);
    }
    return null;
  }

  function extractChapterNumberFromHref(href) {
    if (!href) return null;
    const patterns = [
      /\/chapter[-\/]?(\d+(?:\.\d+)?)(?:\/?|$)/i,
      /-(?:chapter|capitolo)[-\/]?(\d+(?:\.\d+)?)(?:\/?|$)/i
    ];
    for (const re of patterns) {
      const m = href.match(re);
      if (m) return parseFloat(m[1]);
    }
    return null;
  }

  async function primaryGetAvailable(url) {
    console.groupCollapsed(`[manhwabuddy] primary scraping: ${url}`);
    try {
      const doc = await fetchHtml(url);
      const bodyText = (doc.body && doc.body.textContent) || '';
      if (/Caution to under-aged viewers|Are you over 18/i.test(bodyText)) {
        console.warn('[manhwabuddy] 18+ interstitial rilevato: la chapter-list potrebbe non essere presente');
      }

      // Struttura specifica: div.box ul.chapter-list > li.myfut > a[title]
      let anchors = Array.from(doc.querySelectorAll('div.box ul.chapter-list li.myfut a[title]'));
      console.debug('Selettore div.box ul.chapter-list li.myfut a[title] ->', anchors.length);
      if (anchors.length === 0) {
        // Estendi ricerca all'intera chapter-list
        anchors = Array.from(doc.querySelectorAll('ul.chapter-list li a[title]'));
        console.debug('Fallback ul.chapter-list li a[title] ->', anchors.length);
      }
      if (anchors.length === 0) {
        // Copri varianti di classe chapter-list
        anchors = Array.from(doc.querySelectorAll('ul[class*="chapter-list" i] li a[title]'));
        console.debug('Fallback ul[class*="chapter-list" i] li a[title] ->', anchors.length);
      }
      if (anchors.length === 0) {
        // Copri varianti di li con prefisso "my"
        anchors = Array.from(doc.querySelectorAll('ul.chapter-list li[class*="my" i] a[title]'));
        console.debug('Fallback ul.chapter-list li[class*="my" i] a[title] ->', anchors.length);
      }

      const candidates = [];
      for (const a of anchors) {
        const title = a.getAttribute('title') || '';
        const n = extractChapterNumberFromTitle(title);
        if (typeof n === 'number') candidates.push(n);
      }
      console.debug('Candidati capitoli (primary):', candidates.length);

      if (candidates.length === 0) {
        // Prova testo o href se title assente
        const altAnchors = Array.from(doc.querySelectorAll('ul.chapter-list a'));
        console.debug('Fallback alt ul.chapter-list a ->', altAnchors.length);
        for (const a of altAnchors) {
          const n = extractChapterNumberFromText(a.textContent || '') ?? extractChapterNumberFromHref(a.getAttribute('href') || '');
          if (typeof n === 'number') candidates.push(n);
        }
        console.debug('Candidati capitoli (da testo/href):', candidates.length);
      }

      if (candidates.length === 0) {
        console.warn('[manhwabuddy] Nessun capitolo rilevato in primary');
        throw new Error('Nessun capitolo rilevato in chapter-list/myfut');
      }

      const max = Math.max(...candidates);
      console.debug('Ultimo capitolo (primary):', max);
      return max;
    } finally {
      console.groupEnd();
    }
  }

  async function alternativeGetAvailable(url) {
    console.groupCollapsed(`[manhwabuddy] alternative scraping: ${url}`);
    try {
      const doc = await fetchHtml(url);
      const bodyText = (doc.body && doc.body.textContent) || '';
      if (/Caution to under-aged viewers|Are you over 18/i.test(bodyText)) {
        console.warn('[manhwabuddy] 18+ interstitial rilevato (alternative): la pagina potrebbe essere bloccata');
      }

      // Fallback generici: prova a cercare capitoli via testo, title o href
      const selectors = [
        'a[title*="Chapter" i]',
        '.latest-chapters a',
        '[class*="chapter" i] a',
        'a[href*="/chapter" i]'
      ];
      const nums = [];
      for (const sel of selectors) {
        const anchors = Array.from(doc.querySelectorAll(sel));
        console.debug(`Selector ${sel} ->`, anchors.length);
        for (const a of anchors) {
          const title = a.getAttribute('title') || '';
          const n = extractChapterNumberFromTitle(title)
            ?? extractChapterNumberFromText(a.textContent || '')
            ?? extractChapterNumberFromHref(a.getAttribute('href') || '');
          if (typeof n === 'number') nums.push(n);
        }
      }
      console.debug('Candidati capitoli (alternative):', nums.length);
      if (nums.length === 0) {
        console.warn('[manhwabuddy] Nessun capitolo rilevato in alternative');
        throw new Error('Numero capitolo non trovato nei fallback');
      }
      const max = Math.max(...nums);
      console.debug('Ultimo capitolo (alternative):', max);
      return max;
    } finally {
      console.groupEnd();
    }
  }

  async function getAvailableChapters(url) {
    try {
      return await primaryGetAvailable(url);
    } catch (err) {
      console.warn(`Primary scraping manhwabuddy fallito per ${url}:`, err.message);
      return await alternativeGetAvailable(url);
    }
  }

  const provider = {
    name: 'manhwabuddy',
    match: (url, host) => ((host || '').toLowerCase().includes('manhwabuddy') || (url || '').toLowerCase().includes('manhwabuddy')),

    getAvailableChapters: async (url) => await getAvailableChapters(url),
  };

  if (window.UpdateRouter) {
    if (!window.UpdateRouter.hasProvider(provider.name)) {
      window.UpdateRouter.registerProvider(provider);
    }
  }

  window.ManhwabuddyProvider = provider;
})();