# DAWSheet Agent Implementation Guide

## Role Definitions

### GitHub/VSCode Agent (Core Development)
**Primary Focus**: MIDI/Timeline Control Core + System Infrastructure

**Core Responsibilities**:
- Schema implementation and validation
- Java/Node.js proxy development for real-time MIDI/OSC execution
- Google Apps Script development for Sheets integration
- Command processing and transformation pipelines
- WebSocket and Pub/Sub integration
- Testing framework and CI/CD

**Key Deliverables**:
- `/spec/commands.schema.json` (validated and tested)
- `/apps/proxy-java` (real-time bridge) 
- `/apps/gas` (CLASP scripts + UI sidebars)
- Command processing pipelines with transforms
- Grid/Timeline view for triggering commands
- Hot reload from Sheets → Proxy

### Gemini Agent (Song Library & Theory)
**Primary Focus**: Song Library + Music Theory Integration

**Core Responsibilities**:
- Song schema design and implementation
- Music theory utilities (chord/scale detection, transposition)
- Song Library and Section Sheet management
- Theory-aware features and progression suggestions
- Integration hooks between Song Library and MIDI Core
- Arrangement → Timeline conversion

**Key Deliverables**:
- `/spec/song.schema.json` (comprehensive music object model)
- Song Library Sheet templates and UI
- Theory sidebar tools
- "Send to Timeline" conversion logic
- Song data → DAWSheet command mapping
- Cross-song analysis and search

### ChatGPT Agent (Orchestrator)
**Primary Focus**: Integration + Documentation + Project Management

**Core Responsibilities**:
- Schema compatibility and unification
- Integration testing between Core and Library modules
- Documentation maintenance and updates
- Task coordination between development agents
- Code review and architectural decisions
- Release management and version control

## Shared Schema Architecture

Both agents must implement and maintain compatibility with:

### Command Envelope v1 (`commands.schema.json`)
```json
{
  "v": 1,
  "type": "NOTE.PLAY|CHORD.PLAY|CC.SET|...",
  "id": "unique_identifier",
  "origin": "sheets://SheetName!CellRef",
  "at": "now|bar:beat|ISO-datetime", 
  "quantize": "off|1/4|1/8|1/16|bar",
  "target": "device_or_route_id",
  "payload": { /* type-specific data */ },
  "transform": [{ /* processing ops */ }],
  "meta": { "songId": "...", "tags": [...] }
}
```

### Song Object v1 (`song.schema.json`)
```json
{
  "v": 1,
  "meta": { "title": "...", "bpm": 120, "key": "C" },
  "sections": [{ "name": "Verse", "chords": [...] }],
  "arrangement": [{ "section": "Verse", "start_bar": 1 }],
  "commands_ref": ["scene:intro", "macro:buildA"]
}
```

## Integration Points

### Core → Library Integration
- Commands can reference `meta.songId` to link to Song objects
- Timeline arrangements export to Command sequences
- Song sections generate CHORD.PLAY and NOTE.PLAY commands
- Theory tools suggest progressions that map to Commands

### Library → Core Integration  
- "Send to Timeline" converts Song arrangements to Command JSON
- Song metadata influences Command transforms (key, tempo, etc.)
- Section changes trigger scene/macro commands
- Live set management organizes Commands by Song context

## Development Workflow

### Phase 1: MVP Foundation (Current)
1. **Core Agent**: Complete basic Command schema + Java proxy
2. **Library Agent**: Draft Song schema + basic theory tools  
3. **Orchestrator**: Validate schema compatibility

### Phase 2: Integration
1. **Core Agent**: Implement Song-aware Command processing
2. **Library Agent**: Build "Send to Timeline" conversion
3. **Orchestrator**: End-to-end testing and documentation

### Phase 3: Enhancement
1. **Core Agent**: Advanced transforms and DAW adapters
2. **Library Agent**: AI-assisted songwriting and analysis
3. **Orchestrator**: Performance optimization and scaling

## Success Metrics
- Schema compatibility maintained across all changes
- Song → Timeline conversion in <5 seconds
- MIDI command execution with <50ms latency
- Theory detection accuracy ≥90% for common tonal music
- Users can create song + arrangement + mapped timeline in <15 minutes

## Communication Protocol
- All schema changes require Orchestrator review
- Integration points must be tested by both Core and Library agents
- Documentation updates required for any public API changes
- Version bumps coordinated across all modules