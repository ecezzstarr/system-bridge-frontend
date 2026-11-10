-- Agent and Bridger now have distinct prices for NEW Department Entry Tickets:
-- Agent: 5 System Switch; Bridger: 8 System Switch.
-- Keep already presented tickets' recorded unit price and NGN quote intact.
-- No default is safe because a ticket's price must match its department.
ALTER TABLE IF EXISTS departmental_entry_tickets
  ALTER COLUMN price_flame_coin DROP DEFAULT;
