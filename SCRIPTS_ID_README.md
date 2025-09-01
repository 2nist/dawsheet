Apps Script ID: single source of truth

- The canonical ID now lives in `scripts/apps-script.config.json` as `scriptId`.
- Sync `.clasp.json` files with: `npm run gas:clasp:sync`.
- Show the current ID: `npm run gas:id:show`.
- Set/update the ID: `SCRIPT_ID=... npm run gas:id:set` then `npm run gas:clasp:sync`.

Targets

- Defined under `targets` in the config. Default includes the repo root with `rootDir: gsheets`.
- Add `{ "path": "apps/gas", "rootDir": "" }` to keep an `apps/gas/.clasp.json` in sync, if you use that folder.

CI

- If CI writes a `.clasp.json`, point it at `secrets.SCRIPT_ID` that matches this config to avoid drift.
