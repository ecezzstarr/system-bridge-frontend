"""Exercise domain reconciliation without calling Google Cloud."""
import json
import os
from pathlib import Path
import subprocess
import tempfile

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/map-weave-domains.sh"
SERVICE = "system-bridge-frontend"
DOMAINS = ["weavingsystem.online", "ssbnow.online", "ssbnow.shop"]
MOCK = '''#!/usr/bin/env python3
import json, os, sys
from pathlib import Path
p = Path(os.environ["MOCK_STATE"])
s = json.loads(p.read_text())
a = sys.argv[1:]
if a[:2] == ["domains", "list-user-verified"]:
    sys.exit(0)
assert a[:3] == ["beta", "run", "domain-mappings"], a
assert "--project=ssbr-495208" in a and "--region=us-central1" in a, a
command = a[3]
if command == "list":
    if s.get("deny"): sys.exit(1)
    print("\\n".join(s["routes"]))
else:
    domain = next(x.split("=", 1)[1] for x in a if x.startswith("--domain="))
    if command == "describe":
        if domain not in s["routes"]: sys.exit(1)
        if "--format=value(spec.routeName)" in a: print(s["routes"][domain])
    elif command == "create":
        s["writes"].append({"domain": domain, "override": "--force-override" in a})
        if not s.get("no_change"):
            s["routes"][domain] = "system-bridge-frontend"
        p.write_text(json.dumps(s))
        if s.get("create_fail"): sys.exit(1)
    else: raise AssertionError(a)
'''

def check(name, routes, expected_writes, success=True, **flags):
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        mock = root / "gcloud"
        mock.write_text(MOCK)
        mock.chmod(0o755)
        state = root / "state.json"
        state.write_text(json.dumps(dict(routes=routes, writes=[], **flags)))
        env = dict(os.environ, PATH=tmp + os.pathsep + os.environ["PATH"], MOCK_STATE=str(state))
        result = subprocess.run(["bash", str(SCRIPT)], env=env, capture_output=True, text=True)
        assert (result.returncode == 0) == success, (name, result.stdout, result.stderr)
        assert json.loads(state.read_text())["writes"] == expected_writes, name
        print("PASS", name)

correct = dict.fromkeys(DOMAINS, SERVICE)
repair = [{"domain": "ssbnow.online", "override": True}]
check("preserve correct mappings", correct, [])
check("repair old administration mapping", dict(correct, **{"ssbnow.online": "ssbnowonline"}), repair)
check("reject unexpected target", dict(correct, **{"ssbnow.online": "unrelated-service"}), [], False)
check("create missing mapping", {d: SERVICE for d in DOMAINS if d != "ssbnow.online"}, [{"domain": "ssbnow.online", "override": False}])
check("access error causes no writes", correct, [], False, deny=True)
check("verify effective target", dict(correct, **{"ssbnow.online": "ssbnowonline"}), repair, False, no_change=True)
check("stop on remap failure", dict(correct, **{"ssbnow.online": "ssbnowonline"}), repair, False, create_fail=True)
