#!/usr/bin/env python3
"""Import the official CAIXA workbook, validate every draw, and cross-check the API.

Only Python's standard library is required. A failed import preserves the snapshot.
"""
import concurrent.futures
import datetime as dt
import hashlib
import io
import json
import math
import os
from pathlib import Path
import re
import shutil
import tempfile
import time
import urllib.parse
import urllib.request
import zipfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
PARAMS_URL = 'https://loterias.caixa.gov.br/Style%20Library/json/params.txt'
RULES_URL = 'https://loterias.caixa.gov.br/Paginas/Mega-Sena.aspx'
NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def download(url):
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'LoteriaLab/1.0 (historical-data-validation)', 'Accept': '*/*'})
            with urllib.request.urlopen(request, timeout=30) as response:
                data = response.read(15 * 1024 * 1024 + 1)
                if len(data) > 15 * 1024 * 1024:
                    raise ValueError('Official response exceeds the size limit')
                return data
        except Exception:
            if attempt == 2:
                raise
            time.sleep(1 + attempt)


def iso_date(value):
    if re.fullmatch(r'\d+(\.\d+)?', str(value)):
        return (dt.datetime(1899, 12, 30) + dt.timedelta(days=float(value))).date().isoformat()
    return dt.datetime.strptime(value, '%d/%m/%Y').date().isoformat()


def money(value):
    if value is None or str(value).strip() in ('', '-'):
        return None
    text = str(value).replace('R$', '').replace('\u00a0', '').strip()
    if ',' in text:
        text = text.replace('.', '').replace(',', '.')
    return float(text)


def from_api(raw):
    prizes = {str(item['faixa']): item for item in raw['listaRateioPremio']}
    if any(str(i) not in prizes for i in (1, 2, 3)):
        raise ValueError('Official API prize levels are incomplete')

    def integer(value):
        if isinstance(value, bool) or not isinstance(value, (int, str)) or not re.fullmatch(r'\d+', str(value)):
            raise ValueError('Official API integer field is invalid')
        return int(value)

    return {
        'contest': integer(raw['numero']), 'date': iso_date(raw['dataApuracao']),
        'numbers': sorted(integer(n) for n in raw['listaDezenas']),
        'winners': [integer(prizes[str(i)]['numeroDeGanhadores']) for i in (1, 2, 3)],
        'prizes': [money(prizes[str(i)]['valorPremio']) for i in (1, 2, 3)],
    }


def parse_workbook(data):
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        if sum(info.file_size for info in archive.infolist()) > 40 * 1024 * 1024:
            raise ValueError('Workbook expands beyond the size limit')
        strings = []
        if 'xl/sharedStrings.xml' in archive.namelist():
            strings = [''.join(si.itertext()) for si in ET.fromstring(archive.read('xl/sharedStrings.xml')).findall('m:si', NS)]
        rows = ET.fromstring(archive.read('xl/worksheets/sheet1.xml')).findall('.//m:sheetData/m:row', NS)
        parsed = []
        for row in rows:
            values = []
            for cell in row.findall('m:c', NS):
                # Support both sparse Excel cells and CAIXA's cells without refs.
                ref = cell.get('r')
                if ref:
                    letters = re.match(r'[A-Z]+', ref).group()
                    column = 0
                    for letter in letters:
                        column = column * 26 + ord(letter) - 64
                    values.extend([None] * max(0, column - 1 - len(values)))
                value = cell.find('m:v', NS)
                text = value.text if value is not None else None
                if cell.get('t') == 's' and text is not None:
                    text = strings[int(text)]
                elif cell.get('t') == 'inlineStr':
                    text = ''.join(cell.find('m:is', NS).itertext())
                values.append(text)
            parsed.append(values)
    headers = parsed[0]
    required = ['Concurso', 'Data do Sorteio', *[f'Bola{i}' for i in range(1, 7)], 'Ganhadores 6 acertos', 'Rateio 6 acertos', 'Ganhadores 5 acertos', 'Rateio 5 acertos', 'Ganhadores 4 acertos', 'Rateio 4 acertos']
    if not all(h in headers for h in required):
        raise ValueError('Official workbook schema changed; import stopped')
    draws = []
    for values in parsed[1:]:
        if not any(v is not None and str(v).strip() for v in values):
            continue
        row = dict(zip(headers, values))
        draws.append({
            'contest': int(row['Concurso']), 'date': iso_date(row['Data do Sorteio']),
            'numbers': sorted(int(row[f'Bola{i}']) for i in range(1, 7)),
            'winners': [int(row[f'Ganhadores {i} acertos']) for i in (6, 5, 4)],
            'prizes': [money(row[f'Rateio {i} acertos']) for i in (6, 5, 4)],
        })
    return sorted(draws, key=lambda draw: draw['contest'])


def validate(draws):
    if not draws:
        raise ValueError('No draws in the official workbook')
    previous_date = ''
    for expected, draw in enumerate(draws, 1):
        if draw['contest'] != expected:
            raise ValueError(f'Duplicate or missing contest around {expected}')
        numbers = draw['numbers']
        if len(numbers) != 6 or len(set(numbers)) != 6 or any(type(n) is not int or not 1 <= n <= 60 for n in numbers):
            raise ValueError(f'Invalid numbers for contest {expected}')
        if dt.date.fromisoformat(draw['date']).isoformat() != draw['date']:
            raise ValueError(f'Invalid date for contest {expected}')
        if draw['date'] < previous_date or draw['date'] > dt.datetime.now(dt.timezone.utc).date().isoformat():
            raise ValueError(f'Invalid chronology for contest {expected}')
        if len(draw['winners']) != 3 or len(draw['prizes']) != 3 or any(type(n) is not int or n < 0 for n in draw['winners']) or any(n is not None and (not math.isfinite(n) or n < 0) for n in draw['prizes']):
            raise ValueError(f'Invalid prize data for contest {expected}')
        previous_date = draw['date']


