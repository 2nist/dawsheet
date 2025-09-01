// SongSchemas.gs
// Minimal JSON schema constants and a lightweight validator stub.

/** Schema for the Song object (trimmed to required fields for lightweight checks). */
var SONG_SCHEMA = {
  required: ["v", "songId", "meta", "sections", "arrangement"],
};

/** Schema for the Commands envelope (not enforced here; kept for parity). */
var COMMANDS_SCHEMA = {
  required: ["v", "type", "id", "origin", "at", "target", "payload"],
};

/**
 * Lightweight validator used in GAS without external libraries.
 * Returns isValid=true if all top-level required keys exist. Detailed validation is deferred.
 */
function validateData(schema, obj) {
  try {
    if (!schema || !schema.required) return { isValid: true, errors: [] };
    var missing = [];
    schema.required.forEach(function (k) {
      if (!(k in obj)) missing.push(k);
    });
    return {
      isValid: missing.length === 0,
      errors: missing.length ? ["Missing: " + missing.join(", ")] : [],
    };
  } catch (e) {
    return { isValid: false, errors: [String((e && e.message) || e)] };
  }
}
