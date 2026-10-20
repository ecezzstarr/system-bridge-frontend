-- Existing preparation assignments must allow Ember after payment verification.
ALTER TABLE weave_food_preparation_tasks
  DROP CONSTRAINT IF EXISTS weave_food_preparation_tasks_product_check;
ALTER TABLE weave_food_preparation_tasks
  ADD CONSTRAINT weave_food_preparation_tasks_product_check
  CHECK (product IN ('agility','electrolyte','ember','daisy'));
-- Ember stock and customer sales reuse verified WEAVE agility_stock_orders
-- and carrier_food_orders with distinct variant IDs 'ember-small' / 'ember-large'.
