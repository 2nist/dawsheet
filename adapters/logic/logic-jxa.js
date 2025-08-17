// JXA (JavaScript for Automation) template for Logic Pro automation
// Usage: osascript -l JavaScript logic-jxa.js -- /path/to/export_dir

(function() {
  'use strict';
  var app = Application('Logic Pro');
  var system = Application('System Events');
  var args = ObjC.unwrap($.NSProcessInfo.processInfo.arguments).slice(1);
  var exportDir = args[0] || '.';

  function activateLogic() {
    try {
      app.activate();
    } catch (e) {
      console.log('Unable to activate Logic via JXA: ' + e);
    }
    // Give Logic a moment to become frontmost
    delay(1);
  }

  function sendKeystroke(key, modifiers) {
    modifiers = modifiers || [];
    system.keyCode(key, { using: modifiers });
  }

  function setTempo(bpm) {
    // This is GUI automation and may need adjustments per Logic version.
    activateLogic();
    // Open transport tempo field: Cmd-K (example) - change if different
    system.keystroke('k', { using: ['command down'] });
    delay(0.2);
    // Type the tempo value
    system.keystroke(String(bpm));
    system.keyCode(36); // enter
    delay(0.2);
  }

  function importMidiFiles(exportDir) {
    activateLogic();
    var fm = $.NSFileManager.defaultManager;
    var path = ObjC.unwrap(fm.fileSystemRepresentationForPath(exportDir));
    // Use GUI menus: File -> Import -> MIDI File...
    system.keystroke('i', { using: ['command down', 'shift down'] }); // example; may differ
    delay(0.5);
    // NOTE: Because Logic's "Import" dialog is not scriptable via JXA reliably across versions,
    // we open the Finder and simulate opening files: select the file(s) and press Enter.
    // This portion should be adapted to the user's system.
  }

  function importFcpxml(fcpxmlPath) {
    activateLogic();
    try {
      // First attempt: ask Logic to open the FCPXML directly
      var fcpx = Path(fcpxmlPath);
      try {
        app.open(fcpx);
        console.log('Invoked app.open for FCPXML: ' + fcpxmlPath);
        delay(1);
        return true;
      } catch (e) {
        console.log('app.open failed, will fallback to shell open: ' + e);
      }

      // Fallback: use shell to open FCPXML with Logic
      var cmd = 'open -a "Logic Pro" ' + fcpxmlPath.replace(/'/g, "'\\''");
      console.log('Running shell command: ' + cmd);
      var sh = $.NSTask.alloc.init;
      sh.init();
      // Use simpler approach: call /usr/bin/open via do shell script
      var doShell = Application('System Events');
      doShell.doShellScript = doShell.doShellScript || function(c) { return Application('Finder').doShellScript(c); };
      try {
        // Try using the Objective-C bridge to run shell command
        ObjC.import('stdlib');
        $.system(cmd);
      } catch (err) {
        // As a safer fallback, use AppleScript via osascript
        console.log('Fallback shell execution failed: ' + err + '. Please open the FCPXML manually.');
        return false;
      }
      delay(1);
      return true;
    } catch (err) {
      console.log('Error during FCPXML import: ' + err);
      return false;
    }
  }

  // end importFcpxml
  function createMarker(name, bar) {
    activateLogic();
    // Open Marker List (window/menu navigation may differ)
    // The robust approach is to use key commands to create a marker at playhead
    system.keyCode(115); // home
    delay(0.1);
    // Move playhead to bar (this requires bar-to-time mapping; the template uses a placeholder)
    // Create marker (Logic's default key might be Option-') adjust as needed
    system.keyCode(39, { using: ['option down'] }); // placeholder
    delay(0.1);
    // Type name
    system.keystroke(name);
    system.keyCode(36); // enter
  }

  function jumpToMarker(markerName) {
    activateLogic();
    // Use the marker list or key navigation; implementation depends on project config
    console.log('jumpToMarker() needs project-specific mapping. Use marker list navigation or set playhead via bar offsets.');
  }

  function play() {
    activateLogic();
    system.keyCode(49); // spacebar
  }

  function stop() {
    activateLogic();
    system.keyCode(49); // spacebar
  }

  function record() {
    activateLogic();
    system.keystroke('r');
  }

  // Entry: read metadata.json if present and import midi + create markers
  try {
    var metadataPath = ObjC.unwrap($.NSString.stringWithUTF8String((exportDir + '/metadata.json').toString()).stringByStandardizingPath());
    var metadata = null;
    if ($.NSFileManager.defaultManager.fileExistsAtPath(metadataPath)) {
      var data = $.NSFileManager.defaultManager.contentsAtPath(metadataPath);
      var str = ObjC.unwrap($.NSString.alloc.initWithDataEncoding(data, $.NSUTF8StringEncoding));
      metadata = JSON.parse(str);
    }

    if (metadata && metadata.tempo) {
      console.log('Setting tempo to ' + metadata.tempo);
      setTempo(metadata.tempo);
    }

    if (metadata && metadata.sections && metadata.sections.length) {
      metadata.sections.forEach(function(s, idx) {
        console.log('Creating marker: ' + s.name + ' at bar ' + s.startBar);
        createMarker(s.name, s.startBar);
      });
    }
    // Attempt to import generated FCPXML if present
    var fcpxPath = exportDir + '/dawsheet.fcpxml';
    if ($.NSFileManager.defaultManager.fileExistsAtPath(fcpxPath)) {
      console.log('Found FCPXML at ' + fcpxPath + ', attempting import...');
      var ok = importFcpxml(fcpxPath);
      if (!ok) console.log('Automatic FCPXML import failed; please import manually via File → Import → Final Cut Pro XML...');
    } else {
      console.log('No FCPXML found; import MIDI manually or generate FCPXML using tools/generate_fcpxml.py');
    }

    console.log('JXA template run complete.');
  } catch (e) {
    console.log('Error in JXA script: ' + e);
  }

})();
