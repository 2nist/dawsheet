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
  if (scriptContent) {
    console.log(`${cacheKey} retrieved from cache (len=${scriptContent.length}).`);
    return scriptContent;
  }
  console.log(`Loading ${cacheKey} from URL: ${url}`);
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const code = response.getContentText();
  if (!code || response.getResponseCode() >= 400) {
    throw new Error(`Failed to load ${cacheKey} (${response.getResponseCode()})`);
  }
  // Only cache if below approx 90KB to avoid CacheService truncation (100KB limit)
  if (code.length < 90000) {
    cache.put(cacheKey, code, 3600);
    console.log(`${cacheKey} cached (len=${code.length}).`);
  } else {
    console.log(`${cacheKey} not cached due to size (len=${code.length}).`);
  }
  return code;
}

/**
 * Evaluates provided JS code in the Apps Script context.
 * @param {string} scriptContent
 */
function evaluateScript(scriptContent, expectedGlobalName) {
  // Provide CommonJS and browser-like globals so UMD/CJS bundles don't throw in GAS.
  var prelude = "(function(){var exports = {}; var module = { exports: exports }; var window = this; var self = this; var globalThis = this; var global = this;";
  var postlude = "; if (expected && typeof this[expected] === 'undefined' && module && module.exports) { this[expected] = module.exports; } }).call(this);";
  // Inject the expected symbol name into the closure scope safely.
  var header = "var expected = " + JSON.stringify(expectedGlobalName || "") + ";";
  // eslint-disable-next-line no-eval
  eval(prelude + header + scriptContent + postlude);
}

/** Loads and exposes Tonal.js globally. */
function loadTonalJs() {
  const tonalUrl = 'https://cdn.jsdelivr.net/npm/@tonaljs/tonal/browser/tonal.min.js';
  evaluateScript(loadScript(tonalUrl, 'tonalJs'), 'Tonal');
}

/** Loads and exposes AJV globally. */
function loadAjv() {
  const ajv8Url = 'https://cdn.jsdelivr.net/npm/ajv@8.6.0/dist/ajv.min.js';
  try {
    evaluateScript(loadScript(ajv8Url, 'ajvJs'), 'Ajv');
  } catch (e1) {
    // Clear cache and retry once with v8
    const cache = CacheService.getScriptCache();
    try { if (cache.remove) cache.remove('ajvJs'); } catch(_) {}
    try {
      evaluateScript(loadScript(ajv8Url, 'ajvJs'), 'Ajv');
      return;
    } catch (e2) {
      console.warn('AJV v8 load failed, falling back to v6:', e2 && e2.message ? e2.message : e2);
      const ajv6Url = 'https://cdn.jsdelivr.net/npm/ajv@6.12.6/dist/ajv.min.js';
      evaluateScript(loadScript(ajv6Url, 'ajv6Js'), 'Ajv');
    }
  }
}

/** Clears cached external libraries (AJV/Tonal) */
function libraryClearCache() {
  const cache = CacheService.getScriptCache();
  if (cache.removeAll) {
    cache.removeAll(['ajvJs','tonalJs']);
  } else {
    try { cache.remove('ajvJs'); } catch(_) {}
    try { cache.remove('tonalJs'); } catch(_) {}
  }
  return 'Library cache cleared.';
}
