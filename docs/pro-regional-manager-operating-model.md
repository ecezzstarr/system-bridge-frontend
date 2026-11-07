# Pro Regional Manager — separate from Regional Manager

## Position contracts

**Regional Manager** is an existing Bridger/Hope or Agent/Stability departmental appointment. It does not grant, require, or activate a File Folder. Its applications, team assignments, Lifestyle page, and commission records remain in the `weave_regional_manager_*` system. An ordinary appointment must **never** be inferred from a Pro File Folder or vice versa.

**Pro Regional Manager** is a separate, global company position open to eligible Bridgers, Agents, and Clients. Each approved Pro manager has a verified company appointment, independently documented agreed salary and other written terms, a personal Pro File Folder and business plan, a recorded operating location/address, an independent Pro activation process, and department-specific operating functions. A person retains their original Hope, Stability, or Dream Lovely department.

An approved Pro appointment is not a purchase: neither a payment nor a File Number alone creates a company job or salary. A Pro activation fee is never a refundable deposit, a loan repayment, or a precondition for releasing unrelated funds.

| Position | Eligible source role | File Folder | Program |
|---|---|---|---|
| Regional Manager | Bridger / Agent only | None | Departmental Lifestyle and operating assignments |
| Pro Regional Manager | Bridger / Agent / Client | Own verified Pro Folder | Pro company appointment, business plan, activation, departmental operations |

## Two official Pro Regional Manager entrances

**Agent and Bridger — Lifestyle position application.** An existing authenticated Agent/Stability or Bridger/Hope opens `/weave/lifestyles/pro-regional-manager` from the Pro Regional Manager position in Lifestyle. The application records operating country/region/city/address, Pro business name, a four-part business plan and departmental daily work plan. Administration reviews the private application at `/admin/pro-regional-manager-applications`, independently verifies signed agreed salary and employment records, and records approval as **approved pending Pro verification**. This is not a File Folder activation or payment instruction. The draft implementation now reserves an original-role Pro File Number after Administration approval, collects signed terms and blockchain payment evidence, and requires an independently verified 680 USDT TRC-20 receipt before activating the owner's Folder and daily work. No applicant should be instructed to pay until the official wallet is shown in their verified activation workspace.

**External Client — issued File Number verification.** An invited Client outside the existing WEAVE Agent/Bridger Lifestyle enters `/client/pro-verification`, presents an issued File Number, submits their business plan, signature and actual location/address, and receives private session-bound verification status. Administration reviews identity, company-approved Pro staff offer and terms at `/admin/pro-file-number-verifications` before the approved activation payment; account ownership and the File Folder are verified before starting operations. CJ Dorado is the first Dream Lovely/Client Pro Regional Manager test.

Both entrances belong to the same **Pro Regional Manager** position, with role-specific daily work and a Pro File Folder; they are not the ordinary Regional Manager application path. Never expose private Client identity or salary to an applicant through File Number lookup alone.

## Pro onboarding and verification

1. Administration creates or verifies a **Pro Regional Manager** appointment under the person's original source department, recording their name, agreed monthly salary, File Number, and intended territory.
2. The recipient opens a verification workspace with the issued File Number, not a password; submits their File Folder business name, business plan, actual country, region, city, address, e-signature and accepted terms.
3. Administration verifies the recipient independently and checks the approved Pro appointment and salary *before* presenting payment instructions.
4. The recipient submits evidence of the approved Pro activation fee (current CJ implementation: **680 USDT on TRON/TRC-20**). Administration independently checks actual receipt, matching address/network/amount and unique transaction before activating; avoid charging for the same event twice.
5. Once identity/account ownership, original department, company appointment, Pro Folder ownership and activation are all confirmed, the account receives the **Pro Regional Manager** environment. Its visible palette follows the Pro File Folder; its operations follow the department. File Number alone is never an authentication credential.
6. No ordinary Regional Manager appointment is created and no ordinary manager Lifestyle pay is inferred from this process.

## Department-specific daily work

### Dream Lovely — Client Pro Regional Manager

