# WEAVE Advanced AI Image Workshop

**Routes:** `/image-workshop`, `/api/image-workshop`, and `/api/image-workshop/media`.

The classic browser Canvas image creator at `/agent/creative` remains free and unchanged. This additional workshop supports real AI image generation and reference-based image edits, with original work saved to a private, durable WEAVE media volume. It is linked from the shared Agent/Bridger/Client worlds and Administrations Authority.

## Activation and real provider costs

The interface is present after deployment, but provider generation **does not activate automatically**. Configure these *server-side* environment variables on the WEAVE host (not in the browser or Git repository):

- `OPENAI_API_KEY`: an approved OpenAI API project key with image-model access and billing.
- `WEAVE_IMAGE_WORKSHOP_ENABLED=true`: an explicit Administrations opt-in for provider spending.
- `WEAVE_IMAGE_WORKSHOP_DAILY_LIMIT=8`: optional maximum new image outputs per authenticated account per UTC day (1–30).
- `DATABASE_URL`: the existing WEAVE PostgreSQL database for gallery and job records.
- `WEAVE_MEDIA_ROOT`: an already-mounted persistent host media volume. Generated files go to `weave-private/images/<user-id>/`. Do not use ephemeral build or container storage.

The image models configured in this release are `gpt-image-2.5-flare` (faster creative production) and `gpt-image-2.5-sunburst` (precise image edits). Verify their availability and current provider pricing before activation. Provider account verification may be required.

**No user System Switch wallet balance is deducted by this initial release.** Administrations must approve a pricing and receipt policy before monetized calls are enabled. In the meantime, the server applies an explicit daily cap, allows at most one active request per account and produces only one or two images at a time. The cap does not replace provider-level spending limits.

## Workflow

1. Enter the AI Image Workshop from a department world, the free Creative Studio, or Administrations Authority.
2. Describe your image and choose one of 12 visual styles, portrait/square/landscape dimensions, engine, detail, and background.
3. Optionally upload up to three validated image references, or select a previous private gallery image for iterative editing. Use a prompt that states what to keep and change.
4. Generate one or two new image outputs. The application sends the request *from the server* to the provider and saves verified PNG responses under the durable WEAVE media volume.
5. Return to your own gallery later to download or refine previous images.

## Access and privacy

WEAVE authentication checks every generation, gallery listing and media fetch. Users, including active Client Legions, only access image records owned by their own account. The general `/api/media` route denies `weave-private/images/`; private thumbnails are loaded using authenticated fetch requests and revocable browser blob URLs. The model may process uploaded reference content under the provider's applicable terms.

No automatic customer publishing, File Folder resale, System Switch debit, or third-party social posting is implied. Those require separate verified commerce/consent/permissions flows. No generation is claimed when the provider key is absent or the provider returns an error.

## Checks

Run `node tests/image-workshop.cjs` and the existing production checks. Verify the host has a persistent media mount, provider billing and model access, and working credentials before turning on `WEAVE_IMAGE_WORKSHOP_ENABLED`.

**Release safety:** A GitHub merge alone does not deploy this feature. Administrations must complete the existing Production Check and release procedure, and inspect the first live creation and private download.
