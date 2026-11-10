#!/usr/bin/env python3
"""Enroll authorized recovery helpers and issue an offline kit from the trusted host.

Run as root on the live WEAVE host only, after deploying the continuity desk.
Plaintext codes go only to a new owner-readable file. The database gets hashes.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import subprocess
import urllib.request
import uuid


ENROLL = r"""
const {Client}=require('pg');
const {randomUUID}=require('node:crypto');
const {head,helper,hashes}=input;
(async()=>{
  const db=new Client({connectionString:process.env.DATABASE_URL});
  await db.connect();
  try{
    await db.query('BEGIN');
    await db.query("SELECT pg_advisory_xact_lock(hashtext('weave-admin-continuity'))");
    const admins=(await db.query("SELECT id FROM users WHERE role='admin' AND is_active=true FOR UPDATE")).rows;
    if(admins.length!==1)throw Error('Exactly one active Administration account is required');
    const admin=admins[0].id;
    const leads=(await db.query(`SELECT m.id,m.agent_id FROM weave_food_preparation_managers m JOIN users u ON u.id=m.agent_id
      WHERE m.position='manager' AND m.status='approved' AND u.role='agent' AND u.is_active=true FOR SHARE OF m,u`)).rows;
    if(leads.length!==1||leads[0].agent_id!==head)throw Error('The selected Stability head is not the sole approved main manager');
    const second=(await db.query("SELECT id FROM users WHERE id=$1 AND role IN ('agent','bridger') AND is_active=true FOR SHARE",[helper])).rows;
    if(second.length!==1||head===helper)throw Error('The second helper must be a distinct active Agent or Bridger');
    const existing=(await db.query('SELECT user_id FROM admin_continuity_trustees WHERE admin_id=$1',[admin])).rows;
    if(existing.length)throw Error('Helpers are already appointed. Use the authenticated desk to change an established recovery configuration');
    await db.query('INSERT INTO admin_continuity_trustees(admin_id,user_id,stability_appointment_id) VALUES($1,$2,$3),($1,$4,NULL)',[admin,head,leads[0].id,helper]);
    await db.query('UPDATE admin_continuity_codes SET revoked_at=now() WHERE admin_id=$1 AND consumed_at IS NULL AND revoked_at IS NULL',[admin]);
    for(const hash of hashes)await db.query('INSERT INTO admin_continuity_codes(id,admin_id,code_hash) VALUES($1,$2,$3)',[randomUUID(),admin,hash]);
    await db.query("UPDATE admin_continuity_requests SET status='cancelled' WHERE admin_id=$1 AND status='pending'",[admin]);
    await db.query("INSERT INTO admin_continuity_audit(id,admin_id,action,details) VALUES($1,$2,'trusted_host_enrolled',$3)",[randomUUID(),admin,JSON.stringify({helperIds:[head,helper],offlineCodes:hashes.length})]);
    await db.query('COMMIT');
    console.log('Two verified helpers enrolled; eight offline codes registered.');
  }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e}
  finally{await db.end()}
})().catch(e=>{console.error(e.code||e.message);process.exit(1)});
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--stability-head', type=uuid.UUID, required=True)
    parser.add_argument('--second-helper', type=uuid.UUID, required=True)
    parser.add_argument('--release-sha', required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--confirm-owner-authorization', action='store_true', required=True)
    args = parser.parse_args()
    if os.geteuid() != 0:
        parser.error('Only the trusted host operator can bootstrap recovery.')
    output = args.output
    if not output.is_absolute() or output.parent.resolve() != Path('/root'):
        parser.error('The recovery kit must be a new file directly under /root.')
    origin = 'http://127.0.0.1:3000'
    with urllib.request.urlopen(origin + '/api/health', timeout=15) as response:
        health = json.load(response)
    if health.get('status') != 'healthy' or health.get('releaseSha') != args.release_sha:
        parser.error('The selected continuity release must be live and healthy first.')

    # A non-existent receipt initializes the installed application's schema.
    # It neither creates nor completes a recovery request.
    request = urllib.request.Request(origin + '/api/auth/admin-continuity',
        data=json.dumps({'action': 'status', 'token': secrets.token_hex(32)}).encode(),
        headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(request, timeout=30) as response:
        if json.load(response).get('status') != 'unavailable':
            parser.error('Unexpected continuity API response.')

    codes = [secrets.token_hex(32) for _ in range(8)]
    input_data = {'head': str(args.stability_head), 'helper': str(args.second_helper),
                  'hashes': [hashlib.sha256(code.encode()).hexdigest() for code in codes]}
    fd = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, 'w', encoding='utf-8') as kit:
        kit.write('WEAVE ADMINISTRATION — PRIVATE OFFLINE RECOVERY KIT\n'
                  'Use at https://weavingsystem.online/admin-continuity.\n'
                  'These codes grant access to the sole Administration account. Store offline, never share with helpers.\n'
                  'A completed recovery revokes the entire kit. Sign in and generate a fresh kit afterward.\n\n')
        kit.write('\n'.join(codes) + '\n')
        kit.flush()
        os.fsync(kit.fileno())
    try:
        subprocess.run(['docker', 'exec', '-i', 'weave-app', 'node'],
            input='const input=' + json.dumps(input_data) + ';\n' + ENROLL, text=True, check=True)
    except subprocess.CalledProcessError:
        raise SystemExit('Enrollment did not report success. Keep the kit private and inspect the audit before retrying.')
    print('Private kit saved to', output)


if __name__ == '__main__':
    main()
