-- Extra coordinates let an individually queued city request be retried independently.
-- Do not inject manual city requests into the nationwide coverage plan.
ALTER TABLE research_area_retries ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE research_area_retries ADD COLUMN IF NOT EXISTS lon DOUBLE PRECISION;
ALTER TABLE research_area_retries ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE research_area_retries ADD COLUMN IF NOT EXISTS kind TEXT;