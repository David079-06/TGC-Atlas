CREATE TABLE IF NOT EXISTS store_site_checks(
 merchant TEXT PRIMARY KEY,
 http_status INTEGER,
 reachable BOOLEAN,
 checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 error TEXT
);
CREATE INDEX IF NOT EXISTS store_site_checks_checked_idx ON store_site_checks(checked_at);