-- Tiendas de prueba y productos sintéticos, completamente separados del inventario real.
ALTER TABLE store_registry ADD COLUMN IF NOT EXISTS is_simulation BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS simulation_products (
 id BIGSERIAL PRIMARY KEY,
 merchant TEXT NOT NULL REFERENCES store_registry(id) ON DELETE CASCADE,
 title TEXT NOT NULL CHECK(length(title) BETWEEN 2 AND 200),
 category TEXT NOT NULL CHECK(category IN ('pokemon','preorders','other','review')),
 price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(price>=0),
 currency TEXT NOT NULL DEFAULT 'EUR',
 quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS simulation_products_store_category ON simulation_products(merchant,category,created_at DESC);