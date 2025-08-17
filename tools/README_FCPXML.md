DAWSheet tools: sample_export + generate_fcpxml

This small toolkit helps you create a minimal export for testing Logic integration.

Prerequisites
- Python 3.8+
- Install dependencies:

```bash
pip install -r tools/requirements.txt
```

Generate sample MIDI + metadata

```bash
python tools/sample_export.py --outdir ./export
```

This creates `export/01_Bass.mid`, `export/02_Lead.mid`, and `export/metadata.json`.

Generate an FCPXML from the metadata

```bash
python tools/generate_fcpxml.py --in ./export --out ./export/dawsheet.fcpxml
```

Import into Logic Pro
- Open Logic Pro
- File -> Import -> Final Cut Pro XML... and choose `dawsheet.fcpxml`

Notes
- The generated FCPXML is minimal and may require adjustments per Logic version. Use it as a starting point for automating project imports.
