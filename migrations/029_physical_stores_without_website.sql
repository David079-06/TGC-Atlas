-- A user can add a documented physical shop with no published website; no dummy host.
ALTER TABLE store_registry ALTER COLUMN website DROP NOT NULL;
ALTER TABLE store_registry ALTER COLUMN host DROP NOT NULL;