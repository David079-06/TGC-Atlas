-- TCG Atlas: durable, individually retried verification tasks.
-- Temporary merchant candidates remain separate from the owner's saved directory.
CREATE TABLE IF NOT EXISTS research_verify_queue (
  shop_id TEXT PRIMARY KEY REFERENCES discovered_shops(id) ON DELETE CASCADE,
  country CHAR(2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','retry','done','failed')),
  priority INTEGER NOT NULL DEFAULT 100,
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  last_error TEXT,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS research_verify_due_idx
 ON research_verify_queue(status,next_attempt,priority,created_at);
CREATE INDEX IF NOT EXISTS research_verify_country_idx
 ON research_verify_queue(country,status,next_attempt);

-- Shared cost/rate budgets across country jobs. Keys are controlled in code.
CREATE TABLE IF NOT EXISTS research_source_budget (
  provider TEXT PRIMARY KEY,
  next_allowed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quota_day DATE NOT NULL DEFAULT CURRENT_DATE,
  used_today INTEGER NOT NULL DEFAULT 0,
  attempts BIGINT NOT NULL DEFAULT 0,
  successes BIGINT NOT NULL DEFAULT 0,
  failures BIGINT NOT NULL DEFAULT 0,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_http_status INTEGER,
  last_error TEXT,
  last_called_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Retry individual geographical lookups without restarting completed areas.
CREATE TABLE IF NOT EXISTS research_area_retries (
  country CHAR(2) NOT NULL,
  area_key TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'retry' CHECK(status IN ('retry','running','done','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(country,area_key,provider)
);
CREATE INDEX IF NOT EXISTS research_area_retry_due_idx
 ON research_area_retries(status,next_attempt);

-- Keep the displayed list and verification queue fast as the cache grows.
CREATE INDEX IF NOT EXISTS researched_shops_active_country_idx
 ON discovered_shops(country,expires_at,last_seen DESC);
CREATE INDEX IF NOT EXISTS researched_shops_osm_source_idx
 ON discovered_shops(source_url);

-- One-time backfill for existing temporary leads.
INSERT INTO research_verify_queue(shop_id,country,priority)
SELECT s.id,s.country,CASE WHEN s.pokemon_signal THEN 10 ELSE 100 END
FROM discovered_shops s LEFT JOIN discovered_shop_evidence e ON e.shop_id=s.id
WHERE s.expires_at>NOW() AND e.shop_id IS NULL
ON CONFLICT(shop_id) DO NOTHING;