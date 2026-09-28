#!/usr/bin/env python3
"""Build canonical main, preview with zero traffic, then explicitly promote."""
import os, json, subprocess, sys, tempfile, urllib.request, urllib.error
from pathlib import Path
PROJECT='ssbr-495208'
REGION='us-central1'
SERVICE='system-bridge-frontend'
PUBLIC_ORIGIN='https://weavingsystem.online'
ROOT=Path(os.environ.get('WEAVE_SOURCE_ROOT', Path(__file__).resolve().parents[1])).resolve()
def run(*args):
 return subprocess.check_output(args,cwd=ROOT,text=True).strip()
def cloud(*args):
 return run('gcloud',*args,'--project='+PROJECT,'--format=json')
def check_source():
 assert run('git','branch','--show-current')=='main', 'Deploy only canonical main'
 assert not run('git','status','--porcelain'), 'Commit all source changes first'
 assert run('git','remote','get-url','origin').removesuffix('.git').endswith('github.com/ecezzstarr/system-bridge-frontend'), 'Wrong repository'
 run('git','fetch','origin','main')
 sha=run('git','rev-parse','HEAD')
 assert sha==run('git','rev-parse','origin/main'), 'Checkout is not current origin/main'
 return sha
def smoke_homepage(url):
 # DivineShieldGate renders only a loader in SSR. Verify real browser content,
 # never accept the loader or strings embedded in Next's script payloads.
 from playwright.sync_api import sync_playwright, expect
 with sync_playwright() as playwright:
  browser=playwright.chromium.launch(headless=True)
  try:
   page=browser.new_page()
   response=page.goto(url, wait_until='domcontentloaded', timeout=60000)
   assert response is not None and response.status==200, 'Homepage HTTP failure'
   assert page.url.rstrip('/')==url.rstrip('/'), 'Unexpected homepage redirect'
   expect(page.get_by_role('heading', level=1).filter(has_text='Interaction in Motion.')).to_be_visible(timeout=60000)
   expect(page.get_by_text('An interactional company that turns human participation into organized work, value, systems and opportunity.', exact=True)).to_be_visible(timeout=60000)
   expect(page.get_by_role('link', name='Enter WEAVE', exact=True)).to_have_attribute('href', '/register')
   expect(page.get_by_role('link', name='Enter WEAVE', exact=True)).to_be_visible()
   expect(page.get_by_role('status', name='Loading WEAVE environment')).to_have_count(0, timeout=60000)
  finally:
   browser.close()
def candidate_preview(sha):
 rev=SERVICE+'-weave-'+sha[:12]
 service=json.loads(cloud('run','services','describe',SERVICE,'--region='+REGION))
 traffic=service['status']['traffic']
 candidates=[t for t in traffic if t.get('revisionName')==rev and t.get('tag')=='weave-candidate']
 assert len(candidates)==1 and candidates[0].get('percent',0)==0, 'Expected zero-traffic candidate missing'
 assert all(t.get('percent',0)==0 for t in traffic if t.get('revisionName')==rev), 'Candidate already receives production traffic'
 active=[t for t in traffic if t.get('percent',0)>0]
 assert len(active)==1 and active[0]['percent']==100, 'Review split production traffic before promotion'
 revision=json.loads(cloud('run','revisions','describe',rev,'--region='+REGION))
 labels=revision['metadata'].get('labels',{})
 assert labels.get('commit-sha')==sha and labels.get('weave-source')=='canonical-main', 'Candidate source mismatch'
 assert any(c.get('type')=='Ready' and c.get('status')=='True' for c in revision['status'].get('conditions',[])), 'Candidate is not ready'
 return candidates[0]['url']
def smoke(url):
 with urllib.request.urlopen(url+'/api/divine-shield/status',timeout=60) as response:
  shield=json.load(response)
  assert response.status==200 and shield.get('success') is True and shield.get('active') is False, 'Divine Shield is active or unavailable'
 with urllib.request.urlopen(url+'/api/health',timeout=60) as response:
  assert response.status==200 and json.load(response).get('status')=='healthy'
 smoke_homepage(url)
 for route in ['/login','/client/loops','/company/loops','/admin/loop-workshop','/admin/visual-systems']:
  with urllib.request.urlopen(url+route,timeout=60) as response:assert response.status==200,route
 with urllib.request.urlopen(url+'/api/visual-runtime',timeout=60) as response:
  visual=json.load(response)
  assert response.status==200 and visual.get('success') is True, 'Visual runtime unavailable'
  assert visual.get('profileKey')=='flame-event-artifact', 'Visual runtime profile missing'
  assert isinstance(visual.get('config'),dict) and visual['config'].get('enabled') is not None, 'Visual runtime config invalid'
 try:
  urllib.request.urlopen(url+'/api/client/agreements',timeout=60)
  raise AssertionError('Agreements accepted unauthenticated request')
 except urllib.error.HTTPError as error:assert error.code==401
 print('Preview checks passed:',url)