Own File Folder business development; enterprise partnerships; business systems; Customer Door offers and customer orders; progress records; company reports. For **CJ Dorado**, first online international test in **Spain**, the business system is the Crypto Exchange Workshop. The workshop's current journal records BTC/USDT intent and external evidence, and the public Customer Door records store requests. **These are not yet linked into a verified exchange payment, live trade or asset-delivery service.** Never claim live custody, market quotes or fulfilled crypto orders without an authorized provider, verified external execution and documented settlement.

CJ's Pro position is not an ordinary regional management job. Existing approved Client staff offers may carry a legacy `Regional Manager` title; the verified CJ File Number plus Pro staff entitlement is a narrow migration compatibility rule, not authorization for other ordinary managers.

### Hope — Bridger Pro Regional Manager

Operate the person's approved Hope systems and regional business-introduction program, its Pro File Folder business, and authorized enterprise connections. Do not silently assign Client trading or Agent food distribution. The draft implementation retains the Bridger account and Hope permissions, with a separate signed Pro Folder activation, authenticated Folder world, Customer Door, and persistent Hope company-work register. Production use requires a passed release check and a verified individual activation.

### Stability — Agent Pro Regional Manager

Operate authorized Stability commercial activities and regional business operations while owning a Pro File Folder business and using approved Agent systems. Do not grant Bridger-only Prospect Market or Client-only exchange powers by job title. The draft implementation retains the Agent account and Stability permissions, with a separate signed Pro Folder activation, authenticated Folder world, Customer Door, and persistent Stability company-work register. Production use requires a passed release check and a verified individual activation.

## International daily workspace standard

- **My work today:** today's authorized activities, next actions and status of completion
- **My business:** personal Pro File Folder, constructed systems, Customer Door and business plan milestones
- **My territory:** approved country/region, regional market relationships and business expansion
- **My company position:** signed salary and employment terms, payroll status, notices and company assignments
- **My records:** verified orders, receipts, income separate from salary, reconciliations and compliance issues
- **My reports:** daily completed work, obstacles, next actions and Administration responses

Use the actual source department to select the daily functions. No title grants cross-department permissions.

## Existing implementation boundary (November 2026)

- Ordinary Regional Manager has its own application and appointment tables; **only Bridger and Agent** should enter those routes.
- CJ has a reserved File Number `WEAVE-2026-0907-0001`, Client-owned crypto workshop and Pro activation. PR #319 introduces her Client Pro verification and Dream Lovely staff workspace.
- The **current** Pro File Number verification/finalization implementation is based on `company_client_staff_offers`, `users.role='client'` and Client Folder ownership. This is the Client external-entrant first test. Draft PR #319 now contains separate Agent/Bridger Pro **applications and Administration review**, salary-and-terms approval, private File Number reservation, e-signature, official wallet presentation, Forensics receipt checks, atomic Folder activation, department-specific daily work and Customer Door routes. These source features do not establish that any live staff appointment, receipt, payroll, Folder activation or deployed website has been independently verified. Do not market the position as activated merely because the code exists.
- `lib/pro-regional-manager-policy.ts` defines the distinct Pro role and three departmental operating policies without authorizing access on its own.
- CJ's approved monthly salary must be loaded from her actual company agreement. The number must never be guessed or generated.
- The separate positions must not share the ordinary manager appointment table, automatically transfer commissions, or create a File Folder through a regular manager application.

## Release acceptance criteria

1. Client cannot apply for or be appointed to **ordinary** Regional Manager; Bridger and Agent can, without File Folder checks.
2. Pro Regional Manager onboarding for any launched department requires approved appointment, agreed salary, business plan, location, identity verification, verified activation and secure original-role ownership.
3. CJ's Client Pro workspace says **Pro Regional Manager · Dream Lovely**, shows the documented salary and verified territory, and does not expose ordinary Regional Manager systems.
4. Pro file folder / crypto workshop retains private boundaries; Customer Door orders, verification and fulfillment are clearly distinct from live exchange execution.
5. Tests for each role and both manager tracks must pass before merge and OCI deployment. PR #319 remains draft until that verification.
