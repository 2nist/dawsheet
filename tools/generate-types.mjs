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


import { compileFromFile } from 'json-schema-to-typescript';

import { execSync } from 'node:child_process';

async function generateTypes() {
  // TypeScript generation
  let ts = '// Generated from JSON Schemas. Do not edit by hand.\n';
  ts += `// Generated: ${new Date().toISOString()}\n`;
  for (const f of files) {
    ts += `// ${f}\n`;
    ts += await compileFromFile(f, { bannerComment: '' });
    ts += '\n';
  }
  fs.writeFileSync(OUT_TS, ts, 'utf8');

  // Java generation (via CLI)
  for (const f of files) {
    const schemaName = path.basename(f, '.schema.json');
    const outPath = path.join(OUT_JAVA_DIR, `${schemaName.charAt(0).toUpperCase() + schemaName.slice(1)}.java`);
    execSync(`npx quicktype --lang java --package io.dawsheet.model --top-level ${schemaName.charAt(0).toUpperCase() + schemaName.slice(1)} -o "${outPath}" "${f}"`, { stdio: 'inherit' });
  }
  console.log('Generated TypeScript and Java files from JSON Schemas.');
}

generateTypes();