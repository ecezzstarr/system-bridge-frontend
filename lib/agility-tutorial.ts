export const AGILITY_AGENT_TUTORIAL = {
  title: 'How WEAVE food distribution works',
  intro: 'The Agent buys WEAVE food stock and distributes it through existing shops and outlets around them. The Agent is not the shopkeeper; the Agent keeps cartons moving from WEAVE into daily-life retail points.',
  steps: [
    {
      title: 'Buy cartons from WEAVE',
      detail: 'Choose Agility, Electrolyte or another approved WEAVE food product and order the cartons you want to move through your local route.',
    },
    {
      title: 'Know the carton economics',
      detail: 'The current standard carton contains 10 packages. The Agent buys the carton from WEAVE at the company Agent price, then agrees the outlet return amount before supplying the shop.',
    },
    {
      title: 'Receive the physical stock',
      detail: 'Pay the WEAVE order through the existing OPay process. Administration verifies payment, prepares and dispatches the cartons. Confirm physical receipt before distributing them.',
    },
    {
      title: 'Build a route of existing outlets',
      detail: 'Add nearby fruit shops, kiosks, mini-marts, food points and other real stores that already have customers. These outlets do not become Agents simply because they carry WEAVE stock.',
    },
    {
      title: 'Supply paid now',
      detail: 'When an outlet can fund the cartons, supply the agreed quantity and collect the agreed amount immediately. That stock leaves the Agent distribution inventory at once.',
    },
    {
      title: 'Supply pay after sale',
      detail: 'When an outlet has customers but cannot fund the cartons upfront, place the stock there on pay-after-sale. WEAVE records the cartons and packs held by that outlet and the amount the outlet owes the Agent.',
    },
    {
      title: 'Follow the stock and money',
      detail: 'As the outlet sells, record the packs sold and money collected. The distribution ledger shows what remains at the outlet, what has been collected, and what is still outstanding.',
    },
    {
      title: 'Restock and continue',
      detail: 'When stock moves out, return to WEAVE for more cartons and continue the route. The Agent position grows by supplying more working outlets, not by becoming the retailer.',
    },
  ],
} as const
