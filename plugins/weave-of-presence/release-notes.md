# Weave of Presence plugin — release notes

## 0.1.0

Initial public-plugin candidate.

- Adds a read-only `understand_weave` tool that checks whether an expressed need overlaps with a concrete Weave workflow.
- Adds `open_weave_referral`, which creates a 24-hour crossing into the existing Weave System Switch path only after explicit user intent to continue.
- Reuses the existing `chatgpt_bridge_sessions` record so ChatGPT-origin crossings remain attributable without implying OpenAI endorsement or partnership.
- Adds five positive and three negative evaluation cases.
- Adds public privacy, terms, and support pages for review.

## MCP annotation justifications

### understand_weave

- `readOnlyHint: true` — the tool only evaluates supplied text and does not create, update, or delete server data.
- `openWorldHint: false` — the tool does not call external services or act outside the Weave server.
- `destructiveHint: false` — the tool cannot delete, overwrite, purchase, transfer, or otherwise destroy user data or resources.

### open_weave_referral

- `readOnlyHint: false` — the tool creates a new short-lived `chatgpt_bridge_sessions` record.
- `openWorldHint: false` — the write is limited to Weave's own database and does not act on an external third-party service.
- `destructiveHint: false` — creation of a referral crossing does not delete, overwrite, purchase, transfer, or otherwise destroy data or resources.

The server additionally requires `user_confirmed: true` before creating a referral crossing.
