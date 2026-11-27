# Flame Language Model v0

One Weave-owned model foundation, with distinct Eight, River and Echo roles supplied by authorized runtime context. This is an experimental from-scratch causal Transformer, not a production-ready conversational model or an external provider wrapper. The existing production Flame engine remains unchanged.

## Private account corpus

Export the founder's ChatGPT account through Settings > Data Controls > Export Data. Keep the archive on a company-controlled device outside the repository. Select Weave-related conversation IDs into an explicit JSON array. Run:

```
python flame-model/prepare_archive.py /private/conversations.json /private/selected_ids.json /private/review.jsonl
```

The extraction follows the selected conversation branch in chronological order. It includes only user/assistant text and produces unapproved records. It does not fetch accounts, images, attachments or alternate branches. Review locally: remove personal details, credentials, unrelated conversations, outdated policy and unsupported claims; preserve source provenance and corrections. Do not put real private archives or trained weights in Git. Manually construct reviewed JSONL rows with source_id, approved:true, split (train or validation), and alternating user/assistant messages. Keep an entire conversation in one split. Human review is required; an approval flag is not automatic redaction. No live participant messages are training data by default.

## Model

Python 3.10+ and PyTorch. Training predicts assistant bytes with masked prompt labels. A validation split is required and the checkpoint records its architecture, corpus SHA256 and metrics. Load trusted checkpoints only.

```
python -m pip install -r flame-model/requirements.txt
python flame-model/flame_lm.py train flame-model/demo_corpus.jsonl /private/flame-demo.pt --width 64 --layers 2 --steps 80 --batch 2 --lr 0.001 --threads 2
python flame-model/flame_lm.py chat /private/flame-demo.pt
```

The demonstration corpus contains 12 synthetic institutional dialogues (14 training assistant turns, 2 validation turns), not a complete account export. A small local smoke experiment using the equivalent architecture and corpus produced a 149,440-parameter checkpoint after 80 steps and successfully reloaded it. This demonstrates training and serialization only. It does not demonstrate general conversational understanding, factual reliability or production readiness.

## Flame Words

The optional --knowledge argument reads a local reviewed JSONL knowledge index. Each record has source_id, scope:"institutional", status:"current", approved:true, and text. The prototype ranks overlapping words; it is not a semantic or device-local personal memory engine. It provides reference text to the model, not authority. Older corrections should remain in the private source archive; only current approved institutional facts enter this index. Retrieved references may be truncated by the small context window. Extend context budgeting and evaluate retrieval before release.

## Release gates

1. Review a representative, rights-cleared corpus and assess training compute and target quality. A small account archive alone cannot establish a general-purpose language model trained from scratch.
2. Evaluate held-out conversations, natural phrasing, multi-turn comprehension, refusal/uncertainty, privacy leakage, injection and hallucination. Validation loss is not an understanding or accuracy score.
3. Implement an authenticated internal inference service, bounded concurrency, observability without raw personal logs, versioned checkpoints and rollback. Do not expose the research CLI to the public.
4. Implement device-first personal memories separately and obtain explicit consent for transmitting selected context if inference is server-side. Never train shared weights on private user memory automatically.
5. Integrate into Flame conversation only after evaluation. The runtime alone checks permissions, current records, billing, confirmation and authorized action execution. Model-generated text cannot execute tools or assert completed actions. No deployment, production subscription changes or provider replacement are part of this PR.

