/** Insert a 1x16 Step Grid with BYPASS toggle, resolution chip, velocity lane, and tags */
function tpl_insertStepGrid16(){
	const ss = SpreadsheetApp.getActive();
	const sh = ss.getActiveSheet();
	const start = sh.getActiveRange() || sh.getRange('A1');
	const row = start.getRow();
	const col = start.getColumn();

	// Header cells
	sh.getRange(row, col).setValue('BYPASS').setBackground(DS_COLORS.chip);
	sh.getRange(row, col+1).setValue('RES').setBackground(DS_COLORS.chip);
	sh.getRange(row, col+2, 1, 16).setValues([Array(16).fill(0)]).setBackground(DS_COLORS.cream);
	sh.getRange(row+1, col+2, 1, 16).setValues([Array(16).fill(100)]).setBackground(DS_COLORS.creamDark);

	// Tag the grid
	const gridRange = sh.getRange(row, col+2, 2, 16);
	const name = dsEnsureNamedRange_(gridRange, `STEPGRID_${row}_${col}`);
	dsTagRange_(gridRange, { kind: 'step-grid', resolution: '1/16', velocity: '100', bypass: 'false' });

	// Create a trigger record (id as name)
	const trg = te_ensureSheet_();
	trg.appendRow([name, name, JSON.stringify({ kind: 'step-grid' }), 'Step Grid 1x16']);
	return name;
}

/** Append a trigger row to the Triggers sheet and return id */
function _tpl_appendTriggerRow_(opts){
	const sh = te_ensureSheet_();
	const vals = sh.getDataRange().getValues();
	const hdr = vals.shift();
	const map = te_headerIndex_(hdr);
	const id = String(opts.name);
	const row = [];
	row[map.id] = id;
	row[map.range] = opts.rangeName;
	row[map.behavior] = JSON.stringify(opts.behavior || {});
	row[map.name] = opts.name || '';
	sh.appendRow(row.map(function(v){ return v==null? '': v; }));
	return id;
}

/** Insert 8 horizontal CC faders (0–127) with per-lane ds:* tags. */
function tpl_insertCcfaders8(){
	const sh = SpreadsheetApp.getActiveSheet();
	const anchor = sh.getActiveRange() || sh.getRange('A2');
	const r0 = anchor.getRow(), c0 = anchor.getColumn();
	const lanes = 8;

	const headerRow = Math.max(1, r0 - 1);
	const header = sh.getRange(headerRow, c0, 1, lanes + 2);
	header.clearFormat(); dsApplyCreamTheme_(header); header.setFontWeight('bold');
	sh.getRange(headerRow, c0).setValue('🎚');
	sh.getRange(headerRow, c0 + 1).setValue('CC Faders (0–127)');
	sh.getRange(headerRow, c0 + 2, 1, lanes)
		.setValues([Array.from({length:lanes}, function(_,i){return 'F'+(i+1);})])
		.setHorizontalAlignment('center');

	const faders = sh.getRange(r0, c0 + 2, 1, lanes);
	faders.setNumberFormat('0').setValues([Array.from({length:lanes}, function(){return 100;})]).setBackground('#ffffff');

	const rules = sh.getConditionalFormatRules();
	rules.push(SpreadsheetApp.newConditionalFormatRule()
		.setGradientMinpoint('#f7f3e9').setGradientMaxpoint('#2a74ff')
		.setRanges([faders]).build());
	sh.setConditionalFormatRules(rules);

	const valRule = SpreadsheetApp.newDataValidation().requireNumberBetween(0,127).build();
	faders.setDataValidation(valRule);

	for (var i=0;i<lanes;i++){
		const cell = sh.getRange(r0, c0 + 2 + i);
		const thick = (i % 2) === 0;
		cell.setBorder(true,true,true,true,false,false,'#e3dccb',
			thick ? SpreadsheetApp.BorderStyle.SOLID_THICK : SpreadsheetApp.BorderStyle.SOLID);
	}

	const fadersName = dsMakeNamedRange_('DS_CC_FADERS_8', sh, r0, c0 + 2, 1, lanes);
	dsTagRange_(faders, {
		role: 'faders',
		kind: 'fader',
		channel: '1',
		ccMap: JSON.stringify(Array.from({length:lanes}, function(_,i){return 70+i;})),
		min: '0',
		max: '127'
	});

	const behavior = { kind:'fader', channel:1, cc:74, min:0, max:127, lanes:lanes };
	const payload = { cc:74, value:100, channel:1 };
	const id = _tpl_appendTriggerRow_({
		name: fadersName, rangeName: fadersName, type: 'CC.SET', payload: payload, behavior: behavior
	});

	SpreadsheetApp.getUi().alert('Inserted CC Faders 8 at '+sh.getName()+':'+faders.getA1Notation()+'\nTrigger: '+id+'\nNamed range: '+fadersName);
}

