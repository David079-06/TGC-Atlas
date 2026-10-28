CREATE TABLE IF NOT EXISTS geo_lookup_cache (
 cache_key TEXT PRIMARY KEY,
 payload JSONB NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS geo_lookup_cache_expiry_idx ON geo_lookup_cache(expires_at);
CREATE TABLE IF NOT EXISTS geo_lookup_throttle (
 id SMALLINT PRIMARY KEY CHECK(id=1),
 last_called TIMESTAMPTZ NOT NULL DEFAULT '2000-01-01'
);
INSERT INTO geo_lookup_throttle(id) VALUES(1) ON CONFLICT DO NOTHING;