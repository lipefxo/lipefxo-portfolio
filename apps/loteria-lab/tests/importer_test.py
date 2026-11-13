"""Regression checks for the official archive importer; no network calls."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest
import tempfile
from unittest import mock

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('sync_caixa', ROOT / 'scripts/sync-caixa.py')
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)
DATA = json.loads((ROOT / 'data/megasena.json').read_text())


class ImporterTests(unittest.TestCase):
    def test_interrupted_pair_commit_recovers_on_restart(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            importer.commit_pair(b'old json', b'old archive', root)
            original = importer.atomic_write
            def interrupted(path, content):
                if path == root / 'data/source/megasena.xlsx':
                    raise OSError('simulated interruption')
                return original(path, content)
            with mock.patch.object(importer, 'atomic_write', side_effect=interrupted):
                with self.assertRaises(OSError):
                    importer.commit_pair(b'new json', b'new archive', root)
            stage = root / 'data/.import-staging'
            self.assertEqual((stage / 'previous-snapshot').read_bytes(), b'old json')
            self.assertEqual((stage / 'previous-archive').read_bytes(), b'old archive')
            with mock.patch.object(importer, 'atomic_write', side_effect=OSError('still failing')):
                with self.assertRaises(OSError):
                    importer.recover_pair(root)
            self.assertEqual((stage / 'previous-snapshot').read_bytes(), b'old json')
            self.assertEqual((stage / 'previous-archive').read_bytes(), b'old archive')
            importer.recover_pair(root)
            self.assertEqual((root / 'data/megasena.json').read_bytes(), b'new json')
            self.assertEqual((root / 'data/source/megasena.xlsx').read_bytes(), b'new archive')
            self.assertFalse((root / 'data/.import-staging/journal.json').exists())

    def test_original_workbook_matches_every_archived_draw(self):
        parsed = importer.parse_workbook((ROOT / 'data/source/megasena.xlsx').read_bytes())
        importer.validate(parsed)
        self.assertEqual(parsed, DATA['draws'][:DATA['source']['archiveThroughContest']])

    def test_api_does_not_invent_missing_prize_levels(self):
        with self.assertRaises(ValueError):
            importer.from_api({'listaRateioPremio': []})

    def test_api_does_not_truncate_fractional_numbers(self):
        raw = {
            'numero': 1, 'dataApuracao': '11/03/1996',
            'listaDezenas': [4.5, 5, 30, 33, 41, 52],
            'listaRateioPremio': [
                {'faixa': i, 'numeroDeGanhadores': 0, 'valorPremio': 0}
                for i in (1, 2, 3)
            ],
        }
        with self.assertRaises(ValueError):
            importer.from_api(raw)

    def test_invalid_dates_and_nonfinite_prizes_are_rejected(self):
        for change in [{'date': '2020-02-30'}, {'prizes': [float('nan'), 0, 0]}, {'prizes': [0, float('inf'), 0]}]:
            draw = copy.deepcopy(DATA['draws'][0])
            draw.update(change)
            with self.assertRaises(ValueError):
                importer.validate([draw])


if __name__ == '__main__':
    unittest.main()