/** Insert 8 “buttons” (drop-downs) for chord palette with ds:* tags. */
function tpl_insertChordPalette8(){
	const sh = SpreadsheetApp.getActiveSheet();
	const anchor = sh.getActiveRange() || sh.getRange('A2');
	const r0 = anchor.getRow(), c0 = anchor.getColumn();
	const slots = 8;

	const headerRow = Math.max(1, r0 - 1);
	const header = sh.getRange(headerRow, c0, 1, slots + 2);
	header.clearFormat(); dsApplyCreamTheme_(header); header.setFontWeight('bold');
	sh.getRange(headerRow, c0).setValue('🎹');
	sh.getRange(headerRow, c0 + 1).setValue('Chord Palette');

	const palette = sh.getRange(r0, c0 + 2, 1, slots);
	palette.setBackground('#ffffff').setHorizontalAlignment('center');
	const chordList = ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim', 'Cmaj7', 'G7', 'Fmaj7', 'Dm7', 'N.C.'];
	const rule = SpreadsheetApp.newDataValidation().requireValueInList(chordList, true).build();
	palette.setDataValidation(rule);
	palette.setValues([['C','Dm','Em','F','G','Am','Bdim','Cmaj7']]);

	for (var i=0;i<slots;i++){
		const cell = sh.getRange(r0, c0 + 2 + i);
		const thick = (i % 2) === 0;
		cell.setBorder(true,true,true,true,false,false,'#e3dccb',
			thick ? SpreadsheetApp.BorderStyle.SOLID_THICK : SpreadsheetApp.BorderStyle.SOLID);
	}

	const paletteName = dsMakeNamedRange_('DS_CHORD_PALETTE_8', sh, r0, c0 + 2, 1, slots);
	dsTagRange_(palette, {
		role: 'chord-surface',
		kind: 'chord-palette',
		channel: '1',
		root: 'C',
		scale: 'major',
		voicing: 'root',
		chordList: JSON.stringify(chordList)
	});

	const behavior = { kind:'chord-palette', channel:1, root:'C', scale:'major', voicing:'root', slots: slots };
	const payload = { root:'C', quality:'major', channel:1 };
	const id = _tpl_appendTriggerRow_({
		name: paletteName, rangeName: paletteName, type: 'CHORD.PLAY', payload: payload, behavior: behavior
	});

	SpreadsheetApp.getUi().alert('Inserted Chord Palette 8 at '+sh.getName()+':'+palette.getA1Notation()+'\nTrigger: '+id+'\nNamed range: '+paletteName);
}

// Step Grid inspector endpoints expected by the new UI
function te_getStepGridInspectorData(triggerId){
	const t = te_getTrigger(triggerId);
	if (!t) throw new Error('Trigger not found');
	const ss = SpreadsheetApp.getActive();
	const range = ss.getRangeByName(t.range);
	const tags = dsReadTags_(range);
	return {
		channel: Number(tags.channel || 10),
		baseNote: String(tags.baseNote || '36'),
		resolution: String(tags.resolution || '1/16'),
		durationBeats: Number(tags.durationBeats || 0.9),
		velocityDefault: Number(tags.velocity || 100),
		bypass: String(tags.bypass || 'false') === 'true'
	};
}

function te_updateStepGridInspector(triggerId, body){
	const t = te_getTrigger(triggerId);
	if (!t) throw new Error('Trigger not found');
	const ss = SpreadsheetApp.getActive();
	const range = ss.getRangeByName(t.range);
	dsTagRange_(range, {
		channel: String(body.channel),
		baseNote: String(body.baseNote),
		resolution: String(body.resolution),
		durationBeats: String(body.durationBeats),
		velocity: String(body.velocityDefault),
		bypass: String(!!body.bypass)
	});
	const sh = te_ensureSheet_();
	const vals = sh.getDataRange().getValues();
	const hdr = vals.shift();
	const map = te_headerIndex_(hdr);
	for (var r=0; r<vals.length; r++){
		if (String(vals[r][map.id]) === String(triggerId)){
			var behavior = t.behavior || {};
			behavior.kind = behavior.kind || 'grid-steps';
			sh.getRange(r+2, map.behavior+1).setValue(JSON.stringify(behavior));
			break;
		}
	}
	return 'Step Grid updated';
}

