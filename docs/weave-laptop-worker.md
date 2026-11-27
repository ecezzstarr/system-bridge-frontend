# Company laptop connection and setup

The Infrastructure Workshop and Weave-owned server workshop now include a
Windows laptop connection. It is separate from the existing Linux production
PowerShell sentinel. No global host-control secret is needed for laptop pairing.
Oracle remains the production host until Administrations completes the existing
candidate-readiness and controlled transition process.

## Connect locally once

1. Deploy the reviewed application release containing this feature. Open
   `/admin/infrastructure` or `/admin/sovereign-server` as an appointed workshop
   Administration operator.
2. Download `weave-laptop-worker.ps1` from the connection panel. Review it and
   compare its SHA-256 with the displayed digest if checking the download.
   Respect the laptop's existing script execution/signing policy. This feature
   does not disable that policy or bypass Windows permission prompts.
3. In a local PowerShell window, from the download directory, run:

   ```powershell
   powershell -NoProfile -File .\weave-laptop-worker.ps1 -Pair -AllowSetup
   ```

   Start that window as Windows Administrator if Linux installation is needed.
   Omit `-AllowSetup` for checks only. The switch authorizes only the fixed WSL /
   Ubuntu and Docker Engine setup operations for that worker run.
4. In Weave, name the laptop, type `CONNECT LAPTOP` and create a connection code.
   It expires in ten minutes, works once and replaces earlier unused codes from
   that operator. Paste it into the worker's masked local prompt after typing
   `CONNECT` there. Do not send the code through chat, email or a URL.
5. Keep the worker window running. Select the connected laptop in Weave and run
   `CHECK LAPTOP`. The page refreshes reports and history every fifteen seconds
   while visible. Closing the window or Ctrl+C stops new polling.

The device credential lasts thirty days. Its server copy is hashed. Its local
copy is a Windows DPAPI-protected credential in
`%LOCALAPPDATA%\Weave\LaptopWorker\connection.xml`, under a directory limited to
that Windows account and SYSTEM. Reconnect from the same Windows account using
the command without `-Pair`. A new local account needs a new pairing. A failed
pairing response may consume the code; issue a fresh one and revoke any unused
device record rather than retrying an old code.

## Installation sequence

- **Install Linux:** the worker must have local `-AllowSetup` permission and
  Windows Administrator rights. The website queues only the fixed command
  `wsl.exe --install --distribution Ubuntu --no-launch`. It does not accept
  executable names, arguments or shell text from a browser.
- **Local restart/account setup:** Windows may need a restart. The worker never
  restarts it automatically. Launch Ubuntu locally and finish its user/account
  setup, then restart the laptop worker without `-Pair`.
- **Install Docker:** the worker runs a fixed local script as root in that
  Ubuntu distribution. It installs Docker Engine and Compose using Docker's
  official Ubuntu repository and starts the local Docker service. It refuses
  conflicting container packages rather than uninstalling them. It does not
  create containers, expose a Docker TCP socket, transfer company data or change
  production routing. Review the installation locally if an operation fails.

Sources for the fixed setup commands:

- [Microsoft WSL commands](https://learn.microsoft.com/en-us/windows/wsl/basic-commands)
- [Docker Engine installation on Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

The worker has no automatic startup task. Initial local installation, Windows
approval, reboot and Ubuntu account setup cannot be performed by the website
alone. After that local connection, supported checks and installation requests
can be initiated and tracked from Administrations, including on a phone.

## Operation receipts and revocation

Each queued request expires after ten minutes if unclaimed. A device can have
only one queued/running operation. Claiming creates a separate one-use lease;
only the same device and lease can submit its result. A repeated identical
receipt is idempotent. Running jobs expire to `indeterminate` after thirty
minutes and are never automatically requeued. Native setup times out after
twenty minutes. Inspect local package/WSL state before retrying an interrupted
or timed-out operation.

**Disconnect laptop** revokes its credential and cancels pending work. A native
installation already started may finish locally; revocation does not claim to
roll back or forcibly terminate it. Disabled/demoted Administration accounts or
changes to the privileged operator allowlist also stop their device credentials
from authenticating. Issuance, pairing, requests, claims, results and revocation
are recorded in dedicated company audit events. Device grants and lease tokens
are excluded from browser state/history responses. Only booleans and bounded
capacity numbers are accepted as telemetry; command output, personal files,
hostnames, IPs, usernames and credentials are not uploaded.

## Production remains a separate decision

Connected/installed does not mean ready for production. Measure actual Linux
resources, keep a separate staging database and media, verify backups and
recovery, test company workflows and follow
[the existing host-transition procedure](weave-sovereign-server-transition.md).
A laptop sharing limited RAM with Windows may be suitable only for preparation
until real capacity and reliability checks pass. Do not lower readiness gates
or change Oracle traffic merely because the worker reports online.

Validation uses isolated PostgreSQL transactions for pairing races, duplicate
claims, operation scope, receipt replay, expiry and revocation, plus parser and
mocked PowerShell dispatch tests. The tests never install software or contact
production.
