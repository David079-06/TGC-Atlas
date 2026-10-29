-- Preparatory schema only. NO production dump or merchant records included.
-- SQLite/D1 differs from Hatchable PostgreSQL: do not apply its legacy migrations directly.
-- This migration is intentionally incomplete until the full domain model is ported.

CREATE TABLE IF NOT EXISTS store_registry (
 id TEXT PRIMARY KEY,
 country TEXT NOT NULL CHECK(length(country)=2),
 name TEXT NOT NULL,
 website TEXT,
 store_type TEXT NOT NULL DEFAULT 'unknown',
 city TEXT,
 address TEXT,
 selected INTEGER NOT NULL DEFAULT 0 CHECK(selected IN (0,1)),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS store_country_selected_idx
 ON store_registry(country,selected,name);

CREATE TABLE IF NOT EXISTS shop_verification_reports (
 verification_key TEXT PRIMARY KEY,
 country TEXT NOT NULL CHECK(length(country)=2),
 name TEXT NOT NULL,
 website TEXT,
 facts_json TEXT NOT NULL DEFAULT '{}',
 evidence_json TEXT NOT NULL DEFAULT '[]',
 technical_json TEXT NOT NULL DEFAULT '{}',
 evaluated_at TEXT,
 website_checked_at TEXT,
 website_error TEXT,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(json_valid(facts_json)),
 CHECK(json_valid(evidence_json)),
 CHECK(json_valid(technical_json))
);
CREATE INDEX IF NOT EXISTS verification_country_idx
 ON shop_verification_reports(country,updated_at);

-- Owner-only data and a full saved-shop catalogue are intentionally absent.
-- No data insertions or trust labels; records must be migrated privately.
