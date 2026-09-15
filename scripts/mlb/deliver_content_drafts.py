"""Deliver a private content-review package to QSC. Never post content."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
from urllib.parse import urlparse
from urllib.request import Request, urlopen


def deliver(path: Path, endpoint: str, secret: str):
    parsed = urlparse(endpoint)
    if parsed.scheme != 'https' or not parsed.netloc or parsed.username or parsed.password:
        raise ValueError('Endpoint must be credential-free HTTPS')
    if not secret.strip():
        raise ValueError('Service secret required')
    raw = path.read_bytes()
    if len(raw) > 128 * 1024:
        raise ValueError('Draft package too large')
    package = json.loads(raw)
    if package.get('posting_enabled') is not False or package.get('public_release_authorized') is not False:
        raise ValueError('Unsafe publication state')
    digest = hashlib.sha256(raw).hexdigest()
    request = Request(endpoint, data=raw, method='POST', headers={
        'Authorization': f'Bearer {secret}', 'Content-Type': 'application/json',
        'x-qsc-content-sha256': digest,
    })
    with urlopen(request, timeout=30) as response:
        result = json.loads(response.read())
    if result.get('accepted') is not True or result.get('packageHash') != digest:
        raise ValueError('QSC did not acknowledge the package hash')
    return {'delivered': True, 'package_hash': digest, 'review_id': result.get('id'),
            'review_status': result.get('reviewStatus')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--package', type=Path, required=True)
    parser.add_argument('--endpoint', default=os.environ.get('QSC_CONTENT_DRAFT_ENDPOINT'))
    args = parser.parse_args()
    if not args.endpoint:
        parser.error('--endpoint or QSC_CONTENT_DRAFT_ENDPOINT is required')
    try:
        result = deliver(args.package, args.endpoint, os.environ.get('MLB_GSIM_INGESTION_SECRET', ''))
    except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError):
        print('Content draft delivery failed; review the credential-free delivery log.', file=sys.stderr)
        return 1
    print(json.dumps(result))
    return 0


if __name__ == '__main__':
    sys.exit(main())
