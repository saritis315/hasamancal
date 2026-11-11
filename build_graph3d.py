"""Rebuilds graph3d.html from graphify-out/graph.json and graph3d.template.html."""
import json
from pathlib import Path

here = Path(__file__).resolve().parent
d = json.loads((here / 'graphify-out' / 'graph.json').read_text(encoding='utf-8'))
names = {}
for n in d['nodes']:
    names[n['community']] = n.get('community_name') or f"Community {n['community']}"
order = sorted(names)
remap = {c: i for i, c in enumerate(order)}
nodes = [{'id': n['id'], 'label': n['label'], 'c': remap[n['community']], 'cn': names[n['community']],
          'file': n.get('source_file'), 'loc': n.get('source_location'), 'rat': n.get('rationale')} for n in d['nodes']]
links = [{'s': l['source'], 't': l['target'], 'rel': l.get('relation', '')} for l in d['links']]
data = {'nodes': nodes, 'links': links, 'comms': [names[c] for c in order]}
tpl = (here / 'graph3d.template.html').read_text(encoding='utf-8')
(here / 'graph3d.html').write_text(tpl.replace('/*DATA*/null', json.dumps(data, ensure_ascii=False)), encoding='utf-8')
print(len(nodes), 'nodes', len(links), 'links', len(order), 'communities')
