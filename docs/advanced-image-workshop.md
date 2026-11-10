# WEAVE Image House and optional advanced AI studio

The Company Image House (/image-workshop) is the default commercial product. It serves original editable visual samples without an AI key. User-authorized paid licenses create positive company System Switch receipts and can support independent customer service work. Never replace or redirect this paid workshop to a free or unconfigured AI generator.

The optional advanced AI desk (/image-workshop/ai) uses the existing server-only OpenAI /api/image-workshop API. It offers PNG image generation, PNG/JPEG/WEBP reference editing and saved-image refinement with current IMAGE_PRESETS, IMAGE_MODELS and IMAGE_SIZES. Its private gallery uses authenticated image download /api/image-workshop/assets/[id] with owner-scoped database checks. It does not claim GIF animation, SVG vector delivery, unsupplied editing masks or other currently unsupported provider behavior.

## Costs and activation

- Default: disabled; WEAVE_IMAGE_WORKSHOP_ENABLED must equal true, and OPENAI_API_KEY must be configured privately on the WEAVE host. A ChatGPT Plus subscription cannot be used as an API key.
- Administrations explicitly authorizes provider spending and IMAGE_WORKSHOP_DAILY_LIMIT quotas before enabling it. The existing API consumes provider-billed credits, and **does not currently charge System Switch or create a WEAVE commercial sale**.
- Keep the paid no-API Image House fully usable regardless of provider readiness. Do not describe free AI requests as company earnings.
- API quality and model access require an actual preview/provider call and independent billing verification; passing source CI is not external proof.

## Authorization and privacy

GET image downloads confirm the requested database record belongs to the authenticated active account; direct public media URL use is avoided in the AI studio. Originals and user-created files remain subject to the company's terms, appropriate rights and approved work permissions. Providers receive the user prompt and any uploaded reference when AI generation is enabled.

## Release checks

Run node tests/advanced-image-workshop.cjs along with paid Image House regressions, TypeScript, production build and container checks. Test Agent, Bridger, Client and Administrations access from actual sessions. Confirm Image House sales, AI off-state, secure asset reads, provider calls and persistence in staging before promotion. A merged PR is not proof of live operation.
