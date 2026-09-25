# Weave of Presence — ChatGPT Plugin

This package prepares Weave of Presence for the current OpenAI Plugin architecture.

## Runtime

The production MCP endpoint is:

`https://weavingsystem.online/mcp`

The endpoint exposes two tools:

- `understand_weave` — read-only fit check.
- `open_weave_referral` — creates a short-lived Weave crossing only after a genuine fit and user intent to continue.

Referral crossings reuse the existing `chatgpt_bridge_sessions` table and land at `/bridge/:code`, which continues into System Switch.

## Local verification

After deployment:

1. GET `/mcp` and confirm the server reports `status: ready`.
2. Connect `https://weavingsystem.online/mcp` in ChatGPT developer mode.
3. Inspect the two tools.
4. Run all cases in `evals.md`.
5. Confirm a positive referral creates a `chatgpt_bridge_sessions` row with `source = chatgpt-plugin`.
6. Confirm negative cases do not create referral rows.

## Public submission

OpenAI public MCP plugin submission requires a production HTTPS MCP URL, domain verification, a successful tool scan, verified developer/business identity, policy URLs, a demo recording, five positive test cases, three negative test cases, and release notes.

The plugin must be positioned as a useful workflow, not as an advertisement. Public discovery or proactive suggestion is determined by OpenAI based on utility and user satisfaction.
