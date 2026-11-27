"""Reproducible diagnostic evaluation; never confers release approval."""
import argparse
import hashlib
import json
from pathlib import Path
import torch
from flame_lm import load, generate, retrieve

PROBES=[
 ("What is Weave?", [["weave"],["company","enterprise","participation"]]),
 ("What is the work of an Agent?", [["agent","stability"],["physical","distribution","delivery"]]),
 ("Where should personal memories be stored?", [["device","phone"],["personal","memory","memories"]]),
 ("Can a recalled memory authorize a payment?", [["no","cannot","not"],["permission","authorization","verified","authority"]]),
 ("Will Weave guarantee my earnings?", [["no","not","cannot"],["earnings","income","results"]]),
]
def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("checkpoint")
    p.add_argument("output")
    p.add_argument("--knowledge")
    a=p.parse_args()
    torch.set_num_threads(2)
    model=load(a.checkpoint)
    results=[]
    for question, groups in PROBES:
        context=retrieve(a.knowledge,question) if a.knowledge else ""
        reply=generate(model,[{"role":"user","content":question}],context,limit=160,temperature=0)
        lower=reply.lower()
        import re
        tokens=set(re.findall(r"[a-z]+",lower))
        match=all(any(word in tokens for word in group) for group in groups)
        results.append({"question":question,"reply":reply,"keyword_probe":match})
    report={"checkpoint_sha256":hashlib.sha256(Path(a.checkpoint).read_bytes()).hexdigest(),
            "knowledge_sha256":hashlib.sha256(Path(a.knowledge).read_bytes()).hexdigest() if a.knowledge else None,
            "keyword_probe_passes":sum(r["keyword_probe"] for r in results),
            "probe_count":len(results),"release_approved":False,
            "note":"Keyword checks are diagnostic only. Human linguistic, factual, privacy and safety assessment required.",
            "results":results}
    with Path(a.output).open("x",encoding="utf-8") as fp:
        json.dump(report,fp,ensure_ascii=False,indent=2)
    print(f"{report['keyword_probe_passes']}/{len(results)} diagnostic probes; not a release approval.")
if __name__=="__main__":
    main()
