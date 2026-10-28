-- Track every discovery source for a deduplicated candidate; does not count as trust corroboration.
CREATE TABLE IF NOT EXISTS research_candidate_sources(
 shop_id TEXT NOT NULL REFERENCES discovered_shops(id) ON DELETE CASCADE,
 provider TEXT NOT NULL,
 source_url TEXT NOT NULL,
 first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(shop_id,provider,source_url)
);
CREATE INDEX IF NOT EXISTS research_candidate_sources_shop_idx
 ON research_candidate_sources(shop_id);

-- Existing candidate provenance: source records are leads, not independent proof.
INSERT INTO research_candidate_sources(shop_id,provider,source_url)
SELECT id,source,source_url FROM discovered_shops
WHERE source_url LIKE 'https://%'
ON CONFLICT(shop_id,provider,source_url) DO NOTHING;