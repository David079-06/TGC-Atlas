CREATE TABLE IF NOT EXISTS discovery_areas (
 id BIGSERIAL PRIMARY KEY,
 country CHAR(2) NOT NULL,
 city TEXT NOT NULL DEFAULT '',
 lat DOUBLE PRECISION NOT NULL CHECK(lat BETWEEN -85 AND 85),
 lon DOUBLE PRECISION NOT NULL CHECK(lon BETWEEN -180 AND 180),
 radius INTEGER NOT NULL DEFAULT 6500 CHECK(radius BETWEEN 2000 AND 14000),
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','partial','completed','limited','error')),
 attempts SMALLINT NOT NULL DEFAULT 0,
 discoveries INTEGER NOT NULL DEFAULT 0,
 last_error TEXT,
 last_started TIMESTAMPTZ,
 checked_at TIMESTAMPTZ,
 next_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 CONSTRAINT discovery_areas_unique UNIQUE(country,city,lat,lon)
);
CREATE INDEX IF NOT EXISTS discovery_areas_due_idx ON discovery_areas(status,next_attempt,created_at);
CREATE INDEX IF NOT EXISTS discovery_areas_country_city_idx ON discovery_areas(country,city);
CREATE TABLE IF NOT EXISTS discovered_shops (
 id TEXT PRIMARY KEY,
 country CHAR(2) NOT NULL,
 city TEXT NOT NULL DEFAULT '',
 name TEXT NOT NULL,
 website TEXT,
 phone TEXT,
 address TEXT,
 lat DOUBLE PRECISION,
 lon DOUBLE PRECISION,
 store_type TEXT NOT NULL DEFAULT 'physical' CHECK(store_type IN('physical','online','hybrid')),
 shop_kind TEXT,
 source TEXT NOT NULL,
 source_url TEXT NOT NULL,
 evidence_level TEXT NOT NULL DEFAULT 'location_only' CHECK(evidence_level IN ('location_only','category_match','pokemon_mentioned','website_reviewed')),
 pokemon_signal BOOLEAN NOT NULL DEFAULT FALSE,
 review_status TEXT NOT NULL DEFAULT 'candidate' CHECK(review_status IN ('candidate','needs_review','reviewed','rejected')),
 first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS discovered_shops_area_idx ON discovered_shops(country,city,last_seen DESC);
CREATE INDEX IF NOT EXISTS discovered_shops_website_idx ON discovered_shops(website);
CREATE TABLE IF NOT EXISTS discovery_provider_throttle(
 id SMALLINT PRIMARY KEY CHECK(id=1),
 last_called TIMESTAMPTZ NOT NULL DEFAULT '2000-01-01'
);
INSERT INTO discovery_provider_throttle(id) VALUES(1) ON CONFLICT DO NOTHING;