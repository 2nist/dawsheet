#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function main() {
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();
  const cfgPath = path.join(workspace, "scripts", "apps-script.config.json");
  if (!fs.existsSync(cfgPath)) {
    console.error("Config not found:", cfgPath);
    process.exit(2);
  }
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  if (!cfg.scriptId) {
    console.error("Config missing scriptId");
    process.exit(3);
  }
  const targets = cfg.targets || [{ path: ".", rootDir: "" }];
  for (const t of targets) {
    const base = path.join(workspace, t.path);
    const claspPath = path.join(base, ".clasp.json");
    const rootDir = t.rootDir || "";
    const payload = {
      rootDir: rootDir || undefined,
      scriptId: cfg.scriptId,
      scriptExtensions: [".js", ".gs"],
      htmlExtensions: [".html"],
      jsonExtensions: [".json"],
      filePushOrder: [],
    };
    // Remove undefined keys for cleanliness
    Object.keys(payload).forEach(
      (k) => payload[k] === undefined && delete payload[k]
    );
    fs.writeFileSync(claspPath, JSON.stringify(payload, null, 2));
    console.log(
      "Wrote",
      claspPath,
      "→ scriptId",
      cfg.scriptId,
      "rootDir",
      rootDir || "(none)"
    );
  }
}

main();
