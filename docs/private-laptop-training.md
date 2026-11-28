# Private laptop training transport

Oracle remains production. This adapter uses the existing DPAPI-paired laptop
credential and fixed outbound HTTPS endpoint. It opens no port, shares no token
with the application host, and cannot execute browser-supplied shell commands.
The normal Flame runtime and its 8765 loopback laboratory remain independent.

## Local installation and connection

Use a reviewed commit after **Production Check** and **Private model research
checks** pass for that exact SHA. Do not deploy this feature from a draft PR.
Install official Python 3.12 locally, then run the reviewed installer with its
absolute executable path:

```powershell
powershell -NoProfile -File selfhost\install-laptop-training.ps1 -Python 'C:\path\to\python.exe'
```

Respect Windows signing/execution policy; do not use ExecutionPolicy Bypass or
disable protections. If policy rejects the script, the local operator must use
their approved signing/trust process. Installation uses a dedicated virtual
environment, pinned CPU-only torch 2.6.0 from the official PyTorch index, and six
fixed engine files. It creates no scheduled task or public listener.

The persistent installation is `%LOCALAPPDATA%\Weave\LaptopWorker\Training`.
Its parent has an account-and-SYSTEM-only ACL. Model weights, JSONL, evaluation
reports, crash markers and receipts stay in its private `data` subdirectory,
outside Git. Never copy that directory into a repository or public downloads.

Pair with the existing `/admin/sovereign-server` connection panel and masked
local worker prompt. Codes and credentials must never be sent in chat. Existing
pairing documentation: [Laptop worker](weave-laptop-worker.md).

An authorized host operator sets only `WEAVE_FLAME_TRAINING_DEVICE_ID` to the
paired device's public UUID in private application settings, preserving all
existing production settings. This selects outbound transport instead of the
original loopback training service; no training token is needed for this mode.
Do not change DNS, hosting, production model flags or Oracle access.

Start the locally installed adapter from the reviewed PowerShell worker:

```powershell
powershell -NoProfile -File public\host\weave-laptop-worker.ps1 -Training
```

The worker decrypts the existing credential locally and sends it to its fixed
Python child over stdin, never argv, environment variables or logs. Keep the
window open. Closing it stops polling. A process lock prevents multiple native
training adapters using the same private data directory.

## Workshop verification

1. Open `/admin/flame-training` as the pairing Administration. A fresh, device-
   authenticated native status is required (90 seconds maximum age).
2. Import a human-reviewed JSONL, maximum 1 MiB. The native validator enforces
   explicit approval, alternating messages, byte bounds, source-disjoint train/
   validation splits and at most 2,000 assistant turns. An `approved:true` flag
   does not prove a person reviewed the contents. Never ingest private chats
   automatically.
3. Start a synthetic one-step run first. Training is limited to 2 CPU threads,
   fixed tiny architecture, 1–2,000 steps, 2-hour training and 15-minute evaluation
   deadlines. Import/training stop at a 2 GiB data budget or below 2 GiB free disk.
4. Inspect evaluation and exact checkpoint/report hashes. Activate only the
   private pilot. Train a second checkpoint, activate it, restore the first,
   verify its SHA, then deactivate and confirm `current:null`.
5. Record workshop status, job UUIDs, corpus/checkpoint hashes, timestamps and
   actual human assessment. Diagnostic keyword passes do not establish language
   quality, safety or general model readiness.

## Failure and retention behavior

The durable queue allows one open training action per node and 100 requests per
day. Claim and receipt use the existing authenticated device transaction plus a
separate hashed lease. Only the configured node can poll this channel. Jobs
expire unclaimed after 10 minutes or unacknowledged after 5 minutes; uncertain
actions are never automatically requeued. Training start acknowledges the run
immediately; the long computation reports asynchronously in subsequent status.

Local markers and saved receipts prevent replay from executing an action twice.
A crash after starting an action requires local inspection. Receipts, native
reports and test outputs are private; browser status and job receipt endpoints
require workshop authorization. Payload JSONL is cleared from the queue on
receipt or expiry, but database backups may retain it under existing retention.
Archive/delete old private native artifacts only through an approved local
review; the worker does not automatically delete training evidence.

Revoking the laptop, disabling the pairing operator, or removing them from the
privileged allowlist stops further authenticated exchanges. Already-started
native computation can finish locally. Stop the local process to stop its work;
do not assume revocation rolls back a native checkpoint activation. Unset the
device selector to restore the original loopback workshop transport.

Automated synthetic tests exercise corpus rejection, actual one-step training,
evaluation hashes, two-checkpoint pilot activation, restoration, deactivation,
receipt replay and action refusal. Isolated PostgreSQL tests exercise pairing,
claim races, wrong leases, expiry, revocation and payload removal. None contact
production or import account histories.
