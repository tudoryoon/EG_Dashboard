"""Extract the user-supplied scorecard, excluding Claude's authenticated frame runtime."""
import argparse
import hashlib
import json
import re
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
SOURCE_URL = 'https://claude.ai/code/artifact/76bae242-11c2-4615-8a97-bb6655301a0c'


def parse_data(declaration):
    text = declaration.strip().removeprefix('const DATA=').strip()
    if not text.startswith('{'):
        raise ValueError('Unexpected DATA declaration')
    decoder = json.JSONDecoder()
    position, payload = 1, {}
    while True:
        key = re.match(r'\s*(us|kr|cn)\s*:\s*', text[position:])
        if not key:
            raise ValueError('Unexpected market key')
        if key[1] in payload:
            raise ValueError('Duplicate market key')
        position += key.end()
        payload[key[1]], position = decoder.raw_decode(text, position)
        suffix = text[position:].lstrip()
        position = len(text) - len(suffix)
        if suffix.startswith('}'):
            if suffix[1:].strip() != ';' or set(payload) != {'us', 'kr', 'cn'}:
                raise ValueError('Unexpected code after DATA')
            return payload
        if not suffix.startswith(','):
            raise ValueError('Missing market separator')
        position += 1


def extract(source):
    soup = BeautifulSoup(source, 'html.parser')
    scripts = [tag.get_text() for tag in soup.find_all('script') if tag.get_text().lstrip().startswith('const DATA=')]
    if len(scripts) != 1:
        raise ValueError('Expected one scorecard application script')
    declaration, marker, renderer = scripts[0].partition('\nconst SPEC6=')
    if not marker:
        raise ValueError('Missing scorecard renderer')
    payload = parse_data(declaration)
    renderer = 'const SPEC6=' + renderer.strip()
    renderer = '\n'.join(line.rstrip() for line in renderer.splitlines())
    if re.search(r'__FRAME_|claude\.|fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|eval\s*\(|import\s*\(', renderer):
        raise ValueError('Unexpected host runtime or network code in renderer')
    styles = [tag.get_text() for tag in soup.find_all('style') if '--us-soft' in tag.get_text()]
    if len(styles) != 1:
        raise ValueError('Expected one scorecard stylesheet')
    wrap, tip = soup.select_one('.wrap'), soup.select_one('#tip')
    if wrap is None or tip is None or wrap.find('script'):
        raise ValueError('Unexpected scorecard markup')
    for tag in wrap.find_all(True):
        if any(key.lower().startswith('on') for key in tag.attrs):
            raise ValueError('Inline event handler in markup')
    return payload, styles[0], str(wrap) + '\n' + str(tip), renderer


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    args = parser.parse_args()
    source = args.source.read_text(encoding='utf-8')
    payload, css, body, renderer = extract(source)
    target = ROOT / 'study' / 'market-regime'
    target.mkdir(parents=True, exist_ok=True)
    # Snapshot data is preserved; collection and backtest programs were not supplied.
    (target / 'snapshot.js').write_text('const DATA=' + json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    (target / 'scorecard.js').write_text(renderer + '\n', encoding='utf-8')
    (target / 'scorecard.css').write_text(css.strip() + '\n', encoding='utf-8')
    html = '''<!doctype html>
<html lang="ko" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'">
<title>시장 국면 스코어카드 | EG Dashboard</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&amp;family=IBM+Plex+Sans+KR:wght@300;400;500;600;700&amp;display=swap">
<link rel="stylesheet" href="./scorecard.css?v=20260910-1">
<link rel="stylesheet" href="./integration.css?v=20260910-1">
</head>
<body>
'''
    html += body + '\n<script src="./snapshot.js?v=20260910-1"></script>\n<script src="./scorecard.js?v=20260910-1"></script>\n<script src="./integration.js?v=20260910-1"></script>\n</body>\n</html>\n'
    (target / 'index.html').write_text(html, encoding='utf-8')
    metadata = {
        'title': '시장 국면 스코어카드', 'sourceUrl': SOURCE_URL,
        'mode': 'source-snapshot', 'automaticRefresh': False,
        'markets': {key: {'asOf': value['asof'], 'generatedAt': value['generated_at'], 'historyRows': len(value['history']), 'universeCount': value['n_universe']} for key, value in payload.items()},
        'snapshotSha256': hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode()).hexdigest(),
        'note': 'Original display code and stored results; source collection and backtest code were not included. Claude authentication and frame runtime are excluded.',
    }
    (target / 'provenance.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(metadata['markets'], ensure_ascii=False))


if __name__ == '__main__':
    main()
