#!/usr/bin/env python3
"""Build canonical main, preview with zero traffic, then explicitly promote."""
import os, json, subprocess, sys, tempfile, urllib.request, urllib.error, re, html as html_module
from pathlib import Path
PROJECT='ssbr-495208'
REGION='us-central1'
SERVICE='system-bridge-frontend'
PUBLIC_ORIGIN='https://weavingsystem.online'
ROOT=Path(__file__).resolve().parents[1]
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
def smoke(url):
 with urllib.request.urlopen(url+'/api/health',timeout=60) as response:
  assert response.status==200 and json.load(response).get('status')=='healthy'
 with urllib.request.urlopen(url,timeout=60) as response:
  html=html_module.unescape(re.sub(r'<[^>]+>', ' ', response.read().decode()));html=' '.join(html.split());assert 'Interaction in Motion.' in html and 'An interactional company that turns human participation into organized work, value, systems and opportunity.' in html, 'WEAVE homepage identity missing'
 for route in ['/login','/client/loops','/company/loops','/admin/loop-workshop']:
  with urllib.request.urlopen(url+route,timeout=60) as response:assert response.status==200,route
 try:
  urllib.request.urlopen(url+'/api/client/agreements',timeout=60)
  raise AssertionError('Agreements accepted unauthenticated request')
 except urllib.error.HTTPError as error:assert error.code==401
 print('Preview checks passed:',url)
def main():
 sha=check_source();rev=SERVICE+'-weave-'+sha[:12]
 if len(sys.argv)>1 and sys.argv[1]=='promote':
  service=json.loads(cloud('run','services','describe',SERVICE,'--region='+REGION))
  preview=next(t['url'] for t in service['status']['traffic'] if t.get('revisionName')==rev and t.get('tag')=='weave-candidate')
  smoke(preview);assert check_source()==sha
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
