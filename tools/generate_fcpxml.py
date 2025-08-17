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
from xml.etree.ElementTree import Element, SubElement, ElementTree


def seconds_for_bar(start_bar, tempo, beats_per_bar=4):
    # start_bar is 1-based
    beats_before = (start_bar - 1) * beats_per_bar
    seconds = beats_before * 60.0 / tempo
    return seconds


def make_fcpxml(metadata, export_dir, out_path):
    # Create a richer FCPXML with resources, assets, sequence, spine, asset-clips and markers
    root = Element('fcpxml', {'version': '1.8'})
    resources = SubElement(root, 'resources')

    assets = {}
    for idx, t in enumerate(metadata.get('tracks', []), start=1):
        fname = t['file']
        uid = f'r_track{idx}'
        assets[fname] = uid
        src = 'file://' + os.path.join(export_dir, fname)
        SubElement(resources, 'asset', {
            'id': uid,
            'name': t.get('name', fname),
            'src': src,
            'start': '0s'
        })

    # Library / event / project / sequence
    library = SubElement(root, 'library')
    event = SubElement(library, 'event', {'name': 'DAWSheet Import'})
    project = SubElement(event, 'project', {'name': metadata.get('title', 'DAWSheet Project')})
    sequence = SubElement(project, 'sequence', {'format': 'FFVideoFormat720p30'})

<<<<<<< HEAD
    # Add markers
    if 'sections' in metadata:
        for sec in metadata['sections']:
            marker = SubElement(sequence, 'marker', {
                'start': str((sec.get('startBar',1)-1) * 4) + '/1s',
                'duration': '4/1s',
                'value': sec.get('name','')
            })

    # Write out
=======
    # Build spine which will hold asset-clips and markers
    library = SubElement(root, 'library')
    event = SubElement(library, 'event', {'name': 'DAWSheet Import'})
    project = SubElement(event, 'project', {'name': metadata.get('title', 'DAWSheet Project')})
    sequence = SubElement(project, 'sequence', {'format': 'FFVideoFormat720p30'})

    # Build spine which will hold asset-clips and markers
    spine = SubElement(sequence, 'spine')

    tempo = metadata.get('tempo', 120)
    # Decide total duration based on last section or tracks lengths
    total_seconds = 0.0
    if 'sections' in metadata and metadata['sections']:
        last = metadata['sections'][-1]
        # assume section lasts 4 bars by default
        total_seconds = seconds_for_bar(last.get('startBar', 1), tempo) + (4 * 60.0 / tempo)
    else:
        # fallback to 60s
        total_seconds = 60.0

    # Add asset-clips: each MIDI file becomes an asset-clip starting at 0
    for idx, t in enumerate(metadata.get('tracks', []), start=1):
        fname = t['file']
        uid = assets.get(fname)
        if not uid:
            continue
        clip = SubElement(spine, 'asset-clip', {
            'name': t.get('name', fname),
            'offset': '0s',
            'ref': uid,
            'start': '0s',
            'duration': f'{total_seconds}s'
        })

    # Add markers for sections using start times derived from bars
    if 'sections' in metadata:
        for sec in metadata['sections']:
            start_s = seconds_for_bar(sec.get('startBar', 1), tempo)
            # default marker duration 1 beat
            dur_s = 60.0 / tempo
            SubElement(spine, 'marker', {
                'start': f'{start_s}s',
                'duration': f'{dur_s}s',
                'value': sec.get('name', '')
            })

    # Write XML
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
