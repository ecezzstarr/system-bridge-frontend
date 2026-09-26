import io
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('deploy',Path(__file__).with_name('deploy-weave.py'))
deploy=importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)
SHA='e35d35e4a83a432db962570b399c19c037695333'
REV=deploy.SERVICE+'-weave-'+SHA[:12]
URL='https://candidate.example'

class PromotionTests(unittest.TestCase):
 def setUp(self):
  self.service={'status':{'traffic':[{'revisionName':'previous','percent':100},{'revisionName':REV,'tag':'weave-candidate','percent':0,'url':URL}]}}
  self.revision={'metadata':{'labels':{'commit-sha':SHA,'weave-source':'canonical-main'}},'status':{'conditions':[{'type':'Ready','status':'True'}]}}
 def cloud(self,*args):
  return json.dumps(self.service if args[1]=='services' else self.revision)
 def test_matching_candidate(self):
  with patch.object(deploy,'cloud',side_effect=self.cloud):self.assertEqual(deploy.candidate_preview(SHA),URL)
 def test_rejects_bad_candidate(self):
  mutations=[lambda:self.service['status']['traffic'][1].update(percent=1),lambda:self.service['status']['traffic'][1].update(revisionName='other'),lambda:self.revision['metadata']['labels'].update({'commit-sha':'wrong'}),lambda:self.revision['status']['conditions'][0].update(status='False'),lambda:self.service['status']['traffic'][0].update(percent=50),lambda:self.service['status']['traffic'].append({'revisionName':REV,'percent':100})]
  for mutate in mutations:
   self.setUp();mutate()
   with patch.object(deploy,'cloud',side_effect=self.cloud),self.assertRaises(AssertionError):deploy.candidate_preview(SHA)
 def test_promote_never_builds_and_rechecks(self):
  with patch.object(deploy.sys,'argv',['deploy-weave.py','promote']),patch.object(deploy,'check_source',return_value=SHA) as source,patch.object(deploy,'candidate_preview',return_value=URL) as candidate,patch.object(deploy,'smoke') as smoke,patch.object(deploy,'run') as run:
   deploy.main()
   self.assertEqual(source.call_count,2);self.assertEqual(candidate.call_count,2)
   smoke.assert_called_once_with(URL)
   self.assertEqual(run.call_count,1)
   self.assertIn('--to-revisions='+REV+'=100',run.call_args.args)
 def test_smoke_failure_blocks_traffic(self):
  with patch.object(deploy.sys,'argv',['deploy-weave.py','promote']),patch.object(deploy,'check_source',return_value=SHA),patch.object(deploy,'candidate_preview',return_value=URL),patch.object(deploy,'smoke',side_effect=AssertionError('failed')),patch.object(deploy,'run') as run:
   with self.assertRaises(AssertionError):deploy.main()
   run.assert_not_called()
 def test_candidate_change_blocks_traffic(self):
  with patch.object(deploy.sys,'argv',['deploy-weave.py','promote']),patch.object(deploy,'check_source',return_value=SHA),patch.object(deploy,'candidate_preview',side_effect=[URL,'https://other.example']),patch.object(deploy,'smoke'),patch.object(deploy,'run') as run:
   with self.assertRaises(AssertionError):deploy.main()
   run.assert_not_called()

class ApiTests(unittest.TestCase):
 def response(self,body,status=200):
  response=io.BytesIO(json.dumps(body).encode());response.status=status
  return response
 def request(self,url,**kwargs):
  if url.endswith('/api/health'):return self.response({'status':'healthy'})
  if url.endswith('/api/divine-shield/status'):return self.response({'success':True,'active':False})
  if url.endswith('/api/visual-runtime'):return self.response({'success':True,'profileKey':'flame-event-artifact','config':{'enabled':True}})
  if url.endswith('/api/client/agreements'):raise deploy.urllib.error.HTTPError(url,401,'unauthorized',{},None)
  return self.response({})
 def test_all_checks_run(self):
  with patch.object(deploy.urllib.request,'urlopen',side_effect=self.request) as request,patch.object(deploy,'smoke_homepage') as homepage:
   deploy.smoke(URL);homepage.assert_called_once_with(URL)
   self.assertEqual(request.call_count,9)
 def test_safety_failures(self):
  failures={
   '/api/health':{'status':'unhealthy'},
   '/api/divine-shield/status':{'success':True,'active':True},
   '/api/visual-runtime':{'success':True,'profileKey':'wrong','config':{'enabled':True}},
   '/api/client/agreements':{},
  }
  for route,body in failures.items():
   with self.subTest(route=route):
    def request(url,**kwargs):
     return self.response(body) if url.endswith(route) else self.request(url,**kwargs)
    with patch.object(deploy.urllib.request,'urlopen',side_effect=request),patch.object(deploy,'smoke_homepage'),self.assertRaises(AssertionError):deploy.smoke(URL)

if __name__=='__main__':unittest.main()

