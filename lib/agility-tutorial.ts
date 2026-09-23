export const AGILITY_AGENT_TUTORIAL = {
  title: 'How Agility works',
  intro: 'WEAVE moves the food from company preparation into your Agent Store. You choose how you sell it; the system keeps the payment, delivery, inventory and profit movement visible.',
  steps: [
    {
      title: 'Choose how you want to sell',
      detail: 'Retailer means you sell the 10 packages directly to consumers. Wholesaler means you move the complete 10-package box to a buyer.',
    },
    {
      title: 'Choose your Agility package and boxes',
      detail: 'Select the Agility food combination and the number of boxes you want. Every company box contains 10 complete morning-food packages.',
    },
    {
      title: 'Know the box economics',
      detail: 'One box costs the Agent ₦28,000. Its sell-out value is ₦30,000. Your base gross profit is ₦2,000 when the complete box is sold.',
    },
    {
      title: 'Give WEAVE your delivery destination',
      detail: 'Enter the Agent Store delivery address and delivery phone so Administration knows where the physical stock must go.',
    },
    {
      title: 'Create the order and pay with OPay',
      detail: 'WEAVE creates the exact order amount and reference. Send that exact amount through the existing WEAVE OPay method, then paste your transaction reference or receipt into the order.',
    },
    {
      title: 'Administration verifies and WEAVE prepares',
      detail: 'Preparation does not begin until Administration verifies the OPay proof. After approval the movement is: preparation → sealed packages → company box → dispatch → delivery.',
    },
    {
      title: 'Confirm that you received the stock',
      detail: 'When Administration marks the order delivered, confirm physical receipt in Agility. Only received stock becomes sellable Agent Store inventory.',
    },
    {
      title: 'Sell and record the movement',
      detail: 'Retailer: sell individual packages at ₦3,000 each. Wholesaler: sell a complete box for ₦30,000. Record each sale so WEAVE reduces inventory and shows your realized gross profit.',
    },
  ],
} as const
