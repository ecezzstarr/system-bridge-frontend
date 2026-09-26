# Deployment smoke fix and recovery

Confirmed main: e35d35e4a83a432db962570b399c19c037695333.

The failure is not stale homepage wording. app/page.tsx and lib/weave-system-map.ts still contain both asserted phrases. app/layout.tsx wraps the homepage in DivineShieldGate; its initial render returns only the Opening WEAVE loader while auth initialization and the shield check are pending. Python urllib does not run browser JavaScript, so stripping tags from the HTTP response cannot verify the rendered homepage.

The corrected script checks visible browser content after initialization, retaining both identity phrases and all existing API/route checks. It also verifies the entry link, disappearance of the boot overlay, and an inactive, healthy maintenance boundary. Promotion requires a ready zero-traffic candidate with the full expected commit label and canonical-main provenance, and rechecks source and candidate before traffic changes. Python optimization is rejected so assertions cannot be silently disabled.

## Continue the existing candidate

Run these short blocks in Cloud Shell, one at a time. Keep ~/weave-deploy on its clean original main at e35d35e4a83a432db962570b399c19c037695333. Do this before merging the smoke-fix PR. Do not pull or check out the fix branch into the deployment checkout: that would change the source SHA used to identify the candidate.

```bash
cd ~/weave-deploy
python3 -m venv /tmp/weave-smoke
/tmp/weave-smoke/bin/pip install playwright==1.63.0
```

```bash
/tmp/weave-smoke/bin/playwright install --with-deps chromium
```

```bash
git fetch origin fix/hydrated-homepage-smoke
```

```bash
git show 0261f1abc57938219e1c57edb98291ba431bf23c:scripts/deploy-weave.py > /tmp/deploy-weave-fixed.py
```

```bash
WEAVE_SOURCE_ROOT="$PWD" /tmp/weave-smoke/bin/python /tmp/deploy-weave-fixed.py promote
```

The final command checks the existing tagged candidate and promotes only after every smoke check passes. It never invokes Cloud Build or creates a revision. Expected candidate: system-bridge-frontend-weave-e35d35e4a83a. The script supplies project ssbr-495208 and region us-central1 explicitly.

Stop if any block fails. If main has advanced, the source check fails safely; do not bypass it. If the maintenance shield is active, this script does not disable it. Candidate readiness, traffic, and live browser/API results still need verification in Cloud Shell; they have not been verified from this workspace.

After successful promotion, inspect actual traffic (latestReadyRevisionName alone does not prove production traffic):

```bash
gcloud run services describe system-bridge-frontend --project=ssbr-495208 --region=us-central1 --format='yaml(status.traffic)'
```

## Validation

Seven Python regression tests pass, covering candidate validation, no-build promotion, failure blocking, candidate changes, and preserved API checks. Seven real headless Chrome fixture tests pass, covering delayed browser rendering and rejection of loaders, script-only content, hidden content, missing identity, persistent overlays, and HTTP errors. These are fixture tests, not a live candidate smoke result. No application code changed and no production build was run.

Repository tests:

```bash
python3 -m pip install -r scripts/requirements-deploy.txt
python3 -m playwright install --with-deps chromium
python3 scripts/test_deploy_weave.py
python3 scripts/test_deploy_browser.py
```

Playwright installation reference: https://playwright.dev/python/docs/intro

