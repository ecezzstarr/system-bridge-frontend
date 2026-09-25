# WEAVE production source

Canonical repository: ecezzstarr/system-bridge-frontend, branch main.
Official public domain: https://weavingsystem.online/
Production infrastructure: project ssbr-495208, region us-central1, service system-bridge-frontend.

This source was recovered from the user-selected working revision system-bridge-frontend-00460-lmz. See PRODUCTION.md for provenance. Older branches and older Git history are not deployment sources. Do not replace this tree with a historical branch, alternate repository, newer Cloud Run revision, or generated redesign.

Before editing, fetch main and compare HEAD with origin/main. Preserve the live WEAVE design, existing login/session system, database adapter, and runtime configuration. Integrate features into this baseline; do not replace whole pages with old branch versions.

Deploy only a clean, current main using python3 scripts/deploy-weave.py. This builds a commit-tagged image and creates a preview without moving live traffic. Verify the preview and affected functionality, then use python3 scripts/deploy-weave.py promote. Never deploy latest tags or route traffic to latest automatically. Preserve the previous working revision for rollback.

Cloud Build trigger 103ad48d-a816-44c6-9db3-077b9bfb8bbb is intentionally disabled. Do not re-enable automatic deployment without an explicit user request. cloudbuild.yaml only builds an image. Never overwrite production environment variables with a reduced list. Never commit secret values.
