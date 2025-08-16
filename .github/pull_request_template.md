## What changed
<!-- Succinct summary of changes. -->

## Why
<!-- Link to PRD section / issue / ADR. -->

## Screens / Demos (required for any UI/UX change)
<!-- GIFs or screenshots. Include before/after if relevant. -->

## Tests
- [ ] Unit tests added/updated
- [ ] E2E demo path described below
- [ ] Schema validation passes (no drift)
- [ ] Lints/format pass

## E2E Demo Steps
1. ...
2. ...
3. ...

## Risks / Mitigations
- Risk:
- Mitigation:

## Checklists
**Repo Hygiene**
- [ ] No generated-diff after running schema/type generation
- [ ] Updated docs/CHANGELOG

**UX Quality (if UI touched)**
- [ ] Clear empty/error states
- [ ] Keyboard shortcuts (if applicable)
- [ ] Copy tone & tooltips from schema descriptions
- [ ] ACK/NACK feedback visible

**Performance**
- [ ] No blocking calls on UI edits
- [ ] Proxy-side timing preserved (no real-time in GAS)
