#!/usr/bin/env bash
# E2E test script for macOS (Logic Pro required)
# Usage: ./tools/e2e_run_mac.sh
set -euo pipefail
OUTdir=./export
python3 tools/sample_export.py --outdir "$OUTdir"
python3 tools/generate_fcpxml.py --in "$OUTdir" --out "$OUTdir/dawsheet.fcpxml"
# Attempt to open the FCPXML in Logic
open -a "Logic Pro" "$OUTdir/dawsheet.fcpxml" || true
# Run the JXA template to set tempo and create markers
osascript -l JavaScript adapters/logic/logic-jxa.js -- "$OUTdir"

echo "E2E script finished. Check Logic for imported project and markers."
