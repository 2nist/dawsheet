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
  let scriptContent = cacheKey ? cache.get(cacheKey) : null;
  if (!scriptContent) {
    console.log(`Loading ${cacheKey || 'lib'} from URL: ${url}`);
    const response = UrlFetchApp.fetch(url);
    scriptContent = response.getContentText();
    // CacheService limit per item is ~100KB. Skip caching oversized content to avoid truncation.
    try {
      const len = scriptContent ? scriptContent.length : 0; // minified libs are ASCII => length ~= bytes
      const MAX_SAFE_CACHE = 95000; // bytes (approx)
      if (cacheKey && len > 0 && len <= MAX_SAFE_CACHE) {
        cache.put(cacheKey, scriptContent, 3600);
        console.log(`${cacheKey} loaded and cached (${len} bytes).`);
      } else if (cacheKey) {
        console.log(`${cacheKey} size ${len} bytes > cache limit, skipping cache.`);
      }
    } catch (e) {
      // Non-fatal; proceed without cache
      console.log(`Cache skip due to error for ${cacheKey}: ${e && e.message}`);
    }
  } else {
    console.log(`${cacheKey} retrieved from cache (${scriptContent.length} bytes).`);
  }
  return scriptContent;
}

/** Try multiple URLs, returning the first successfully loaded script; logs failures. */
function loadScriptFromAny(urls, cacheKey) {
  var lastErr = null;
  for (var i = 0; i < urls.length; i++) {
    var u = urls[i];
    try {
      return loadScript(u, cacheKey);
    } catch (e) {
      lastErr = e;
      console.log(`loadScriptFromAny: failed ${u}: ${e && e.message ? e.message : e}`);
    }
  }
  throw lastErr || new Error('All sources failed for ' + (cacheKey || 'lib'));
}

/**
 * Evaluates provided JS code in the Apps Script context.
 * @param {string} scriptContent
 */
function evaluateScript(scriptContent) {
  // eslint-disable-next-line no-eval
  eval(scriptContent);
}

/**
 * Evaluate third-party browser/UMD/CommonJS code safely by shimming CommonJS globals.
 * Ensures references to `exports`/`module` do not throw and maps module.exports to a global when needed.
 * @param {string} scriptContent
 * @param {string} globalName Name of the global symbol to attach if module.exports is present (e.g., 'Ajv').
 */
function evaluateScriptWithCjsShim(scriptContent, desiredGlobalName) {
  var desired = String(desiredGlobalName || '');
  // Step 1: define CommonJS shims in the global scope
  // eslint-disable-next-line no-eval
  eval('var module = { exports: {} }; var exports = module.exports;');
  // Step 2: evaluate the third-party script as-is
  try {
    // eslint-disable-next-line no-eval
    eval(String(scriptContent || ''));
  } catch (e) {
    var msg = (e && e.message) ? e.message : String(e);
    console.error(`Error evaluating third-party script (${desired || 'unknown global'}). Len=${(scriptContent||'').length}. ${msg}`);
    throw e;
  }
  // Step 3: if a desired global name is requested and not set, copy from module.exports
  try {
    var g = (typeof globalThis !== 'undefined') ? globalThis : this;
    if (desired && typeof g[desired] === 'undefined' && typeof module !== 'undefined' && module && module.exports) {
      var mod = module.exports;
      g[desired] = (mod && mod.default) ? mod.default : mod;
    }
  } catch (e) {
    // no-op
  }
}

/**
 * Prefer evaluating UMD/browser bundles without CJS shims to avoid triggering require().
 * Falls back to CJS shim only if the desired global isn't defined after the first pass.
 * @param {string} scriptContent
 * @param {string} desiredGlobalName
 */
function evaluateScriptPreferGlobal(scriptContent, desiredGlobalName) {
  var desired = String(desiredGlobalName || '');
  // First try: evaluate as-is (UMD should attach to window/globalThis)
  try {
  // Ensure UMD doesn't take CJS/AMD branches by shadowing as undefined in this scope
  // eslint-disable-next-line no-eval
  eval('var module; var exports; var define;');
    // eslint-disable-next-line no-eval
    eval(String(scriptContent || ''));
  } catch (e) {
    console.error(`Error evaluating (prefer-global) for ${desired || 'unknown'}: ${(e && e.message) || e}`);
  }
  try {
    var g = (typeof globalThis !== 'undefined') ? globalThis : this;
    if (desired && typeof g[desired] !== 'undefined') {
      return; // success
    }
  } catch (e) { /* continue to fallback */ }
  // Fallback: use CJS shim
  evaluateScriptWithCjsShim(scriptContent, desiredGlobalName);
}

/** Loads and exposes Tonal.js globally. */
function loadTonalJs() {
  const tonalUrl = 'https://cdn.jsdelivr.net/npm/@tonaljs/tonal/browser/tonal.min.js';
  // Tonal's browser bundle is UMD; ensure no CJS refs blow up
  evaluateScriptPreferGlobal(loadScript(tonalUrl, 'tonalJs.v1'), 'Tonal');
}

/** Loads and exposes AJV globally. */
function loadAjv() {
  // Prefer a jsDelivr UMD build with a healthy mirror; fall back to older versions/CDNJS if needed
  const ajvUrls = [
    'https://cdn.jsdelivr.net/npm/ajv@8.12.0/dist/ajv.min.js',
    'https://cdn.jsdelivr.net/npm/ajv@8.6.0/dist/ajv.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/ajv/8.6.0/ajv.min.js'
  ];
  // Avoid cache for large file; bump cache key to v3 to skip any stale entries
  evaluateScriptPreferGlobal(loadScriptFromAny(ajvUrls, 'ajvJs.v3'), 'Ajv');
}

/** Utility to clear cached library entries in case of corruption/truncation. */
function clearLibraryLoaderCache() {
  try {
    const cache = CacheService.getScriptCache();
    ['ajvJs', 'ajvJs.v2', 'tonalJs', 'tonalJs.v1'].forEach(k => {
      try { cache.remove(k); } catch (e) {}
    });
    console.log('LibraryLoader cache cleared for ajv/tonal keys.');
  } catch (e) {
    // ignore
  }
}
