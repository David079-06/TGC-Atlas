-- Permite recorrer catálogos paginados sin descargar todo en cada ronda.
ALTER TABLE store_registry ADD COLUMN IF NOT EXISTS scan_page_cursor INTEGER NOT NULL DEFAULT 1;