# Administration — multi-country Prospect Market supply

An authenticated hourly scheduler checks **published, unsold marketplace candidate contacts**. When the published total is **below 120**, it generates and publishes enough candidate records to reach 120, grouped into packages of up to five.

## Activation
1. In Administration > Prospect Engine, configure **at least three active country source series**, each with an international dialing prefix and a seed provided by Administration.
2. Enable automatic publishing. Default is disabled until configured.
3. Run once manually or let the hourly GitHub Actions workflow call GET /api/cron/prospect-market.
4. Deploy the new API before triggering the workflow. WEAVE_PROSPECT_MARKET_URL can override the deployment URL. Scheduled identity uses the established GitHub Actions OIDC verifier for this exact workflow on main.

## Rules
- One PostgreSQL transaction and advisory lock prevents concurrent double-replenishment.
- Stock counts only contacts belonging to published, unsold packages. Free Daily Prospect reserve is not counted and not consumed.
- Maximum published target is **120**, not 120 additional items.
- Country selection excludes the last **two** published country codes; persisted history preserves spacing across scheduler runs. With three sources the sequence rotates; with more sources the eligible selection is randomized.
- Uniqueness check prevents reusing an existing phone number, and every source's numeric cursor advances across runs.
- Each package costs 1.1 Flame Coin per candidate, consistent with existing default.
- Records are explicitly **unverified candidates**: phone ownership, existence, WhatsApp reachability, interest, permission and country validity are not established. The generator does not send any message or place calls.
- Source seeds and cross-border prospect handling require Administration review of provenance and applicable privacy/marketing requirements.

No source numbers are preloaded. Automatic publishing remains disabled until Administration configures it. GitHub changes are not live until tested and deployed.
