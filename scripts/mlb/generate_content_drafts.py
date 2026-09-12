"""Generate private review drafts from the exact acknowledged QSC payload. Never post."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sys

from export_qsc_results import timestamp, serialize


def build_package(payload, now, digest):
    if now.tzinfo is None:
        raise ValueError('Review time requires timezone')
    if payload.get('schema_version') != 'qsc.mlb_gsim.results.v1':
        raise ValueError('Unknown contract')
    if payload.get('publication') != {
        'visibility': 'PRIVATE_QSC', 'decision_use': 'DESCRIPTIVE_MODEL_OUTPUT_NOT_VALIDATED_EDGE',
        'model_parameters_included': False,
    }:
        raise ValueError('Unexpected publication policy')
    generated = timestamp(payload['generated_at_utc'])
    age = (now - generated).total_seconds()
    blocked = []
    if age < 0:
        blocked.append('SOURCE_TIMESTAMP_IN_FUTURE')
    if age > 90 * 60:
        blocked.append('SOURCE_STALE')
    # UTC offsets are already explicit in the source; no inferred input-refresh time.
    stamp = generated.strftime('%Y-%m-%d %H:%M UTC')
    eligible = []
    statuses = []
    for game in payload['games']:
        state = game['context']
        if state == 'PREGAME_MODEL' and timestamp(game['scheduled_start_utc']) <= now:
            state = 'PREGAME_REFERENCE'
        statuses.append({'game_id': game['game_id'], 'status_at_review': state})
        if state == 'PREGAME_MODEL' and game['projection'] is not None:
            eligible.append(game)
    eligible.sort(key=lambda g: (g['scheduled_start_utc'], g['game_id']))
    if not eligible:
        blocked.append('NO_CURRENT_PREGAME_PROJECTIONS')
    posts = []
    if not blocked:
        posts.append({'kind': 'DAILY_ANCHOR', 'text':
            f"QSC MLB MODEL SNAPSHOT // {payload['slate_date']}\n"
            f"{len(eligible)}/{len(payload['games'])} games have current pregame projections.\n"
            f"Descriptive model output; not a betting recommendation.\nSnapshot {stamp}."})
        # Chronological coverage, not a cherry-picked or implied betting ranking.
        for game in eligible:
            p = game['projection']
            posts.append({'kind': 'GAME_MODEL', 'game_id': game['game_id'], 'run_id': game['run_id'], 'text':
                f"QSC MLB // {game['away_team']} at {game['home_team']}\n"
                f"Home win: {p['home_win_probability'] * 100:.1f}%\n"
                f"Projected total: {p['game_total_mean']:.2f} runs\n"
                f"Descriptive model output.\nSnapshot {stamp}."})
    for post in posts:
        # Conservative screening only; final X composer validation is still required.
        post['conservative_length'] = sum(1 if ord(ch) < 128 else 2 for ch in post['text'])
        post['copy_status'] = 'REVIEWABLE' if post['conservative_length'] <= 280 else 'BLOCKED_LENGTH'
    return {
        'schema_version': 'qsc.content_drafts.v1', 'template_version': '1.1',
        'slate_date': payload['slate_date'], 'reviewed_at_utc': now.astimezone(timezone.utc).isoformat(),
        'source_generated_at_utc': payload['generated_at_utc'], 'source_payload_sha256': digest,
        'release_status': 'INTERNAL_DRAFT_ONLY', 'public_release_authorized': False,
        'posting_enabled': False, 'blockers': blocked, 'posts': posts, 'games': statuses,
        'requirements': ['Approve release of PRIVATE_QSC data', 'Recheck freshness and game status before release',
            'Review final copy and validate length in the destination composer', 'Obtain separate posting authorization'],
        'evidence': {'model_fields': 'EXACT_ACKNOWLEDGED_PAYLOAD', 'prices': 'NOT_APPLICABLE',
            'stakes': 'NOT_APPLICABLE', 'betting_decisions': 'NOT_APPLICABLE', 'media': 'NOT_CREATED'},
    }


def write_package(package, output):
    output.mkdir(parents=True, exist_ok=True)
    body = serialize(package)
    version = hashlib.sha256(body).hexdigest()
    archive = output / 'archive'
    archive.mkdir(exist_ok=True)
    archived = archive / f"{package['slate_date']}-{version}.json"
    if not archived.exists():
        archived.write_bytes(body)
    markdown = ['# QSC MLB content review', '', '**INTERNAL DRAFT ONLY — PRIVATE_QSC. Posting disabled.**', '',
        f"Reviewed: {package['reviewed_at_utc']}", f"Source snapshot: {package['source_generated_at_utc']}",
        f"Source SHA-256: `{package['source_payload_sha256']}`", '',
        '## Required before release', '', *[f'- {r}' for r in package['requirements']], '']
    if package['blockers']:
        markdown += ['## Drafts withheld', '', *[f'- {reason}' for reason in package['blockers']], '']
    for i, post in enumerate(package['posts'], 1):
        markdown += [f"## {i}. {post['kind']} — {post['copy_status']}", '', post['text'], '',
            f"Conservative length: {post['conservative_length']}/280. No image attached.", '']
    for name, content in [('latest.json', body), ('latest.md', '\n'.join(markdown).encode('utf-8'))]:
        temporary = output / (name + '.tmp')
        temporary.write_bytes(content)
        temporary.replace(output / name)
    return version


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--payload', type=Path, required=True)
    parser.add_argument('--acknowledged-hash', required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    try:
        raw = args.payload.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        if digest != args.acknowledged_hash or len(raw) > 256 * 1024:
            raise ValueError('Payload does not match acknowledgement')
        package = build_package(json.loads(raw), datetime.now(timezone.utc), digest)
        version = write_package(package, args.output)
        print(json.dumps({'drafted': True, 'version': version, 'posts': len(package['posts']),
            'blockers': package['blockers'], 'posting_enabled': False}))
    except (ValueError, KeyError, TypeError, OSError):
        print('Content drafting failed; verify the acknowledged payload and output directory.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
