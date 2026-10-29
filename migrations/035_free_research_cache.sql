-- Free-only research: reuse positive and empty geocoder searches instead of repeating them.
CREATE TABLE IF NOT EXISTS research_geo_cache (
 country CHAR(2) NOT NULL,
 area_key TEXT NOT NULL,
 provider TEXT NOT NULL CHECK(provider IN ('photon','overpass')),
 checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 expires_at TIMESTAMPTZ NOT NULL,
 outcome TEXT NOT NULL DEFAULT 'ok',
 found INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(country,area_key,provider)
);
CREATE INDEX IF NOT EXISTS research_geo_cache_expiry_idx ON research_geo_cache(expires_at);

-- A country can require many days of low-volume public API usage; candidates are
-- still temporary and never enter the owner's personal store registry automatically.
UPDATE discovered_shops SET expires_at=GREATEST(expires_at,NOW()+INTERVAL '30 days')
WHERE expires_at>NOW();

-- Servers that are repeatedly overloaded should cool off instead of retrying continuously.
UPDATE research_source_budget SET next_allowed_at=GREATEST(next_allowed_at,NOW()+INTERVAL '12 hours')
WHERE provider='overpass' AND consecutive_failures>=3;

-- No paid search provider is used in this edition.
DELETE FROM research_area_retries WHERE provider='brave';
DELETE FROM research_source_budget WHERE provider='brave';