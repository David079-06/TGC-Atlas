CREATE TABLE IF NOT EXISTS country_investigations(
 country CHAR(2) PRIMARY KEY,
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN('queued','running','partial','completed','limited','error')),
 phase TEXT NOT NULL DEFAULT 'discover' CHECK(phase IN('discover','verify','finished')),
 cursor INTEGER NOT NULL DEFAULT 0,
 checked_zones INTEGER NOT NULL DEFAULT 0,
 checked_sites INTEGER NOT NULL DEFAULT 0,
 candidates_found INTEGER NOT NULL DEFAULT 0,
 last_note TEXT,
 last_error TEXT,
 started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 finished_at TIMESTAMPTZ,
 next_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 locked_at TIMESTAMPTZ,
 generation INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS country_investigations_queue ON country_investigations(next_attempt,updated_at);
CREATE TABLE IF NOT EXISTS discovered_shop_evidence(
 shop_id TEXT PRIMARY KEY REFERENCES discovered_shops(id) ON DELETE CASCADE,
 website_reachable BOOLEAN,
 website_checked_at TIMESTAMPTZ,
 website_note TEXT,
 published_contact BOOLEAN NOT NULL DEFAULT FALSE,
 published_conditions BOOLEAN NOT NULL DEFAULT FALSE,
 published_identity BOOLEAN NOT NULL DEFAULT FALSE,
 independent_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
 verification_level TEXT NOT NULL DEFAULT 'pending' CHECK(verification_level IN('pending','limited','documented')),
 last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);