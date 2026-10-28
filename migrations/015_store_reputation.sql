ALTER TABLE store_registry ADD COLUMN IF NOT EXISTS review_checked_at TIMESTAMPTZ;
ALTER TABLE store_registry ADD COLUMN IF NOT EXISTS marketing_note TEXT;
ALTER TABLE store_registry ADD COLUMN IF NOT EXISTS marketing_url TEXT;
UPDATE store_registry SET rating=4.3,rating_count=1068,rating_source='https://www.trustpilot.com/review/pokemillon.com',
 review_checked_at=NOW(),
 marketing_note='La tienda publica canal de Telegram, actividad de Twitch y ofertas. Son declaraciones/links propios, no métricas independientes de alcance.',
 marketing_url='https://www.pokemillon.com/pages/contacto'
 WHERE id='pokemillon';
UPDATE store_registry SET rating=3.6,rating_count=3,rating_source='https://es.trustpilot.com/review/bimbacards.com',
 review_checked_at=NOW(),
 marketing_note='La web publica promociones y testimonios propios. Los testimonios del vendedor no sustituyen opiniones externas.',
 marketing_url='https://bimbacards.com/'
 WHERE id='bimba';
UPDATE store_registry SET marketing_note='La web anuncia torneos y eventos de comunidad. Participación y asistencia no están medidas independientemente.',
 marketing_url='https://lamazmorratcg.com/nosotros/' WHERE id='mazmorra';
UPDATE store_registry SET marketing_note='La web comunica promociones y novedades Pokémon. No constan métricas de alcance independiente.',
 marketing_url='https://okamidex.pe/' WHERE id='okami';
UPDATE store_registry SET marketing_note='La web publica novedades y preventas. No se han auditado campañas ni el alcance.',
 marketing_url='https://noraku.es/' WHERE id='noraku';
UPDATE store_registry SET marketing_note='La web mantiene catálogo público de productos y ofertas. No hay métricas externas suficientes para valorar su marketing.',
 marketing_url='https://theboosterbox.es/' WHERE id='theboosterbox';