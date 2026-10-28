-- Se ha retirado el modo ficticio; no quedan datos de prueba.
DROP TABLE IF EXISTS simulation_products;
ALTER TABLE store_registry DROP COLUMN IF EXISTS is_simulation;