-- A shop's verified dossier is persisted only when the owner adds the shop.
ALTER TABLE store_registry ADD COLUMN IF NOT EXISTS research_label TEXT;
ALTER TABLE store_registry ADD COLUMN IF NOT EXISTS research_level TEXT;
ALTER TABLE store_registry ADD COLUMN IF NOT EXISTS research_reviewed_at TIMESTAMPTZ;
ALTER TABLE store_registry ADD COLUMN IF NOT EXISTS research_note TEXT;
ALTER TABLE store_registry ADD COLUMN IF NOT EXISTS research_sources JSONB NOT NULL DEFAULT '[]'::jsonb;