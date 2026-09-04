# Weave Number Engine economics

## Funding unit

The prospect transaction is the funding unit. The application should treat the configured prospect charge as a pool from which Weave can pay communications infrastructure and retain the remainder for operations.

Do not hard-code a fiat conversion for TRX. Store the charge in the transaction ledger and calculate its USD/Naira value at settlement time.

## Current reference economics

As of 2026-09-04, TRX was approximately $0.328 USD on the cited market feed, so 5 TRX is approximately $1.64 before network/exchange fees. This is a moving market value and must not be hard-coded. Use the settlement value for accounting.

5SIM currently advertises WhatsApp activations from $0.06, but its documentation says ordinary verification numbers are temporary; its support page says ordinary virtual numbers are available for only about 10–20 minutes, with longer hosting requiring a separate request. Therefore a 5SIM activation should be treated as bootstrap/verification inventory, not a persistent Bridger number.

SMSPool currently advertises both temporary numbers and long-term rentals. Its published FAQ says long-term rentals are monthly, non-VoIP, renewable, and limited to receiving SMS; it also states a 25-message/day inbound limit. This means it can be a number/verification supplier but is not by itself a complete WhatsApp outbound transport.

## Design rule

Weave must not tell a Bridger that a temporary number is permanent. The engine records lease expiry and provider cost. A persistent communication identity requires a provider/telecom arrangement that actually permits continued use of that number.

## Target cost model

For each prospect purchase:

- allocate the configured prospect charge to the Weave communications/operations pool;
- acquire or renew a Bridger number only when the identity requires it;
- record provider cost in `weave_number_ledger`;
- record message/provider costs separately when applicable;
- retain unused balance as Weave infrastructure margin/reserve.

Example only, using 5 TRX ≈ $1.64 and a $0.06 temporary WhatsApp activation: the activation consumes about 3.7% of the prospect funding unit, leaving about $1.58 before other costs. This is not a claim that a temporary activation can support a month's WhatsApp use; it cannot be assumed to do so.
