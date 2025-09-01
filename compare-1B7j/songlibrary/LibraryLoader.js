// LibraryLoader.gs
// Dynamically loads external JS libraries (Tonal.js, AJV) using UrlFetchApp and caches them.

/**
 * Loads a JavaScript library from a URL and caches its content for 1 hour.
 * @param {string} url
 * @param {string} cacheKey
 * @returns {string}
 */
function loadScript(url, cacheKey) {
  const cache = CacheService.getScriptCache();
  let scriptContent = cache.get(cacheKey);
  if (!scriptContent) {
    console.log(`Loading ${cacheKey} from URL: ${url}`);
    const response = UrlFetchApp.fetch(url);
    scriptContent = response.getContentText();
    cache.put(cacheKey, scriptContent, 3600);
    console.log(`${cacheKey} loaded and cached.`);
  } else {
    console.log(`${cacheKey} retrieved from cache.`);
  }
  return scriptContent;
}

/**
 * Evaluates provided JS code in the Apps Script context.
 * @param {string} scriptContent
 */
function evaluateScript(scriptContent) {
  // eslint-disable-next-line no-eval
  eval(scriptContent);
}

/** Loads and exposes Tonal.js globally. */
function loadTonalJs() {
  const tonalUrl = 'https://cdn.jsdelivr.net/npm/@tonaljs/tonal/browser/tonal.min.js';
  evaluateScript(loadScript(tonalUrl, 'tonalJs'));
}

/** Loads and exposes AJV globally. */
function loadAjv() {
  const ajvUrl = 'https://cdn.jsdelivr.net/npm/ajv@8.6.0/dist/ajv.min.js';
  evaluateScript(loadScript(ajvUrl, 'ajvJs'));
}
