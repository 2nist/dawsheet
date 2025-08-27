// LibraryLoader.gs
// Dynamically loads external JS libraries (Tonal.js, AJV) using UrlFetchApp and caches them.

/**
 * Loads a JavaScript library from a URL and caches its content for 1 hour.
 * @param {string} url
 * @param {string} cacheKey
 * @returns {string}
 */
function loadScript(requestUrl, cacheKey) {
  const cache = CacheService.getScriptCache();
  // Fast path: try cache first
  let scriptContent = cache.get(cacheKey);
  if (scriptContent) {
  console.log(`${cacheKey} retrieved from cache (length=${scriptContent.length}).`);
    return scriptContent;
  }
  // Avoid thundering-herd: only one concurrent fetch via ScriptLock
  const lock = LockService.getScriptLock();
  let haveLock = false;
  try {
    try { lock.waitLock(5000); haveLock = true; } catch (e) {
      console.warn(`Could not immediately acquire lock for ${cacheKey}: ${e && e.message ? e.message : e}`);
    }
    // Re-check cache after acquiring (another invocation may have populated it)
    scriptContent = cache.get(cacheKey);
    if (scriptContent) {
      console.log(`${cacheKey} retrieved from cache after lock (length=${scriptContent.length}).`);
      return scriptContent;
    }

    console.log(`Loading ${cacheKey} from URL (retry w/backoff): ${requestUrl}`);
    const response = fetchWithRetry_(requestUrl, 3);
    const code = response.getContentText();
    if (!code || response.getResponseCode() >= 400) {
      throw new Error(`Failed to load ${cacheKey} (${response.getResponseCode()})`);
    }
    // Only cache if below approx 90KB to avoid CacheService truncation (100KB limit)
    if (code.length < 90000) {
      cache.put(cacheKey, code, 3600);
      console.log(`${cacheKey} cached (length=${code.length}).`);
    } else {
      console.log(`${cacheKey} not cached due to size (length=${code.length}).`);
    }
    return code;
  } finally {
    if (haveLock) { try { lock.releaseLock(); } catch(_) {} }
  }
}

/**
 * Fetch with simple exponential backoff (handles transient 429/5xx).
 * @param {string} url
 * @param {number} maxAttempts
 */
function fetchWithRetry_(requestUrl, maxAttempts) {
  var attempt = 0, lastErr, resp = null;
  while (attempt < maxAttempts) {
    attempt++;
    try {
  resp = UrlFetchApp.fetch(requestUrl, { muteHttpExceptions: true, followRedirects: true, validateHttpsCertificates: true });
      var code = resp.getResponseCode();
      if (code < 400) return resp;
      // 429/5xx: retryable
      if (code === 429 || (code >= 500 && code < 600)) {
        lastErr = new Error(`HTTP ${code}`);
      } else {
        throw new Error(`HTTP ${code}`);
      }
    } catch (e) {
      lastErr = e;
    }
    if (attempt < maxAttempts) {
      var backoffMs = Math.floor(200 * Math.pow(2, attempt - 1) + Math.random() * 150);
      try { Utilities.sleep(backoffMs); } catch(_) {}
    }
  }
  if (lastErr) throw lastErr;
  return resp; // should not reach
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
    // Verify global is present; if not, fall back
    // eslint-disable-next-line no-undef
    if (typeof Ajv === 'undefined') throw new Error('Ajv not defined after load');
  } catch (e2) {
    console.warn('AJV v8 not available, falling back to v6:', e2 && e2.message ? e2.message : e2);
    const ajv6Url = 'https://cdn.jsdelivr.net/npm/ajv@6.12.6/dist/ajv.min.js';
    evaluateScript(loadScript(ajv6Url, 'ajv6Js'), 'Ajv');
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

/** Prewarm both external libraries to avoid on-demand fetch storms during batch jobs. */
function prewarmLibraries() {
  try { loadAjv(); } catch (e) { console.warn('prewarm Ajv failed:', e && e.message ? e.message : e); }
  try { loadTonalJs(); } catch (e2) { console.warn('prewarm Tonal failed:', e2 && e2.message ? e2.message : e2); }
  return 'Libraries prewarmed.';
}
