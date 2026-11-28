"""Outbound-only training adapter. Credential arrives on stdin from local DPAPI.
No HTTP listener, remote code, checkpoint uploads or caller-selected endpoints.
"""
import argparse
import json
import os
import re
import shutil
import sys
import time
import urllib.request
from pathlib import Path
from training_worker import Workshop, atomic, read

API = 'https://weavingsystem.online/api/system/laptop-worker'

def execute(w, body):
    if not isinstance(body, dict):
        raise ValueError('Invalid action')
    action, actor = body.get('action'), body.get('actor')
    if not isinstance(actor, str) or not re.fullmatch(r'[a-fA-F0-9-]{36}', actor):
        raise ValueError('Invalid operator')
    if action in ('import', 'train'):
        used = sum(p.stat().st_size for p in w.root.rglob('*') if p.is_file())
        if used > 2 * 1024**3 or shutil.disk_usage(w.root).free < 2 * 1024**3:
            raise ValueError('Private storage budget reached; local archive review required')
    if action == 'import' and body.get('confirmation') == 'IMPORT REVIEWED CORPUS':
        return w.import_corpus(body.get('corpus'), actor)
    if action == 'train' and body.get('confirmation') == 'START TRAINING':
        return w.start(body.get('sha'), body.get('steps'), actor, body.get('parent'))
    if action == 'report':
        return w.report(body.get('id'))
    if action == 'activate' and body.get('confirmation') == 'DEPLOY PILOT':
        return w.activate(body.get('id'), body.get('sha'), actor)
    if action == 'deactivate' and body.get('confirmation') == 'DEACTIVATE PILOT':
        return w.deactivate(actor)
    if action == 'test':
        return w.test(body.get('messages'))
    raise ValueError('Unsupported action or confirmation')

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise ValueError('Redirect refused')

def exchange(token, body):
    raw = json.dumps(body, allow_nan=False).encode()
    if len(raw) > 327680:
        raise ValueError('Status or receipt exceeds transport bound')
    request = urllib.request.Request(API, data=raw, headers={
        'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    with urllib.request.build_opener(NoRedirect).open(request, timeout=25) as response:
        data = response.read(2162689)
    if len(data) > 2162688:
        raise ValueError('Response too large')
    result = json.loads(data)
    if result.get('success') is not True:
        raise ValueError('Exchange refused')
    return result

def handle(w, job):
    ident, lease = job.get('id'), job.get('lease')
    if not isinstance(ident, str) or not re.fullmatch(r'[a-f0-9-]{36}', ident) or not isinstance(lease, str) or not re.fullmatch(r'[a-f0-9]{64}', lease):
        raise ValueError('Invalid lease')
    receipt_path = w.root / ('receipt-' + ident + '.json')
    # Never execute an operation a second time after a crash or lost response.
    # A started marker without a receipt requires local inspection.
    marker = w.root / ('started-' + ident)
    if receipt_path.exists():
        receipt = read(receipt_path)
        if receipt['lease'] != lease:
            raise ValueError('Lease changed')
        return receipt
    if marker.exists():
        result = {'success': False, 'error': 'Interrupted operation; inspect private local state before retrying.'}
    else:
        with marker.open('xb') as file:
            file.write(b'started')
        try:
            result = {'success': True, 'result': execute(w, job.get('payload'))}
        except Exception:
            result = {'success': False, 'error': 'Native action refused or failed; inspect private local state.'}
    receipt = {'action': 'training_result', 'jobId': ident, 'lease': lease, 'result': result}
    atomic(receipt_path, receipt)
    return receipt

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root', required=True)
    args = p.parse_args()
    os.umask(0o077)
    token = sys.stdin.readline().strip()
    if not re.fullmatch(r'[a-f0-9]{64}', token):
        raise SystemExit('Start through the paired local PowerShell worker.')
    # Hold an OS file lock for this process lifetime: two local workers cannot
    # mark each other's active training interrupted or claim competing jobs.
    root = Path(args.root).resolve()
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    lock = (root / 'outbound.lock').open('a+b')
    if os.name == 'nt':
        import msvcrt
        lock.write(b'0'); lock.flush(); lock.seek(0)
        msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
    else:
        import fcntl
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    w = Workshop(root)
    print('Private outbound training worker running; Ctrl+C stops polling.', flush=True)
    while True:
        try:
            reply = exchange(token, {'action': 'training_poll', 'trainingStatus': w.status()})
            if reply.get('job'):
                receipt = handle(w, reply['job'])
                for attempt in range(3):
                    try:
                        exchange(token, receipt)
                        break
                    except Exception:
                        if attempt == 2:
                            raise
                        time.sleep(2)
        except Exception:
            raise SystemExit('Training exchange unavailable. Inspect workshop history before restarting.')
        time.sleep(5)

if __name__ == '__main__':
    main()
