#!/usr/bin/env python3
"""Read-only GCP resource inventory. Excludes secret values and personal data.

Run in authenticated Cloud Shell: python3 scripts/weave-cloud-cost-inventory.py
This reports configuration, not invoice totals. Billing Reports grouped by service
are still needed to identify the actual spend.
"""
import datetime
import json
import shutil
import subprocess
import sys

PROJECT = 'ssbr-495208'
REGION = 'us-central1'
SERVICE = 'system-bridge-frontend'


def read(*args):
    result = subprocess.run(['gcloud', *args, '--project=' + PROJECT, '--format=json', '--quiet'],
                            text=True, capture_output=True, timeout=60)
    if result.returncode:
        # API errors may contain URLs/identifiers; do not print raw stderr.
        return {'unavailable': True, 'reason': 'Permission, API availability or command failure'}
    return json.loads(result.stdout or 'null')


def summarize_revision(revision):
    if not isinstance(revision, dict) or revision.get('unavailable'):
        return revision
    annotations = revision.get('metadata', {}).get('annotations', {})
    spec = revision.get('spec', {})
    return {
        'name': revision.get('metadata', {}).get('name'),
        'scaling_and_billing': {k: v for k, v in annotations.items() if k.startswith('autoscaling.knative.dev/') or k in
                               ['run.googleapis.com/cpu-throttling', 'run.googleapis.com/startup-cpu-boost',
                                'run.googleapis.com/vpc-access-connector', 'run.googleapis.com/vpc-access-egress']},
        'concurrency': spec.get('containerConcurrency'),
        'containers': [{'resources': c.get('resources'), 'environment_names': sorted(e.get('name', '') for e in c.get('env', []))}
                       for c in spec.get('containers', [])],
    }


def main():
    if not shutil.which('gcloud'):
        sys.exit('Run this in Google Cloud Shell or another authenticated gcloud environment.')
    service = read('run', 'services', 'describe', SERVICE, '--region=' + REGION)
    output = {'project': PROJECT, 'captured_at': datetime.datetime.now(datetime.timezone.utc).isoformat()}
    if isinstance(service, dict) and not service.get('unavailable'):
        traffic = service.get('status', {}).get('traffic', [])
        output['cloud_run'] = {
            'service_scaling': {k: v for k, v in service.get('metadata', {}).get('annotations', {}).items()
                                if k in ['run.googleapis.com/minScale', 'run.googleapis.com/maxScale']},
            'traffic': [{k: t.get(k) for k in ['revisionName', 'percent', 'tag']} for t in traffic],
            'revisions': [summarize_revision(read('run', 'revisions', 'describe', name, '--region=' + REGION))
                          for name in sorted({t['revisionName'] for t in traffic if t.get('revisionName')})],
        }
    else:
        output['cloud_run'] = service
    instances = read('sql', 'instances', 'list')
    output['cloud_sql'] = [{
        'name': i.get('name'), 'state': i.get('state'), 'region': i.get('region'), 'version': i.get('databaseVersion'),
        'settings': {k: i.get('settings', {}).get(k) for k in ['tier', 'edition', 'availabilityType', 'activationPolicy',
                                                               'dataDiskSizeGb', 'dataDiskType', 'storageAutoResize']},
    } for i in instances] if isinstance(instances, list) else instances
    for key, args in [
        ('compute_instances', ('compute', 'instances', 'list')),
        ('compute_disks', ('compute', 'disks', 'list')),
        ('artifact_repositories', ('artifacts', 'repositories', 'list', '--location=' + REGION)),
    ]:
        result = read(*args)
        output[key] = [{k: row.get(k) for k in ['name', 'status', 'machineType', 'sizeGb', 'zone', 'format', 'sizeBytes'] if k in row}
                       for row in result] if isinstance(result, list) else result
    print(json.dumps(output, indent=2))


if __name__ == '__main__':
    main()