def atomic_write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as file:
        temporary = file.name
        file.write(content)
        file.flush()
        os.fsync(file.fileno())
    os.replace(temporary, path)
    directory = os.open(path.parent, os.O_RDONLY)
    try:
        os.fsync(directory)
    finally:
        os.close(directory)



def recover_pair(root=ROOT):
    """Finish a previously journaled pair before beginning another import."""
    stage = root / 'data/.import-staging'
    journal = stage / 'journal.json'
    if not journal.exists():
        return
    metadata = json.loads(journal.read_text())
    payloads = {name: (stage / name).read_bytes() for name in ('snapshot', 'archive')}
    if any(hashlib.sha256(payloads[name]).hexdigest() != metadata[name] for name in payloads):
        raise ValueError('Staged import is corrupt; preserve the journal for recovery')
    for name, target in [('snapshot', root / 'data/megasena.json'),
                         ('archive', root / 'data/source/megasena.xlsx')]:
        atomic_write(target, payloads[name])
    journal.unlink()
    shutil.rmtree(stage)


def commit_pair(snapshot, archive, root=ROOT):
    recover_pair(root)
    stage = root / 'data/.import-staging'
    stage.mkdir(parents=True, exist_ok=True)
    atomic_write(stage / 'snapshot', snapshot)
    atomic_write(stage / 'archive', archive)
    # Retain both previous files until the new pair is fully recovered. A
    # damaged staged payload or repeated replacement failure remains repairable.
    previous = [root / 'data/megasena.json', root / 'data/source/megasena.xlsx']
    if previous[0].exists() != previous[1].exists():
        raise ValueError('Existing dataset pair is incomplete; repair before import')
    if previous[0].exists():
        atomic_write(stage / 'previous-snapshot', previous[0].read_bytes())
        atomic_write(stage / 'previous-archive', previous[1].read_bytes())
    metadata = {name: hashlib.sha256(content).hexdigest()
                for name, content in [('snapshot', snapshot), ('archive', archive)]}
    # Journal is published only after both staged payloads exist. Recovery rolls
    # forward idempotently if a process stops between either replacement.
    atomic_write(stage / 'journal.json', json.dumps(metadata).encode())
    recover_pair(root)

def main():
    recover_pair()
    config = json.loads(download(PARAMS_URL).decode('utf-8-sig'))
    base = config['urlapiloterias'].rstrip('/')
    parsed_url = urllib.parse.urlparse(base)
    if parsed_url.scheme != 'https' or not (parsed_url.hostname or '').endswith('.caixa.gov.br'):
        raise ValueError('The API must be on an official HTTPS CAIXA domain')
    api = base + '/api/megasena'
    archive_url = base + '/api/resultados/download?modalidade=Mega-Sena'
    raw_archive = download(archive_url)
    draws = parse_workbook(raw_archive)
    validate(draws)
    archive_through = draws[-1]['contest']
    latest = json.loads(download(api))
    latest_contest = int(latest['numero'])
    if not archive_through <= latest_contest <= archive_through + 200:
        raise ValueError('Archive and API coverage disagree; import stopped')
    for contest in range(archive_through + 1, latest_contest + 1):
        draws.append(from_api(json.loads(download(f'{api}/{contest}'))))
    validate(draws)
    # Only archived contests can be independently checked against the API.
    samples = sorted(set([1, archive_through] + list(range(500, archive_through, 500))))
    def verify(contest):
        raw = latest if contest == latest_contest else json.loads(download(f'{api}/{contest}'))
        reference = from_api(raw)
        actual = draws[contest - 1]
        for key in ('contest', 'date', 'numbers', 'winners', 'prizes'):
            if actual[key] != reference[key]:
                raise ValueError(f'Workbook/API mismatch: contest {contest}, {key}')
        return contest
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        verified = sorted(pool.map(verify, samples))
    canonical = json.dumps([[d['contest'], d['date'], *d['numbers']] for d in draws], separators=(',', ':')).encode()
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    dataset = {
        'schemaVersion': 1, 'game': 'megasena', 'fetchedAt': now,
        'source': {
            'archiveUrl': archive_url, 'apiUrl': api, 'rulesUrl': RULES_URL,
            'archiveSha256': hashlib.sha256(raw_archive).hexdigest(),
            'drawsSha256': hashlib.sha256(canonical).hexdigest(),
            'archiveThroughContest': archive_through, 'apiVerifiedContests': verified,
        },
        'draws': draws,
        'next': {'contest': latest.get('numeroConcursoProximo'), 'date': iso_date(latest['dataProximoConcurso']) if latest.get('dataProximoConcurso') else None, 'estimatedPrize': latest.get('valorEstimadoProximoConcurso')},
    }
    commit_pair((json.dumps(dataset, ensure_ascii=False, separators=(',', ':')) + '\n').encode(), raw_archive)
    print(json.dumps({'contests': len(draws), 'first': draws[0]['date'], 'last': draws[-1]['date'], 'apiVerified': verified, 'sha256': dataset['source']['drawsSha256']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
