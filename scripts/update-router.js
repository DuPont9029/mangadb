// Update Router modulare per gestire siti diversi
// Espone un registro di provider e una funzione di routing basata sul dominio

(function () {
  const providers = [];

  function normalizeHost(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    } catch (e) {
      // fallback semplice se URL non è valido
      return (url || '').toLowerCase();
    }
  }

  function registerProvider({ name, match, getAvailableChapters }) {
    if (typeof getAvailableChapters !== 'function') {
      throw new Error('Provider "' + name + '" deve definire getAvailableChapters(url)');
    }
    providers.push({ name, match, getAvailableChapters });
  }

  function hasProvider(name) {
    return providers.some(p => p.name === name);
  }

  function getProviderForUrl(url) {
    const host = normalizeHost(url);
    // Raccogli tutti i provider che matchano
    const matches = [];
    for (const p of providers) {
      let ok = false;
      if (typeof p.match === 'function') {
        try { ok = !!p.match(url, host); } catch (_) { ok = false; }
      } else if (p.match instanceof RegExp) {
        ok = p.match.test(host) || p.match.test(url);
      } else if (typeof p.match === 'string') {
        ok = host.includes(p.match) || url.includes(p.match);
      }
      if (ok) matches.push(p);
    }

    // Nessun fallback generico: se non troviamo provider, ritorniamo null
    if (matches.length === 0) return null;

    // Se ci sono più match, preferisci quelli con nome specifico (non "generic")
    const nonGeneric = matches.filter(p => p.name !== 'generic');
    return (nonGeneric[0] || matches[0]) || null;
  }

  async function getAvailableChapters(url) {
    const provider = getProviderForUrl(url);
    if (!provider) throw new Error('Nessun provider registrato per URL: ' + url);
    return await provider.getAvailableChapters(url);
  }

  // Inizializza router globale
  window.UpdateRouter = {
    registerProvider,
    getProviderForUrl,
    getAvailableChapters,
    hasProvider,
  };

  // RIMOSSO: provider generico e qualsiasi fallback
})();