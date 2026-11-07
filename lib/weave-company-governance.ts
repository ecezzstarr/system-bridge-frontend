/**
 * Published operational guidance, not a retroactive replacement of a signed
 * employment, Client service, payment or independently approved agreement.
 * Company policies require owner/legal review before changes to enforceable
 * contractual terms or mandated consent collection.
 */
export const WEAVE_GOVERNANCE_VERSION='weave-company-conduct-2026-11-07'

export const COMPANY_POLICY_SECTIONS=[
 {
  id:'departments',title:'Company identity and participation',
  audience:'Everyone',summary:'One company, four responsibilities.',
  rules:[
   'Administrations (A Time) directs company infrastructure, records, authorizations and continuity; it does not take ownership of a participant’s private work.',
   'Bridgers (Hope) introduce possibilities and conduct respectful outreach; Agents (Stability) deliver products, customer operations and approved assignments; Clients (Dream Lovely) develop businesses through File Folders.',
   'Company Loop Events are shared experiences. Participation in a Loop does not create a company appointment, financial claim, guaranteed income or access to another person’s business.'
  ]
 },
 {
  id:'roles',title:'Appointments, employees and company income',
  audience:'Managers, staff and applicants',summary:'Written approval precedes authority or payroll.',
  rules:[
   'A title, application, File Number or payment alone does not confer employment. A company job, duties, territory, salary and participation terms require independent Administrations approval and a documented agreement.',
   'An ordinary Regional Manager is an Agent or Bridger role without a File Folder. A Pro Regional Manager is a separate approved appointment open to Clients, Bridgers and Agents, with an individual Pro File Folder and business plan.',
   'Employee assignments must identify the employer, permitted tasks, compensation, records and exit conditions. The originating department remains intact except for explicitly authorized assignments.',
   'Company salary, product commissions, business sales, customer funds, activation fees and wallet balances are different records. Do not represent one as another.'
  ]
 },
 {
  id:'folders',title:'File Folder, Customer Door and enterprise work',
  audience:'Clients, Legions and Pro Managers',summary:'The owner’s real work defines the business.',
  rules:[
   'A File Folder is an operating environment for independently chosen, lawful work. Available modules may include workshops, a Customer Door, customer communications, employee assignments and business records; specific access depends on the purchased tier and activation.',
   'The owner remains responsible for business representations, lawful products or services, customers, delivery and authorized worker permissions. Company systems help organize work but do not guarantee customers, profit, eligibility or commercial success.',
   'A worker’s appointment does not grant ownership of a File Folder or permission to use another Client’s funds, records or business systems. Employee activity must remain traceable to the correct owner and service.',
   'New modules, 3D features and hardware or real-estate concepts are proposals until operationally delivered and separately contracted; never describe a concept as an available guaranteed product.'
  ]
 },
 {
  id:'finance',title:'Payments, wallet addresses and settlements',
  audience:'Customers, employees and Administrations',summary:'Verified money moves on evidence.',
  rules:[
   'Show the applicable fee, currency, refund and payment conditions before the relevant transaction. A displayed wallet, transaction hash or screenshot is not proof of settled value.',
   'Company wallet settings are configured by authorized Administrations and kept separate by payment rail. Forensics independently checks supported processor or blockchain evidence, amount, asset, destination and duplicate references before final credit.',
   'Keep customer payments, deposits, business revenue, wages, commissions, taxes and withdrawal requests in their correct ledger. No person may promise release of unrelated funds in exchange for an activation payment.',
   'Do not promise doubling, fixed financial returns, salary approval, investment protection or withdrawal availability without an independently lawful, signed and demonstrably supportable basis.',
   'Where an order, delivery, cancellation, chargeback or refund is disputed, preserve records and use the relevant written transaction terms and applicable law; do not erase evidence to make balances agree.'
  ]
 },
 {
  id:'prospects',title:'Outreach, marketing and public representations',
  audience:'Bridgers, Agents, marketers',summary:'Real people and voluntary contact come first.',
  rules:[
   'Introduce Weave accurately. Do not fabricate prospects, customer responses, sales, credentials, testimonials or employment offers.',
   'Honor an opt-out, applicable messaging rules, platform restrictions and marketing consent requirements. Do not spam, scrape protected information or impersonate someone to create a crossing.',
   'Describe prospective earnings as uncertain and dependent on actual work and verified sales. No officer may publish another person’s name, private business details, photographs or records as an example without permission.',
   'Advertising, AI-assisted messages, pricing and customer offers are subject to Administrations review where company policy requires it.'
  ]
 },
 {
  id:'operations',title:'Products, stores and fulfillment',
  audience:'Agents, stores, customers',summary:'Orders remain obligations until fulfilled or resolved.',
  rules:[
   'Confirm product description, price, availability, handling and delivery conditions before collecting funds or creating a fulfillment claim.',
   'Record stock, order ownership, customer payments, handovers, incomplete delivery and refunds or exceptions with sufficient evidence for correction.',
   'Keep preparation, distribution, employee commission, Administrations allocation and customer payment records separate; avoid promising distribution quantities or returns that have not been verified.',
  ]
 },
 {
  id:'privacy',title:'Information, access and AI assistance',
  audience:'All users',summary:'Collect only what is needed for authorized work.',
  rules:[
   'Protect account credentials, private keys, customer records, children’s information, employment details and financial evidence. Do not paste secrets into chat, code, public messages or customer interfaces.',
   'Use personal information only for the stated company purpose and permitted role. Access to a shared system does not authorize disclosure or external publication of another person’s information.',
   'AI systems can support planning, communication and analysis. AI output cannot independently approve a financial credit, salary, legal representation, production release, account recovery or other restricted transaction.',
   'Report suspected account compromise, erroneous financial records or unauthorized access through Support or the appropriate Administrations review channel.'
  ]
 },
 {
  id:'engineering',title:'Source code, infrastructure and production change',
  audience:'Administrations and development workers',summary:'Company software changes must remain reviewable and reversible.',
  rules:[
   'Authorized Administrations may draft code in the Company Code Workshop, but the browser has no operating-system shell, Docker socket, secret manager or direct production command execution.',
   'Changes remain on isolated GitHub branches. Every commit requires a reason and identifiable author. Protected security, authentication, payroll, finance, deployment and wallet code requires separate engineering review.',
   'Merge to main requires an exact reviewed commit, successful tests and GitHub protections. A merge is not production deployment. Oracle release requires a different verified main check and independent Administrations authorization.',
   'A deployment is complete only when local and public health report the expected release identity. Record failures and rollback evidence in Sovereign + Flame without inventing a healthy state.',
   'Preserve audit logs, backups, access boundaries and backwards-compatible migrations. Do not erase records, force push, bypass protected checks or execute unreviewed commands from a public page.'
  ]
 },
 {
  id:'disputes',title:'Safety, changes, corrections and support',
  audience:'Everyone',summary:'Corrections need evidence and accountable decisions.',
  rules:[
   'Users may report account, service, payment or conduct problems through the published support route, identifying the affected transaction or record without posting sensitive credentials.',
   'Administrations may restrict unlawful use or investigate breaches while keeping evidence, consistent with applicable agreements and law. Where available, users should receive a clear reason and a path to request correction.',
   'Material changes to binding employment, paid-service or personal-data terms require appropriate notice and, where necessary, renewed acceptance. General explanatory material does not silently alter earlier signed contracts.',
   'Individual agreements, transaction terms and mandatory law take precedence where they provide more specific obligations or protections.'
  ]
 }
] as const
