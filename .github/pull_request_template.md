## Summary

Briefly describe what this PR changes and why.

## Changes

-

## Why

<!-- Link to PRD section / issue / ADR. -->

## How to test

- Activate venv and install deps: `pip install -r requirements.txt`
- Run tests: `pytest -q`
- Optional: Run web app: `uvicorn webapp.backend.server:app --port 8000 --reload`

## Screens / Demos (required for any UI/UX change)

<!-- GIFs or screenshots. Include before/after if relevant. -->

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
- [ ] Docs updated (README/PLAN as needed)
- [ ] No secrets committed (config files/keys ignored)

**Tests & Quality**

- [ ] Unit tests added/updated
- [ ] Schema validation passes (no drift)
- [ ] Lints/format pass

**UX Quality (if UI touched)**

- [ ] Clear empty/error states
- [ ] Keyboard shortcuts (if applicable)
- [ ] Copy tone & tooltips from schema descriptions
- [ ] ACK/NACK feedback visible

**Performance**

- [ ] No blocking calls on UI edits
- [ ] Proxy-side timing preserved (no real-time in GAS)
