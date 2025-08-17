"""
Basic FCPXML generator for DAWSheet testing.
Reads metadata.json produced by sample_export.py and generates a minimal FCPXML file
with markers and basic track references.

Usage:
  python tools/generate_fcpxml.py --in /path/to/export --out project.fcpxml

Note: This produces a stripped-down FCPXML suitable as a starting point for Logic import.
"""
import os
import json
import argparse
from xml.etree.ElementTree import Element, SubElement, tostring, ElementTree

NS = ''

def make_fcpxml(metadata, export_dir, out_path):
    # Basic template root
    root = Element('fcpxml', {'version': '1.8'})
    resources = SubElement(root, 'resources')

    # Add assets for each midi file
    for t in metadata.get('tracks', []):
        fname = t['file']
        uid = 'r_' + os.path.splitext(fname)[0]
        asset = SubElement(resources, 'asset', {
            'id': uid,
            'name': t.get('name', fname),
            'src': 'file://' + os.path.join(export_dir, fname)
        })

    # Add library/project/sequence placeholders
    library = SubElement(root, 'library')
    event = SubElement(library, 'event', {'name': 'DAWSheet Import'})
    project = SubElement(event, 'project', {'name': metadata.get('title', 'DAWSheet Project')})
    sequence = SubElement(project, 'sequence', {'format': 'FFVideoFormat720p30'})

    # Add markers
    if 'sections' in metadata:
        for sec in metadata['sections']:
            marker = SubElement(sequence, 'marker', {
                'start': str((sec.get('startBar',1)-1) * 4) + '/1s',
                'duration': '4/1s',
                'value': sec.get('name','')
            })

    # Write out
    tree = ElementTree(root)
    tree.write(out_path, encoding='utf-8', xml_declaration=True)
    print('Wrote', out_path)

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--in', dest='indir', required=True)
    p.add_argument('--out', dest='out', default='dawsheet.fcpxml')
    args = p.parse_args()
    indir = os.path.abspath(args.indir)
    meta_path = os.path.join(indir, 'metadata.json')
    if not os.path.exists(meta_path):
        print('Missing metadata.json in', indir)
        return
    with open(meta_path, 'r', encoding='utf8') as f:
        metadata = json.load(f)
    make_fcpxml(metadata, indir, os.path.abspath(args.out))

if __name__ == '__main__':
    main()
