# WEAVE Code Workshop — Administration source control and corporate guardrails

## Institutional purpose

WEAVE is one continuing company, not a collection of independent pages.
Administration (A Time) establishes permissions, systems, policies, reviews and
records so that Agents (Stability), Bridgers (Hope), and Clients (Dream Lovely)
can carry their own authorized work into measurable value. The company's
infrastructure must support participants without confusing company control
with another person's business, funds or employment.

The Code Workshop is a company-owned **source authoring interface**, not
a public web shell. It is connected to the canonical GitHub repository
`ecezzstarr/system-bridge-frontend` and hands off reviewed releases to the
existing GitHub → Oracle deployment workflow.

## Source authoring from inside Administration

1. Open `/admin/code-workshop` from the Administration workplace or Control Center.
2. Log in as an explicitly appointed privileged administrator. Do not use
   a public Client, Agent, Bridger or ordinary non-authorized Admin session.
3. Browse the allowed source directories and open a file. The `main` branch
   is **read-only** from this editor.
4. Type `CREATE DRAFT` and create a private GitHub branch belonging to the
   current administrator. The browser cannot select or write an arbitrary
   branch.
5. Edit an allowed text file. Describe the change in the commit message,
   type `SAVE DRAFT` and commit. The server checks file hashes before the
   write so a stale edit cannot silently overwrite another change.
6. Supply a PR title, scope and test evidence; acknowledge the four governance
   safeguards; type `OPEN REVIEW`. A PR is opened targeting `main`.
7. Review code in GitHub and in `/admin/release-workshop`. The protected
   merge requires the **exact reviewed head SHA**, passing PR Production Check
   and any required external review; type `MERGE #<number>` only after review.
8. The new `main` SHA must pass a **different push-to-main Production Check**.
   Administration may then request the exact SHA in the Release Workshop.
   The independent Oracle host worker must verify local and public health
   before the release is recorded as healthy in Sovereign + Flame.
9. If the server is unavailable, use the existing privileged manual recovery
   workflow. Do not build a browser-accessible terminal to circumvent the host.

## Private initial configuration

On the actual private application server, set:

- `WEAVE_WORKSHOP_ADMIN_IDS`: comma-separated, exact UUIDs of the approved
  active Administration accounts that can operate source, merge and release
  workshops. These UUIDs are **not** passwords and cannot be supplied by a
  browser. For an installation with multiple active admins, privileged
  access remains denied until this is explicitly configured. A single
  active administrator still follows the existing legacy behavior when the
  variable is absent.
- `WEAVE_GITHUB_CODE_TOKEN`: a separate scoped GitHub App/fine-grained
  credential with Contents write, Pull requests write and metadata read for
  this one repository. Keep it server-side, out of Git, chat and client
  responses. Make this token **incapable of bypassing protected main**.
- `WEAVE_GITHUB_READ_TOKEN`: optional token with read access to repository
  contents and metadata.
- `WEAVE_GITHUB_PROMOTION_TOKEN`: a **separate** credential used by the
  existing reviewed merge process, not by the source editor.

Do not activate the Code Workshop without verifying server-side credentials,
authenticated operator identity, audited source changes, test checks and the
independent release worker. Changes to these variables require a controlled
service restart; they are not editable in the browser.

## Security boundary

**The allowed source editor is deliberately narrower than GitHub itself.**
Allowed top-level locations are app, components, lib, tests, docs and limited
public text. Security, session handling, authorization, wallet, payments,
release, privileged APIs, dependencies, migrations, infrastructure scripts
and source-workshop authority files are blocked in the browser editor. Those
changes require independent engineering review and standard GitHub change
control.

The command bar supports fixed navigation and status commands only:
`help`, `status`, `ls <directory>`, `open <path>`, and `clear`.
It cannot execute Linux, SQL, shell scripts, Docker, PowerShell, SSH, package
installations, arbitrary Git commands, or changes to a running container.
No browser access to the Docker socket, filesystem secrets or Oracle keys
is created. This is an intentional safeguard, not an incomplete shell.

Every source promotion requires independent review, a passing Production Check,
and a separately verified company release authorization.

A draft commit or PR is never represented as deployed production code.
Each creation, source commit and PR opening is recorded with the actor,
branch and relevant identifiers. GitHub remains the definitive source
history. Sovereign + Flame records remain the deployment history.

## Company governance and policies

The public operating reference at `/policies` covers departments,
employment, File Folder ownership, employees, customer records, prospect
conduct, verified payment rails, financial accountability, privacy, AI,
software changes, disputes and corrections.

The current Terms of Service (`/terms`) and Privacy Notice (`/privacy`)
link to that document. These rules clarify existing operations; they do
**not** silently create salary, guarantee earnings, change a paid order,
remove lawful refund rights or rewrite previously signed agreements.
Formal counsel and the company owner should review material changes to
binding terms, with new acceptance recorded where legally required.

## Release readiness checklist

- Company code author identity is verified against the designated operator UUID.
- Source is on a personally owned GitHub draft branch, never directly on main.
- Sensitive data, authentication, wallet, financial and release code remain
  inside independent engineering review controls.
- Any proposed user-facing service has truthful copy, authorized scope,
  payment disclosures and meaningful failure handling.
- PR checks and independent approvals have passed on the exact reviewed SHA.
- A separate main Production Check has passed on the exact deployed SHA.
- Host rollback backup and database/media continuity have been verified.
- Live local/public health, active SHA and Sovereign + Flame records agree.

The foundational workshop does **not** certify that all future systems are
implemented or compliant. Future feature development still requires
individual specifications, tests, authorized releases and periodic audits.
