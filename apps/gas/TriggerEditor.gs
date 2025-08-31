/** Trigger storage & inspector helpers */

/** Ensure the Triggers sheet exists with headers (accepts 'Triggers' or 'Trigger') */
function te_ensureSheet_() {
	const ss = SpreadsheetApp.getActive();
	let sh = ss.getSheetByName('Triggers') || ss.getSheetByName('Trigger');
	if (!sh) {
		sh = ss.insertSheet('Triggers');
		sh.appendRow(['id','range','behavior','name']);
	}
	return sh;
}

/** Map sheet headers to canonical indexes: id, range, behavior, name */
function te_headerIndex_(headers){
	const idx = {};
	headers.forEach(function(h,i){
		const k = String(h||'').trim().toLowerCase();
		if (k === 'id' || k === 'triggerid' || k === 'trigger_id') idx.id = i;
		if (k === 'range' || k === 'namedrange' || k === 'range_name') idx.range = i;
		if (k === 'behavior' || k === 'behaviour' || k === 'config') idx.behavior = i;
		if (k === 'name' || k === 'label' || k === 'title') idx.name = i;
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
	for (var r=0; r<vals.length; r++){
		if (String(vals[r][map.id]) === String(id)){
			var behavior = {};
			try { behavior = JSON.parse(vals[r][map.behavior] || '{}'); } catch (e) {}
			return { id: vals[r][map.id], range: vals[r][map.range], behavior: behavior, name: vals[r][map.name] };
		}
	}
	return null;
}

/** List all triggers for UI selection */
function te_listTriggers(){
	const sh = te_ensureSheet_();
	const vals = sh.getDataRange().getValues();
	if (!vals.length) return [];
	const hdr = vals.shift();
	const map = te_headerIndex_(hdr);
	const out = [];
	for (var r=0; r<vals.length; r++){
		var behavior = {};
		try { behavior = JSON.parse(vals[r][map.behavior] || '{}'); } catch (e) {}
		out.push({ id: String(vals[r][map.id]), name: String(vals[r][map.name]||''), range: String(vals[r][map.range]||''), kind: behavior && behavior.kind || '' });
	}
	return out;
}

/** Open the Trigger Editor sidebar */
function openTriggerEditor(){
	const html = HtmlService.createHtmlOutputFromFile('TriggerEditorUI')
		.setTitle('Trigger Editor');
	SpreadsheetApp.getUi().showSidebar(html);
}

/** Inspector read for Step Grid (MVP structure) */
function te_readStepGrid(triggerId){
	const t = te_getTrigger(triggerId);
	if (!t) throw new Error('Trigger not found');
	const ss = SpreadsheetApp.getActive();
	const range = ss.getRangeByName(t.range);
	const tags = dsReadTags_(range);
	return {
		bypass: Boolean(String(tags.bypass||'false') === 'true'),
		resolution: String(tags.resolution||'1/16'),
		velocity: Number(tags.velocity||100),
		tags
	};
}

/** Inspector write for Step Grid */
function te_updateStepGrid(triggerId, body){
	const t = te_getTrigger(triggerId);
	if (!t) throw new Error('Trigger not found');
	const ss = SpreadsheetApp.getActive();
	const range = ss.getRangeByName(t.range);
	dsTagRange_(range, {
		bypass: String(Boolean(body.bypass)),
		resolution: String(body.resolution||'1/16'),
		velocity: String(body.velocity||100)
	});
	// persist behavior kind if missing
	const sh = te_ensureSheet_();
	const vals = sh.getDataRange().getValues();
	const hdr = vals.shift();
	const map = te_headerIndex_(hdr);
	for (var r=0; r<vals.length; r++){
		if (String(vals[r][map.id]) === String(triggerId)){
			var behavior = t.behavior || {};
			if (!behavior.kind) behavior.kind = 'step-grid';
			sh.getRange(r+2, map.behavior+1).setValue(JSON.stringify(behavior));
			break;
		}
	}
	return 'Step Grid updated';
}

