-- Provisional selection requested by owner. Only temporary discovered results
-- are curated; do not delete user-saved stores or anything outside Peru.
DELETE FROM discovered_shops
WHERE country='PE' AND id NOT IN ('connector-okami','connector-mazmorra');

-- Stop queued Peruvian geographic searches while directory discovery is paused.
DELETE FROM research_area_retries WHERE country='PE';
DELETE FROM discovery_areas WHERE country='PE';

UPDATE country_investigations
SET status='completed',phase='finished',
 last_note='Buscador pausado. Selección temporal: Okamidex y La Mazmorra TCG.',
 last_error=NULL,locked_at=NULL,finished_at=NOW(),
 next_attempt=NOW()+INTERVAL '365 days',
 generation=generation+1,updated_at=NOW()
WHERE country='PE';