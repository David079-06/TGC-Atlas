CREATE TABLE IF NOT EXISTS store_registry (
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 country CHAR(2) NOT NULL CHECK(country ~ '^[A-Z]{2}$'),
 website TEXT NOT NULL,
 host TEXT NOT NULL,
 platform TEXT NOT NULL DEFAULT 'manual' CHECK(platform IN ('woocommerce','shopify','manual')),
 store_type TEXT NOT NULL DEFAULT 'online' CHECK(store_type IN ('online','physical','hybrid')),
 city TEXT,
 address TEXT,
 address_type TEXT CHECK(address_type IN ('physical','legal','pickup','unknown')),
 contact_url TEXT,
 evidence_url TEXT,
 phone TEXT,
 email TEXT,
 preorders_url TEXT,
 selected BOOLEAN NOT NULL DEFAULT FALSE,
 auto_enabled BOOLEAN NOT NULL DEFAULT FALSE,
 approved_host BOOLEAN NOT NULL DEFAULT FALSE,
 rating NUMERIC(3,2),
 rating_count INTEGER,
 rating_source TEXT,
 last_evidence_at TIMESTAMPTZ,
 refresh_minutes INTEGER NOT NULL DEFAULT 240 CHECK(refresh_minutes BETWEEN 60 AND 10080),
 backoff_until TIMESTAMPTZ,
 fail_streak INTEGER NOT NULL DEFAULT 0,
 last_scan_started TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS store_registry_country_idx ON store_registry(country,selected);
CREATE INDEX IF NOT EXISTS store_registry_due_idx ON store_registry(selected,auto_enabled,last_scan_started,backoff_until);
INSERT INTO store_registry(id,name,country,website,host,platform,store_type,city,address,address_type,contact_url,evidence_url,phone,email,preorders_url,selected,auto_enabled,approved_host,last_evidence_at,refresh_minutes)
VALUES
('okami','Okamidex','PE','https://okamidex.pe/','okamidex.pe','woocommerce','hybrid','Lima','Av. Alfredo Benavides 347, C.C. Expocentro, tienda 34B, Miraflores, Lima','physical','https://okamidex.pe/contacto/','https://okamidex.pe/contacto/','+51 930 133 751','ventas@okamidex.pe','https://okamidex.pe/categoria-producto/preventas/',TRUE,TRUE,TRUE,NOW(),240),
('mazmorra','La Mazmorra TCG','PE','https://lamazmorratcg.com/','lamazmorratcg.com','woocommerce','hybrid','Lima','Pasaje Luis Montero 140, local 203, Santiago de Surco, Lima','physical','https://lamazmorratcg.com/contacto/','https://lamazmorratcg.com/contacto/','+51 988 158 221','contacto@lamazmorratcg.com',NULL,TRUE,TRUE,TRUE,NOW(),240),
('khipu','Khipu Club TCG','PE','https://khipuclubtcg.com/','khipuclubtcg.com','woocommerce','online',NULL,NULL,NULL,'https://khipuclubtcg.com/','https://khipuclubtcg.com/',NULL,NULL,NULL,TRUE,TRUE,TRUE,NULL,360),
('bimba','BimbaCards','ES','https://bimbacards.com/','bimbacards.com','woocommerce','online','Valencia','Calle Río Nervión 19, 46025 Valencia','legal','https://bimbacards.com/condiciones-de-venta/','https://bimbacards.com/condiciones-de-venta/','+34 664 211 126','info@bimbacards.com',NULL,TRUE,TRUE,TRUE,NOW(),240),
('noraku','Noraku','ES','https://noraku.es/','noraku.es','shopify','online','Granada','Calle Albero 11, Granada','legal','https://noraku.es/pages/contacto','https://noraku.es/policies/terms-of-service',NULL,'info@noraku.es','https://noraku.es/collections/preventas',TRUE,TRUE,TRUE,NOW(),240),
('pokemillon','Pokemillon','ES','https://www.pokemillon.com/','www.pokemillon.com','shopify','hybrid','Salou','Calle Salauris 3, local 8, 43840 Salou','pickup','https://www.pokemillon.com/pages/contacto','https://www.pokemillon.com/pages/contacto','+34 631 569 550','info@pokemillon.com','https://www.pokemillon.com/collections/reservas',TRUE,TRUE,TRUE,NOW(),360),
('theboosterbox','The Booster Box','ES','https://theboosterbox.es/','theboosterbox.es','shopify','online','Madrid','Calle Condesa de Venadito 1, 28027 Madrid','legal','https://theboosterbox.es/policies/legal-notice','https://theboosterbox.es/policies/legal-notice',NULL,'hola@theboosterbox.es',NULL,TRUE,TRUE,TRUE,NOW(),360),
('carloncho','Carloncho Store','PE','https://www.carlonchostore.com/','www.carlonchostore.com','manual','online',NULL,NULL,NULL,'https://www.carlonchostore.com/','https://www.carlonchostore.com/',NULL,NULL,NULL,FALSE,FALSE,FALSE,NULL,720),
('carddex','CardDex','PE','https://carddex.pe/','carddex.pe','manual','online',NULL,NULL,NULL,'https://carddex.pe/','https://carddex.pe/',NULL,NULL,NULL,FALSE,FALSE,FALSE,NULL,720),
('gp','GP TCG','PE','https://gptcg.pe/','gptcg.pe','manual','online',NULL,NULL,NULL,'https://gptcg.pe/','https://gptcg.pe/',NULL,NULL,NULL,FALSE,FALSE,FALSE,NULL,720)
ON CONFLICT(id) DO NOTHING;