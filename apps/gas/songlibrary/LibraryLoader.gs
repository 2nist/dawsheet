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

/**
 * Load a JavaScript file from URL with relaxed caching threshold (supports larger libs).
 * Avoids CacheService truncation by only caching when comfortably small (< ~800KB for safety).
 */
function loadScript_(url, cacheKey) {
  const cache = CacheService.getScriptCache();
  let s = cacheKey ? cache.get(cacheKey) : null;
  if (!s) {
    const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (resp.getResponseCode() >= 400) throw new Error('Fetch failed ' + resp.getResponseCode() + ' for ' + url);
    s = resp.getContentText();
    if (cacheKey && s && s.length < 800000) {
      cache.put(cacheKey, s, 3600);
    }
  }
  return s;
}

/** Try multiple URLs, returning the first successfully loaded script; logs failures. */
function loadScriptFromAny(urls, cacheKey) {
  var lastErr = null;
  for (var i = 0; i < urls.length; i++) {
    var u = urls[i];
    try {
  return loadScript_(u, cacheKey);
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

/** Evaluate 3p browser bundles safely (no require/module/define paths). */
function safeEvalGlobal_(name, src) {
  // Pre-stub Node/AMD globals so UMD never tries to call real require()
  var require = function(){ return {}; };           // prevent ReferenceError
  var module = { exports: {} };                     // harmless module object
  var exports = module.exports;                     // common pattern
  var define = undefined;                           // no AMD
  try {
    // eslint-disable-next-line no-eval
    eval(String(src || ''));
  } catch (e) {
    throw new Error('safeEvalGlobal_ failed for '+name+': '+((e && e.message) || e));
  }
}

/** Evaluate a browser bundle so it can attach to global (window/self/global). */
function evalAsBrowserGlobal_(name, src) {
  try {
  var wrapper = '(function(){var window=this,self=this,global=this,globalThis=this;\n' +
          'var exports = (typeof exports!=="undefined"?exports:{}); var define=undefined; var require=undefined;\n' +
          String(src || '') + '\n}).call(this)';
    // eslint-disable-next-line no-eval
    eval(wrapper);
  } catch (e) {
    throw new Error('evalAsBrowserGlobal_ failed for ' + name + ': ' + ((e && e.message) || e));
  }
}

/** Loads and exposes Tonal.js globally. */
function loadTonalJs() {
  var gT = (typeof globalThis !== 'undefined') ? globalThis : this;
  var tried = [];
  function promoteTonal_(){
    if (typeof gT.Tonal !== 'undefined') return true;
    if (typeof gT.tonal !== 'undefined') { gT.Tonal = gT.tonal; }
    return typeof gT.Tonal !== 'undefined';
  }
  function tryEvalList_(urls, label){
    for (var i=0;i<urls.length;i++){
      var u = urls[i];
      try {
        var src = loadScript_(u, null);
        evalAsBrowserGlobal_(label, src);
        if (promoteTonal_()) return true;
      } catch (e) {
        tried.push(label + ' ' + u + ' -> ' + ((e && e.message) || e));
      }
    }
    return promoteTonal_();
  }
  var paths = [
    // jsDelivr pinned 4.x
    'https://cdn.jsdelivr.net/npm/@tonaljs/tonal@4.10.0/browser/tonal.min.js',
    'https://cdn.jsdelivr.net/npm/@tonaljs/tonal@4.10.0/dist/tonal.min.js',
    'https://cdn.jsdelivr.net/npm/@tonaljs/tonal@4.9.0/browser/tonal.min.js',
    'https://cdn.jsdelivr.net/npm/@tonaljs/tonal@4.9.0/dist/tonal.min.js',
    // generic 4.x latest
    'https://cdn.jsdelivr.net/npm/@tonaljs/tonal@4/browser/tonal.min.js',
    'https://cdn.jsdelivr.net/npm/@tonaljs/tonal@4/dist/tonal.min.js',
    // older tonal package (pre-split)
    'https://cdn.jsdelivr.net/npm/tonal@3.6.0/build/tonal.min.js'
  ];
  if (!tryEvalList_(paths, 'Tonal')) {
    // Final fallback: inline minimal Tonal IIFE shipped with the project
    try {
      var html = HtmlService.createHtmlOutputFromFile('tonal_iife').getContent();
      // Extract inner script content if wrapped
      var m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      var srcInline = m ? m[1] : html;
      evalAsBrowserGlobal_('Tonal(inline)', srcInline);
      if (!promoteTonal_()) throw new Error('inline fallback did not attach Tonal');
    } catch (e) {
      tried.push('inline fallback -> ' + ((e && e.message) || e));
      throw new Error('Tonal not on global after eval; tried: ' + tried.join(' | '));
    }
  }
}

/** Loads and exposes AJV globally. */
function loadAjv() {
  var gA = (typeof globalThis !== 'undefined') ? globalThis : this;
  var tried = [];
  function promoteAjv_() {
    if (typeof gA.Ajv !== 'undefined') return true;
    if (typeof gA.ajv !== 'undefined') {
      var mod = gA.ajv;
      gA.Ajv = (mod && (mod.default || mod.Ajv)) ? (mod.default || mod.Ajv) : mod;
    }
    if (typeof gA.Ajv === 'undefined' && typeof gA.Ajv2020 !== 'undefined') {
      gA.Ajv = gA.Ajv2020;
    }
    return typeof gA.Ajv !== 'undefined';
  }
  function tryEvalList_(urls, label){
    for (var i=0;i<urls.length;i++){
      var u = urls[i];
      try {
        var src = loadScript_(u, null); // avoid caching failed variant
        evalAsBrowserGlobal_(label, src);
        if (promoteAjv_()) return true;
      } catch (e) {
        tried.push(label + ' ' + u + ' -> ' + ((e && e.message) || e));
      }
    }
    return promoteAjv_();
  }
  var v8 = [
    'https://cdn.jsdelivr.net/npm/ajv@8.12.0/dist/ajv.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/ajv/8.12.0/ajv.min.js'
  ];
  var v6 = [
    'https://cdn.jsdelivr.net/npm/ajv@6.12.6/dist/ajv.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/ajv/6.12.6/ajv.min.js'
  ];
  if (!tryEvalList_(v8, 'Ajv v8')) {
    tryEvalList_(v6, 'Ajv v6');
  }
  if (typeof gA.Ajv === 'undefined') throw new Error('Ajv not on global after eval; tried: ' + tried.join(' | '));
}

/** Utility to clear cached library entries in case of corruption/truncation. */
function clearLibraryLoaderCache() {
  try {
    const cache = CacheService.getScriptCache();
  ['ajvJs', 'ajvJs.v2', 'ajvJs.v3', 'ajvJs.v4', 'ajvJs.v5', 'ajvJs.v6', 'ajvJs.v6.1', 'ajvJs.v7', 'ajvJs.v8', 'tonalJs', 'tonalJs.v1', 'tonalJs.v2', 'tonalJs.v3', 'tonalJs.v4'].forEach(k => {
      try { cache.remove(k); } catch (e) {}
    });
    console.log('LibraryLoader cache cleared for ajv/tonal keys.');
  } catch (e) {
    // ignore
  }
}
