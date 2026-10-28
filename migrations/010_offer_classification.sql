-- La categoría de un producto y la señal de preventa se conservan con su origen.
ALTER TABLE market_offers ADD COLUMN IF NOT EXISTS franchise TEXT;
ALTER TABLE market_offers ADD COLUMN IF NOT EXISTS preorder_evidence TEXT;