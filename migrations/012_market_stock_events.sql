CREATE TABLE IF NOT EXISTS market_stock_events (
 id BIGSERIAL PRIMARY KEY,
 merchant TEXT NOT NULL, external_id TEXT NOT NULL, title TEXT,
 previous_available BOOLEAN, new_available BOOLEAN,
 previous_qty INTEGER, new_qty INTEGER,
 source TEXT NOT NULL,
 changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS market_stock_events_newest ON market_stock_events(changed_at DESC);