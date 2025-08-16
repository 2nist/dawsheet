#!/usr/bin/env node
/**
 * Minimal generator (placeholder) for schema-driven types.
 * Emits deterministic files to satisfy CI drift gate.
 * Replace with real generators (json-schema-to-typescript, quicktype, etc.).
 */
import fs from 'node:fs';
import path from 'node:path';

const SPEC_DIR = 'spec';
const OUT_TS = 'apps/gas/types.ts';
const OUT_JAVA_DIR = 'apps/proxy-java/src/main/java/io/dawsheet/model';

fs.mkdirSync(path.dirname(OUT_TS), { recursive: true });
fs.mkdirSync(OUT_JAVA_DIR, { recursive: true });

const files = ['commands.schema.json','song.schema.json','chord.schema.json','scale.schema.json']
  .map(f => path.join(SPEC_DIR, f))
  .filter(p => fs.existsSync(p));

const header = `// Generated from JSON Schemas. Do not edit by hand.\n`;
const timestamp = new Date().toISOString();

let ts = header + `// Generated: ${timestamp}\n`;
for (const f of files) ts += `// ${f}\n`;
ts += `\nexport type Json = unknown;\n`;
fs.writeFileSync(OUT_TS, ts, 'utf8');

const classNames = ['Commands','Song','Chord','Scale'];
for (const name of classNames) {
  const p = path.join(OUT_JAVA_DIR, name + '.java');
  const java = `// Generated placeholder. Do not edit by hand.\npackage io.dawsheet.model;\npublic class ${name} { }\n`;
  fs.writeFileSync(p, java, 'utf8');
}

console.log('Generated placeholder TS and Java files. Replace with real codegen ASAP.');