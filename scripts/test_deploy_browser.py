import importlib.util
import os
from pathlib import Path
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import patch
import unittest

from playwright.sync_api import BrowserType, LocatorAssertions
spec=importlib.util.spec_from_file_location('deploy',Path(__file__).with_name('deploy-weave.py'))
deploy=importlib.util.module_from_spec(spec);spec.loader.exec_module(deploy)
GOOD='<h1>Interaction in Motion.<span>A real-life gaming operating system for human presence.</span></h1><p>An interactional company that turns human participation into organized work, value, systems and opportunity.</p><a href="/register">Enter WEAVE</a>'
class Handler(BaseHTTPRequestHandler):
 body='';status=200
 def do_GET(self):
  self.send_response(self.status);self.send_header('Content-Type','text/html');self.end_headers();self.wfile.write(self.body.encode())
 def log_message(self,*args):pass
class BrowserTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
  threading.Thread(target=cls.server.serve_forever,daemon=True).start()
  cls.url='http://127.0.0.1:'+str(cls.server.server_port)
 @classmethod
 def tearDownClass(cls):cls.server.shutdown();cls.server.server_close()
 def check(self,body,passes,status=200):
  Handler.body=body;Handler.status=status
  launch=BrowserType.launch;visible=LocatorAssertions.to_be_visible;count=LocatorAssertions.to_have_count
  def local_launch(obj,**kwargs):return launch(obj,**dict(kwargs, **({'channel':os.environ['WEAVE_TEST_BROWSER_CHANNEL']} if os.environ.get('WEAVE_TEST_BROWSER_CHANNEL') else {})))
  def quick_visible(obj,**kwargs):return visible(obj,**dict(kwargs,timeout=1200))
  def quick_count(obj,n,**kwargs):return count(obj,n,**dict(kwargs,timeout=1200))
  with patch.object(BrowserType,'launch',local_launch),patch.object(LocatorAssertions,'to_be_visible',quick_visible),patch.object(LocatorAssertions,'to_have_count',quick_count):
   if passes:deploy.smoke_homepage(self.url)
   else:
    with self.assertRaises(AssertionError):deploy.smoke_homepage(self.url)
 def test_hydrated_homepage(self):
  import json
  self.check('<div id="root">Opening WEAVE</div><script>setTimeout(()=>document.getElementById("root").innerHTML='+json.dumps(GOOD)+',200)</script>',True)
 def test_loader_only(self):self.check('<h1>Opening the living environment</h1>',False)
 def test_script_payload_only(self):self.check('<script type="application/json">'+GOOD+'</script>',False)
 def test_missing_description(self):self.check('<h1>Interaction in Motion.</h1>',False)
 def test_hidden_identity(self):self.check('<div style="display:none">'+GOOD+'</div>',False)
 def test_overlay_never_clears(self):self.check(GOOD+'<div role="status" aria-label="Loading WEAVE environment">Loading</div>',False)
 def test_http_failure(self):self.check(GOOD,False,500)
if __name__=='__main__':unittest.main()

