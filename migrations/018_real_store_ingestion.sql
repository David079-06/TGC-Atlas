ALTER TABLE store_registry ADD COLUMN IF NOT EXISTS integration_note TEXT;
ALTER TABLE store_registry ADD COLUMN IF NOT EXISTS last_scan_finished TIMESTAMPTZ;
ALTER TABLE store_registry ADD COLUMN IF NOT EXISTS last_scan_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE store_registry ADD COLUMN IF NOT EXISTS scan_status TEXT NOT NULL DEFAULT 'pending' CHECK(scan_status IN('pending','queued','running','ok','partial','blocked','failed','not_supported'));
ALTER TABLE market_offers ADD COLUMN IF NOT EXISTS product_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX IF NOT EXISTS market_offers_merchant_franchise_idx ON market_offers(merchant,franchise,updated_at DESC);
CREATE INDEX IF NOT EXISTS market_offers_preorders_idx ON market_offers(merchant,updated_at DESC) WHERE preorder_evidence IS NOT NULL;
CREATE INDEX IF NOT EXISTS store_registry_refresh_idx ON store_registry(selected,auto_enabled,approved_host,backoff_until,last_scan_started);