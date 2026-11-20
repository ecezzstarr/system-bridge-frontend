# WEAVE File Folder — academic project workshop (2026-11-20)

## Purpose
A purchased Client File Folder is not restricted to running a commercial platform. Its
Blueprint Foundry also supports independently owned school and research projects,
without conflating academic work with customer sales.

This change adds three Client-scoped project directions:

- **Civil engineering school project:** bridge/structural, drainage or transportation study, with a preliminary simply supported-beam worksheet for one narrowly defined structural load case.
- **Research and dissertation:** investigation, sources, methodology, evidence, review and presentation.
- **Software and technology capstone:** requirements, prototype path, evidence, testing and reporting.

The existing **Schools and education network** project is unchanged: that template
creates school-management infrastructure, which is different from doing a student's
project.

## How it works
1. The verified Client or activated Pro Regional Manager enters their own File Folder,
   then Pro **Project Workshop** / **Blueprint Foundry** (other tiers have the existing Blueprint Foundry).
2. Select **School & research**, choose one of the three directions, enter a project title
   and purpose/assignment brief, and create a Client-owned project.
3. The existing authenticated `create_platform_project` action saves the project in
   `client_file_folder_platform_projects`. The same owner/file-number access rules,
   10-project limit, uniqueness constraint and project snapshot apply. This does
   not create a new account type, student entitlement, public project or wallet.
4. Each project lists real *supporting File Folder system* blueprints (e.g. Research
   Room, Operations Board, Data Room, Learning Lab, Intelligence Lab). Their statuses
   come from actual purchased/active construction records. They are **not** school
   grade, research-completion or design-approval statuses.
5. Civil engineering projects expose a local, deterministic beam worksheet for a
   simply supported span under full-span uniformly distributed load and one
   optional midpoint concentrated load. It calculates total applied load,
   symmetric reactions, maximum shear and maximum bending moment, and produces
   a copyable calculation note. No worksheet data is automatically saved.
6. Project plans carry no new System Switch charge. Any actual blueprint material
   purchase retains its existing pricing, receipts, builds and activation requirements.

## Engineering worksheet equations
Inputs: span `L` (m), uniform load `q` (kN/m), midspan point load `P` (kN).

- Total load = `qL + P` kN
- Reaction at each support = `(qL + P)/2` kN
- Maximum absolute shear = `(qL + P)/2` kN
- Maximum positive bending moment = `qL²/8 + PL/4` kN·m

The worksheet validates finite, nonnegative loads and positive span. It assumes
linear static equilibrium, simple supports, symmetric vertical loading and idealized
conditions. It does not calculate section stresses, deflection, buckling, foundations,
dynamics, wind, water, earthquake actions, load combinations or safety factors.
It is not CAD, finite element analysis, construction planning or certified structural design.
A qualified engineer and school supervisor must validate all real applications.

## Deliberately unchanged
- Four File Folder tiers, their themes, official imagery, real 3D geometry,
  purchase and verified ownership.
- Server-side authorization, construction inventory and prices, receipts,
  client activation, Customer Doors and public access policy.
- Existing `education_network` school administration template.
- No invented completed project, survey, lab result, academic grade, employment,
  sale, income or certification.

## Not yet implemented
Student accounts without an active Client File Folder, institution/supervisor sharing,
submission and grading integrations, project-specific document uploads and versioning,
persistent calculation notebooks, full CAD/FEA or hydraulics simulations, and
career-adaptive Pro 3D architecture beyond the existing owner-named Pro world.

## Validation
- `node tests/file-folder-world-runtime-regression.cjs` — new academic kinds,
  non-public-school boundaries, limitations, beam equations, invalid-input handling,
  UI connection; plus prior system-project contracts.
- `node tests/pro-file-folder-textured-world-regression.cjs` — Pro scene access and
  owner-record 3D behavior.
- Before merge or production: TypeScript, Production Check, real Android/desktop
  navigation, authenticated Client/Pro account tests, confirmed project persistence,
  kit prices, and screenshot review against the approved Pro reference image.

The code change itself does not constitute a successful end-to-end production test.
