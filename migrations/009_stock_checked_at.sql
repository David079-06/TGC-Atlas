-- Fecha separada para el stock: consultar existencias no implica revalidar el precio.
ALTER TABLE market_offers ADD COLUMN IF NOT EXISTS stock_checked_at TIMESTAMPTZ;