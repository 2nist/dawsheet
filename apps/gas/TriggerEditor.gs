/** Trigger Editor server-side helpers */

function showUiTriggerEditor() {
  const html = HtmlService.createHtmlOutputFromFile("UiTriggerEditor")
    .setTitle("Trigger Editor")
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

function pickActiveRangeA1() {
  const ss = SpreadsheetApp.getActive();
  const sel = ss.getActiveRange();
  return sel ? sel.getA1Notation() : "";
}

function insertStepGrid(a1, rows, cols, target, channel) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getActiveSheet();
  const range = sh.getRange(a1).offset(0, 0, rows, cols);
  // insert checkboxes
  range.insertCheckboxes();
  // set borders
  range.setBorder(true, true, true, true, true, true);
  // create named range
  const name = "StepGrid_" + Utilities.getUuid().replace(/-/g, "").slice(0, 8);
  ss.setNamedRange(name, range);
  // fill defaults (empty formula placeholders)
  range.setValues(Array(rows).fill(Array(cols).fill(false)));
  return { ok: true, name: name, rows: rows, cols: cols };
}

function validateTriggers() {
  const ss = SpreadsheetApp.getActive();
  const named = ss.getNamedRanges();
  const issues = [];
  named.forEach(function (nr) {
    const n = nr.getName();
    if (n.indexOf("StepGrid_") === 0) {
      const r = nr.getRange();
      // check that range has checkboxes
      try {
        const rule = r.getDataValidations();
        // quick heuristic: ensure values are boolean when read
        const vals = r.getValues();
        for (let i = 0; i < vals.length; i++) {
          for (let j = 0; j < vals[0].length; j++) {
            const v = vals[i][j];
            if (typeof v !== "boolean") {
              issues.push({
                sheet: r.getSheet().getName(),
                range: r.getA1Notation(),
                msg: "non-boolean cell in StepGrid",
              });
              i = vals.length;
              break;
            }
          }
        }
      } catch (e) {
        issues.push({
          sheet: r.getSheet().getName(),
          range: r.getA1Notation(),
          msg: "error reading range: " + e,
        });
      }
    }
  });
  // write diagnostics
  let diag = ss.getSheetByName("Trigger_Diagnostics");
  if (!diag) diag = ss.insertSheet("Trigger_Diagnostics");
  diag.clear();
  diag.appendRow(["Sheet", "Range", "Issue"]);
  issues.forEach(function (i) {
    diag.appendRow([i.sheet, i.range, i.msg]);
  });
  return { ok: true, count: issues.length };
}

function readAliasRegistry() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName("AliasRegistry");
  if (!sh) return [];
  const rows = sh.getDataRange().getValues();
  const hdr = rows.shift();
  return rows.map(function (r) {
    const o = {};
    hdr.forEach(function (h, i) {
      o[h] = r[i];
    });
    return o;
  });
}

function coerceAlias(value, type) {
  const reg = readAliasRegistry();
  for (const r of reg) {
    if (String(r.Alias) === String(value))
      return { ok: true, value: r.Value, meta: r };
  }
  return { ok: false, value: value };
}
/** Trigger storage & inspector helpers */

/** Ensure the Triggers sheet exists with headers (accepts 'Triggers' or 'Trigger') */
function te_ensureSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName("Triggers") || ss.getSheetByName("Trigger");
  if (!sh) {
    sh = ss.insertSheet("Triggers");
    sh.appendRow(["id", "range", "behavior", "name"]);
  }
  return sh;
}

/** Map sheet headers to canonical indexes: id, range, behavior, name */
function te_headerIndex_(headers) {
  const idx = {};
  headers.forEach(function (h, i) {
    const k = String(h || "")
      .trim()
      .toLowerCase();
    if (k === "id" || k === "triggerid" || k === "trigger_id") idx.id = i;
    if (k === "range" || k === "namedrange" || k === "range_name")
      idx.range = i;
    if (k === "behavior" || k === "behaviour" || k === "config")
      idx.behavior = i;
    if (k === "name" || k === "label" || k === "title") idx.name = i;
  });
  // sensible defaults if missing
  if (idx.id == null) idx.id = 0;
  if (idx.range == null) idx.range = 1;
  if (idx.behavior == null) idx.behavior = 2;
  if (idx.name == null) idx.name = 3;
  return idx;
}

/** Get a trigger object by id */
function te_getTrigger(id) {
  const sh = te_ensureSheet_();
  const vals = sh.getDataRange().getValues();
  if (!vals.length) return null;
  const hdr = vals.shift();
  const map = te_headerIndex_(hdr);
  for (var r = 0; r < vals.length; r++) {
    if (String(vals[r][map.id]) === String(id)) {
      var behavior = {};
      try {
        behavior = JSON.parse(vals[r][map.behavior] || "{}");
      } catch (e) {}
      return {
        id: vals[r][map.id],
        range: vals[r][map.range],
        behavior: behavior,
        name: vals[r][map.name],
      };
    }
  }
  return null;
}

/** List all triggers for UI selection */
function te_listTriggers() {
  const sh = te_ensureSheet_();
  const vals = sh.getDataRange().getValues();
  if (!vals.length) return [];
  const hdr = vals.shift();
  const map = te_headerIndex_(hdr);
  const out = [];
  for (var r = 0; r < vals.length; r++) {
    var behavior = {};
    try {
      behavior = JSON.parse(vals[r][map.behavior] || "{}");
    } catch (e) {}
    out.push({
      id: String(vals[r][map.id]),
      name: String(vals[r][map.name] || ""),
      range: String(vals[r][map.range] || ""),
      kind: (behavior && behavior.kind) || "",
    });
  }
  return out;
}

/** Open the Trigger Editor sidebar */
function openTriggerEditor() {
  const html =
    HtmlService.createHtmlOutputFromFile("TriggerEditorUI").setTitle(
      "Trigger Editor"
    );
  SpreadsheetApp.getUi().showSidebar(html);
}

/** Inspector read for Step Grid (MVP structure) */
function te_readStepGrid(triggerId) {
  const t = te_getTrigger(triggerId);
  if (!t) throw new Error("Trigger not found");
  const ss = SpreadsheetApp.getActive();
  const range = ss.getRangeByName(t.range);
  const tags = dsReadTags_(range);
  return {
    bypass: Boolean(String(tags.bypass || "false") === "true"),
    resolution: String(tags.resolution || "1/16"),
    velocity: Number(tags.velocity || 100),
    tags,
  };
}

/** Inspector write for Step Grid */
function te_updateStepGrid(triggerId, body) {
  const t = te_getTrigger(triggerId);
  if (!t) throw new Error("Trigger not found");
  const ss = SpreadsheetApp.getActive();
  const range = ss.getRangeByName(t.range);
  dsTagRange_(range, {
    bypass: String(Boolean(body.bypass)),
    resolution: String(body.resolution || "1/16"),
    velocity: String(body.velocity || 100),
  });
  // persist behavior kind if missing
  const sh = te_ensureSheet_();
  const vals = sh.getDataRange().getValues();
  const hdr = vals.shift();
  const map = te_headerIndex_(hdr);
  for (var r = 0; r < vals.length; r++) {
    if (String(vals[r][map.id]) === String(triggerId)) {
      var behavior = t.behavior || {};
      if (!behavior.kind) behavior.kind = "step-grid";
      sh.getRange(r + 2, map.behavior + 1).setValue(JSON.stringify(behavior));
      break;
    }
  }
  return "Step Grid updated";
}
