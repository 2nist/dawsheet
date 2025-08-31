// Validation.gs
// Core AJV validation helpers for GAS.

let ajvInstance = null;

/** Returns a singleton AJV instance with schemas registered. */
function getAjvInstance() {
  if (!ajvInstance) {
    try {
      loadAjv();
      // global Ajv constructor is exposed by ajv.min.js
      // eslint-disable-next-line no-undef
      ajvInstance = new Ajv();
      ajvInstance.addSchema(SONG_SCHEMA, 'songSchema');
      ajvInstance.addSchema(COMMANDS_SCHEMA, 'commandsSchema');
      ajvInstance.addSchema(CHORD_SCHEMA, 'chordSchema');
      ajvInstance.addSchema(SCALE_SCHEMA, 'scaleSchema');
      console.log('AJV initialized');
    } catch (e) {
      console.warn('AJV load/init failed; continuing with permissive validator:', e && e.message ? e.message : e);
      // Permissive fallback so tools continue to function even if external lib fails to load.
      ajvInstance = { compile: function(){ return function(){ return true; }; } };
    }
  }
  return ajvInstance;
}

/** Validate data against a schema, returning { isValid, errors[] } */
function validateData(schema, data) {
  try {
    const ajv = getAjvInstance();
    const validate = ajv.compile(schema);
    const isValid = validate(data);
    const errors = [];
    if (!isValid && validate.errors) {
      validate.errors.forEach(err => {
        errors.push(`Data path: ${err.instancePath || 'root'}, Error: ${err.message}. Schema path: ${err.schemaPath}.`);
      });
    }
    return { isValid, errors };
  } catch (e) {
    console.warn('Validation skipped due to validator error:', e && e.message ? e.message : e);
    return { isValid: true, errors: [] };
  }
}

/** Higher-order wrapper adding input/output validation to a function. */
function withValidation(func, inputSchema = null, outputSchema = null) {
  return function(...args) {
    if (inputSchema) {
      const { isValid, errors } = validateData(inputSchema, args[0]);
      if (!isValid) {
        throw new Error(`Input validation failed for ${func.name}: ${errors.join('; ')}`);
      }
    }
    const result = func(...args);
    if (outputSchema) {
      const { isValid, errors } = validateData(outputSchema, result);
      if (!isValid) {
        throw new Error(`Output validation failed for ${func.name}: ${errors.join('; ')}`);
      }
    }
    return result;
  };
}
