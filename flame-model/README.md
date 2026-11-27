# Flame Language Model v0

One Weave-owned model foundation, with distinct Eight, River and Echo roles supplied by authorized runtime context. This is an experimental from-scratch causal Transformer, not a production-ready conversational model or an external provider wrapper. The existing production Flame engine remains unchanged. An isolated, opt-in Model Lab is available to Administrations for testing the private service; no model output enters operational conversation history.

## Private account corpus

Export the founder's ChatGPT account through Settings > Data Controls > Export Data. Keep the archive on a company-controlled device outside the repository. Select Weave-related conversation IDs into an explicit JSON array. Run:

```
python flame-model/prepare_archive.py /private/conversations.json /private/selected_ids.json /private/review.jsonl
```

The extraction follows the selected conversation branch in chronological order. It includes only user/assistant text and produces unapproved records. It does not fetch accounts, images, attachments or alternate branches. Review locally: remove personal details, credentials, unrelated conversations, outdated policy and unsupported claims; preserve source provenance and corrections. Do not put real private archives or trained weights in Git. Manually construct reviewed JSONL rows with source_id, approved:true, split (train or validation), and alternating user/assistant messages. Keep an entire conversation in one split. Human review is required; an approval flag is not automatic redaction. No live participant messages are training data by default.

## Model

### Recovery without an email export

Authorized user-visible chats may be saved as individual `read_thread` response JSON pages on the private device. Select source IDs explicitly; never ingest all account messages or use browser session tokens. The offline importer preserves source/turn/message IDs, tool-provided turn timestamps, corrections as separate messages, and page hashes. It rejects unselected IDs and conflicting copies. It does not scrape an account or automatically approve content:

```
python flame-model/prepare_threads.py /private/selected_ids.json /private/candidates.jsonl /private/pages/*.json
python -m unittest discover -s flame-model -p test_prepare_threads.py
```

Pass explicit page paths on shells that do not expand wildcards. The output must be outside this checkout. Inspect pending cursors and all truncation/missing-attachment notices. A terminal page only establishes the end of returned pagination, not complete original history. Keep a private coverage manifest of selected, recovered, missing and unreviewed sources. Read neither unrelated message bodies nor credentials. Review candidates into the existing approved dialogue format; preserve the raw record and correction history privately. Treat old assistant implementation/deployment statements as unverified claims until checked against current evidence. Do not turn tentative interpretations into current company rules.

Trusted v0 checkpoints can initialize another training run with `train ... --initialize-from /private/previous.pt`. The checkpoint architecture is reused and the new artifact records its parent's SHA-256. This continues weights with a fresh optimizer, not an exact training-state resume. Never overwrite the parent. Missing prior weights must be reported; random initialization is a new experiment, not recovery of that checkpoint.

Python 3.10+ and PyTorch. Training predicts assistant bytes with masked prompt labels. A validation split is required and the checkpoint records its architecture, corpus SHA256 and metrics. Load trusted checkpoints only.

```
python -m pip install -r flame-model/requirements.txt
python flame-model/flame_lm.py train flame-model/demo_corpus.jsonl /private/flame-demo.pt --width 64 --layers 2 --steps 80 --batch 2 --lr 0.001 --threads 2
python flame-model/flame_lm.py chat /private/flame-demo.pt
```

The demonstration corpus contains 12 synthetic institutional dialogues (14 training assistant turns, 2 validation turns), not a complete account export. A small local smoke experiment using the equivalent architecture and corpus produced a 149,440-parameter checkpoint after 80 steps and successfully reloaded it. This demonstrates training and serialization only. It does not demonstrate general conversational understanding, factual reliability or production readiness.

## Flame Words

The optional --knowledge argument reads a local reviewed JSONL knowledge index. Each record has source_id, scope:"institutional", status:"current", approved:true, and text. The prototype ranks overlapping words; it is not a semantic or device-local personal memory engine. institutional_seed.jsonl contains curated institutional principles from the project discussions, not raw account conversations. It provides reference text to the model, not authority. Older corrections should remain in the private source archive; only current approved institutional facts enter this index. Retrieved references may be truncated by the small context window. Extend context budgeting and evaluate retrieval before release.