def main():
 if sys.flags.optimize:
  raise RuntimeError('Run without Python optimization: safety assertions are required')
 assert sys.argv[1:] in ([], ['promote']), 'Usage: deploy-weave.py [promote]'
 sha=check_source();rev=SERVICE+'-weave-'+sha[:12]
 if len(sys.argv)>1 and sys.argv[1]=='promote':
  preview=candidate_preview(sha)
  smoke(preview);assert check_source()==sha
  assert candidate_preview(sha)==preview, 'Candidate changed during checks'
  run('gcloud','run','services','update-traffic',SERVICE,'--to-revisions='+rev+'=100','--region='+REGION,'--project='+PROJECT,'--quiet')
  print('Promoted',rev);return
 image='us-central1-docker.pkg.dev/'+PROJECT+'/system-bridge/frontend:'+sha
 build_args=['gcloud','builds','submit',str(ROOT),'--config='+str(ROOT/'cloudbuild.yaml'),'--substitutions=COMMIT_SHA='+sha,'--project='+PROJECT,'--quiet']
 machine=os.environ.get('WEAVE_BUILD_MACHINE_TYPE')
 if machine:
  assert machine in ['e2-standard-2','e2-medium','e2-highcpu-8','e2-highcpu-32','n1-highcpu-8','n1-highcpu-32'], 'Unsupported build machine type'
  build_args.append('--machine-type='+machine)
 run(*build_args)
 assert check_source()==sha
 service=json.loads(cloud('run','services','describe',SERVICE,'--region='+REGION))
 active=[t for t in service['status']['traffic'] if t.get('percent',0)>0]
 assert len(active)==1 and active[0]['percent']==100,'Review split production traffic before deployment'
 baseline=json.loads(cloud('run','revisions','describe',active[0]['revisionName'],'--region='+REGION))
 spec=baseline['spec'];spec['containers'][0]['image']=image
 env=spec['containers'][0].setdefault('env',[])
 if not any(e['name']=='PLATFORM_ADMIN_FALLBACK_PASSWORD' for e in env):
  env.append({'name':'PLATFORM_ADMIN_FALLBACK_PASSWORD','valueFrom':{'secretKeyRef':{'name':'weave-admin-fallback-password','key':'latest'}}})
 public_env={
  'WEAVE_PUBLIC_ORIGIN':PUBLIC_ORIGIN,
  'NEXTAUTH_URL':PUBLIC_ORIGIN,
  'NEXT_PUBLIC_APP_URL':PUBLIC_ORIGIN,
  'APP_URL':PUBLIC_ORIGIN,
  'NEXT_PUBLIC_BRIDGE_URL':PUBLIC_ORIGIN,
 }
 for name,value in public_env.items():
  existing=next((e for e in env if e.get('name')==name),None)
  if existing:
   existing.clear();existing.update({'name':name,'value':value})
  else:
   env.append({'name':name,'value':value})
 annotations={k:v for k,v in baseline['metadata'].get('annotations',{}).items() if k.startswith('autoscaling.knative.dev/') or k in ['run.googleapis.com/cloudsql-instances','run.googleapis.com/startup-cpu-boost','run.googleapis.com/cpu-throttling','run.googleapis.com/vpc-access-connector','run.googleapis.com/vpc-access-egress','run.googleapis.com/execution-environment']}
 active_revision=active[0]['revisionName']
 traffic=[
  {'revisionName':active_revision,'percent':100},
  {'revisionName':rev,'tag':'weave-candidate','percent':0},
 ]
 metadata={k:v for k,v in service['metadata'].items() if k in ['name','namespace','labels','annotations']}
 for key in ['run.googleapis.com/operation-id','run.googleapis.com/urls']:metadata.get('annotations',{}).pop(key,None)
 manifest={'apiVersion':'serving.knative.dev/v1','kind':'Service','metadata':metadata,'spec':{'template':{'metadata':{'name':rev,'labels':{'commit-sha':sha,'weave-source':'canonical-main'},'annotations':annotations},'spec':spec},'traffic':traffic}}
 with tempfile.TemporaryDirectory(prefix='weave-deploy-') as tmp:
  path=Path(tmp)/'service.json';path.write_text(json.dumps(manifest))
  run('gcloud','run','services','replace',str(path),'--region='+REGION,'--project='+PROJECT,'--quiet')
 service=json.loads(cloud('run','services','describe',SERVICE,'--region='+REGION))
 preview=next(t['url'] for t in service['status']['traffic'] if t.get('tag')=='weave-candidate')
 smoke(preview)
 print('Production remains on',active[0]['revisionName'])
 print('After review: python3 scripts/deploy-weave.py promote')
if __name__=='__main__':main()
