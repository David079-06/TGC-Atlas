-- Regional and city search coverage, separate from the temporary merchant cache.
CREATE TABLE IF NOT EXISTS country_search_areas(
 country CHAR(2) NOT NULL,
 area_key TEXT NOT NULL,
 region TEXT,
 city TEXT,
 lat DOUBLE PRECISION NOT NULL,
 lon DOUBLE PRECISION NOT NULL,
 kind TEXT NOT NULL DEFAULT 'city',
 priority INTEGER NOT NULL DEFAULT 100,
 source_url TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY(country,area_key)
);
CREATE INDEX IF NOT EXISTS country_search_areas_order_idx ON country_search_areas(country,priority,area_key);
ALTER TABLE country_investigations ADD COLUMN IF NOT EXISTS area_source TEXT;
ALTER TABLE country_investigations ADD COLUMN IF NOT EXISTS area_limitations TEXT;
ALTER TABLE country_investigations ADD COLUMN IF NOT EXISTS last_city TEXT;
ALTER TABLE country_investigations ADD COLUMN IF NOT EXISTS failed_zones INTEGER NOT NULL DEFAULT 0;