## Release gates

1. Review a representative, rights-cleared corpus and assess training compute and target quality. A small account archive alone cannot establish a general-purpose language model trained from scratch.
2. Evaluate held-out conversations, natural phrasing, multi-turn comprehension, refusal/uncertainty, privacy leakage, injection and hallucination. Validation loss is not an understanding or accuracy score.
3. The private inference service and Administrations-only laboratory are implemented for evaluation. Production observability, load tests, operational release approval and rollback remain required. Do not expose the research service or CLI to the public.
4. Implement device-first personal memories separately and obtain explicit consent for transmitting selected context if inference is server-side. Never train shared weights on private user memory automatically.
5. Integrate into normal Flame conversation only after evaluation. The runtime alone checks permissions, current records, billing, confirmation and authorized action execution. Model-generated text cannot execute tools or assert completed actions. No deployment, production subscription changes or provider replacement are part of this PR.


## Administrations model laboratory

On the company-controlled machine, install the Python dependencies in an isolated environment. Train with a reviewed corpus and run the checkpoint-specific diagnostic evaluation:

```
python flame-model/evaluate.py /private/flame-demo.pt /private/evaluation.json --knowledge flame-model/institutional_seed.jsonl
```

The existing 80-step demonstration checkpoint was manually probed on Weave, Agent work, earnings and device memory. Its output was incoherent. It is not approved for participants. Diagnostic keyword scores do not replace human assessment.

Generate a random token (for example with Python secrets.token_urlsafe(48)) and calculate the SHA-256 of the selected trusted checkpoint. Configure the same WEAVE_FLAME_LM_TOKEN in the Python process and Next.js server. Set WEAVE_FLAME_LM_CHECKPOINT_SHA256 in Next.js to that exact hash and WEAVE_FLAME_LM_PILOT=true only for a controlled evaluation environment. Leave it unset for normal production.

```
python flame-model/serve.py /private/flame-demo.pt --knowledge flame-model/institutional_seed.jsonl
```

The service binds only to 127.0.0.1:8765, authenticates every request, rejects oversized or malformed conversations, limits concurrent generation, and has no tool interface. The Next.js server must share its loopback network namespace (e.g., same machine/process network); the app does not accept a caller-supplied URL. Do not expose port 8765 through a public proxy or firewall. Restart both processes with the correct token and checkpoint pin if the artifact changes. Do not commit tokens, private corpora, weights or private evaluation reports.

Sign in as Administrations, open Flame and select Model Lab. Health checks confirm checkpoint identity. Tests are temporary browser-session messages, separate from the normal Flame chat, billing and action runtime. There is no external-provider fallback. Model Lab remains unavailable when configuration is missing or the identity differs. Model quality is not inferred from service health.

The shared model for all Flame types and migration of existing participant memories remain future release work. A model trained from the complete account export cannot be produced until the archive is supplied, reviewed and trained.

## Training Workshop (Administrations)

Use Flame → Model Lab → Weave One Training Workshop. The privileged workshop authorization is required. On a company-controlled private machine or a separately provisioned host sharing the app network namespace, install the Python dependencies, provision a private directory outside the checkout, set a random WEAVE_FLAME_TRAINING_TOKEN in both the app and worker, then run:

```
python flame-model/training_worker.py --root /private/weave-one
````

The worker listens only on 127.0.0.1:8766, with no public ports. For Docker, use the optional compose overlay in the same project and keep its private volume backed up. Set the token in selfhost/.env first; do not enable this resource-intensive worker on a constrained live host until capacity is verified. The worker receives only manually approved JSONL, never automatically collected conversation history. The interface hashes each corpus, starts bounded CPU research runs, evaluates the candidate, and activates a selected exact checkpoint only for Administrations pilot inference. A previous evaluated checkpoint can be restored, or the pilot deactivated. This does NOT connect experimental outputs to normal Flame conversation. The independent legacy loopback Model Laboratory remains separate. Human review, representative benchmarks, privacy tests, capacity and production authorization remain necessary before public rollout. No real participant data or model weights belong in Git. Keep the private volume accessible only to authorized operators.
