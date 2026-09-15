import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from deliver_content_drafts import deliver


class Response:
    def __init__(self, body): self.body = body
    def __enter__(self): return self
    def __exit__(self, *_): return None
    def read(self): return json.dumps(self.body).encode()


class DeliveryTests(unittest.TestCase):
    def package(self, directory, **changes):
        value = {'posting_enabled': False, 'public_release_authorized': False, **changes}
        path = Path(directory) / 'draft.json'
        path.write_text(json.dumps(value, separators=(',', ':')))
        return path

    def test_delivers_exact_hash_without_exposing_secret(self):
        with tempfile.TemporaryDirectory() as directory:
            path = self.package(directory)
            with patch('deliver_content_drafts.urlopen') as send:
                digest = __import__('hashlib').sha256(path.read_bytes()).hexdigest()
                send.return_value = Response({'accepted': True, 'packageHash': digest, 'id': 'review', 'reviewStatus': 'PENDING_REVIEW'})
                result = deliver(path, 'https://qsc.test/api/content', 'secret')
            self.assertEqual(result['package_hash'], digest)
            request = send.call_args.args[0]
            self.assertEqual(request.headers['X-qsc-content-sha256'], digest)
            self.assertNotIn('secret', json.dumps(result))

    def test_rejects_publication_and_unsafe_endpoints(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                deliver(self.package(directory, posting_enabled=True), 'https://qsc.test/api/content', 'secret')
            with self.assertRaises(ValueError):
                deliver(self.package(directory), 'http://qsc.test/api/content', 'secret')


if __name__ == '__main__': unittest.main()
