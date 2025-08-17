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

    // Import MIDI files in directory (simple approach: open each file via Finder)
    var fm = $.NSFileManager.defaultManager;
    var dirPath = ObjC.unwrap($.NSString.stringWithUTF8String((exportDir).toString()).stringByStandardizingPath());
    var enumerator = fm.enumeratorAtPath(dirPath);
    var file;
    while ((file = enumerator.nextObject())) {
      var fname = ObjC.unwrap(file);
      if (fname.toLowerCase().endsWith('.mid') || fname.toLowerCase().endsWith('.midi')) {
        console.log('Found MIDI: ' + fname + ', import manually or extend importMidiFiles() to automate');
      }
    }

    console.log('JXA template run complete. Adapt importMidiFiles() to your Logic version for full automation.');
  } catch (e) {
    console.log('Error in JXA script: ' + e);
  }

})();
