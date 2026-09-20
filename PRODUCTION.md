# WEAVE live app

The canonical source is this repository's main branch.
Live app: https://system-bridge-frontend-823579957639.us-central1.run.app/

## Recovered baseline
- Revision: system-bridge-frontend-00460-lmz
- Image digest: sha256:4c2b30a07b4e5d386abe8defa358315848dabb026a0f5b4ed63e629103e3dffc
- Build: ba527fa7-7eff-404a-b9f5-b19c55665b8d
- Source: gs://ssbr-495208_cloudbuild/source/1789363455.615794-5da615550d7f4913be0831ea66c7d6a1.tgz, generation 1789363457481782

September 16–17 Company Loops, Client Position, and Agreements changes are integrated into this baseline. The live dashboard and login are preserved. The broken Authority Workshop route resolves to the existing live administration workshop. Database additions are idempotent and do not delete records.

## Deployment
Use a clean main equal to origin/main. Run python3 scripts/deploy-weave.py to build and validate a preview. Review changed features, then run python3 scripts/deploy-weave.py promote. The script preserves the serving revision's runtime settings and pins traffic explicitly. The legacy login fallback is supplied by Secret Manager as PLATFORM_ADMIN_FALLBACK_PASSWORD, never stored in Git.

The previous automatic Cloud Build trigger is disabled to prevent unwanted revisions. Existing Git history is retained for recovery, not used as the active source. Do not deploy old branches.


## Recent feature recovery
The September feature integration is recorded in docs/recent-feature-integration.json.
It includes River context/outreach, Human Cadences search, client business stores and international payment settings, and Flame crossings/provider reporting. Authority Workshop is restored at /authority/workshops, linked from the live sidebar. Client workshops use the existing users/sessions identity and the live database pool.
The legacy EIGHT deployment action is blocked; deploy only through the preview/promotion script. The image build now runs tests/recent-features.cjs before compiling.
Verify authenticated admin reporting, client authorization, and public cadence search before promotion. External payment and outreach actions must not be exercised as smoke tests.
