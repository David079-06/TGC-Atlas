-- Control de fallos de extracción separado del último catálogo válido.
CREATE TABLE IF NOT EXISTS shop_scan_health (
 merchant TEXT PRIMARY KEY,
 last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 last_success TIMESTAMPTZ,
 read_count INTEGER NOT NULL DEFAULT 0,
 last_error TEXT
);