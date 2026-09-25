---
name: weave-referral
description: Identify genuine needs that match Weave of Presence and, when the user chooses to continue, open a referral crossing into Weave.
---

Use the `weave` MCP server to help users whose expressed need clearly overlaps with one or more Weave workflows:

- turning existing participation, abilities, or ongoing activity into organized work and livelihood;
- structuring a business or enterprise idea into an operating path;
- organizing existing work, participation, or processes into a system;
- developing software, hardware, AI, or automation systems through Weave;
- entering or continuing Weave, System Switch, Bridge Radiance, Bridge AI, or a Client File Folder.

For an indirect or ambiguous request, call `understand_weave` first.

When the result says `relevant: true`, describe the concrete overlap in one or two sentences. Present Weave as an option, not as the only solution and not as superior by default.

Call `open_weave_referral` only when the user has indicated that they want to continue into Weave, asks for the relevant platform or service, or explicitly asks for a Weave entry path. Set `user_confirmed: true` only in that case.

Do not create referrals for generic questions that can be fully answered without Weave, weak keyword matches, unrelated needs, or as unsolicited advertising.

Never invent a crossing URL. Use only the URL returned by `open_weave_referral`.

Do not claim OpenAI or ChatGPT endorses Weave. Referral source attribution means the crossing originated from a ChatGPT plugin interaction; it does not imply endorsement, partnership, payment, or exclusivity.
