CREATE TABLE IF NOT EXISTS shop_verification_reports(
 verification_key TEXT PRIMARY KEY,
 country CHAR(2) NOT NULL,
 name TEXT NOT NULL,
 website TEXT,
 facts JSONB NOT NULL DEFAULT '{}'::jsonb,
 evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
 technical JSONB NOT NULL DEFAULT '{}'::jsonb,
 website_checked_at TIMESTAMPTZ,
 website_error TEXT,
 evaluated_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS shop_verification_country_idx ON shop_verification_reports(country,updated_at DESC);

INSERT INTO shop_verification_reports(verification_key,country,name,website,facts,evidence,evaluated_at)
 VALUES('PE|okamidex.pe','PE','Okamidex','https://okamidex.pe/','{"legal":{"country":"PE","name":"OKAMI DEX E.I.R.L.","identifier":"20614610159","status":"active_reported_secondary","officialChecked":false,"officialCheckUrl":"https://www.gob.pe/565-consulta-de-ruc"},"contact":{"phone":"+51 930 133 751","email":"ventas@okamidex.pe","url":"https://okamidex.pe/contacto/"},"locations":[{"address":"Av. Alfredo Benavides 347, C.C. Expocentro, tienda 34B, piso 1, Miraflores, Lima, Perú","city":"Lima","district":"Miraflores","purpose":"store","corroborated":true,"corroboration":"GOSU","schedule":"Martes a domingo 11:00–20:00 (horario declarado por la tienda)"},{"address":"Av. Gral. Álvarez de Arenales 1624, Galería Full Market, tiendas 40–41, piso 2, Lince, Lima, Perú","city":"Lima","district":"Lince","purpose":"store","corroborated":false,"corroboration":null,"schedule":"Lunes a sábado 11:00–20:00 (horario declarado por la tienda)"}],"ecommerce":{"catalog":true,"termsPublished":true,"stockVerified":false,"deliveryAudited":false,"checkoutAudited":false},"policyNotes":["La web publica condiciones de devoluciones; se debe revisar la política vigente antes de comprar.","La dirección de Lince está anunciada por la tienda pero aún no cuenta con confirmación externa en esta investigación."]}'::jsonb,
 '[{"kind":"first_party","claim":"published_location","publisher":"Okamidex","label":"Contacto, dos locales y teléfono — web de la tienda","url":"https://okamidex.pe/contacto/","finding":"La tienda anuncia locales en Miraflores y Lince, contacto telefónico y correo.","checkedAt":"2026-10-29","confirmed":true},{"kind":"first_party","claim":"online_catalog","publisher":"Okamidex","label":"Tienda online y catálogo — web del comercio","url":"https://okamidex.pe/tienda/","finding":"Publica catálogo de cartas Pokémon TCG y artículos a la venta.","checkedAt":"2026-10-29","confirmed":true},{"kind":"first_party","claim":"commercial_conditions","publisher":"Okamidex","label":"Términos de uso y devoluciones — web","url":"https://okamidex.pe/terminos-y-condiciones-de-uso/","finding":"Publica condiciones y un plazo declarado de devoluciones sujeto a requisitos.","checkedAt":"2026-10-29","confirmed":true},{"kind":"registry_secondary","claim":"legal_active","publisher":"Datos Perú","label":"Ficha registral secundaria — OKAMI DEX E.I.R.L.","url":"https://www.datosperu.org/empresa-okami-dex-eirl-20614610159.php","finding":"RUC 20614610159 informado como activo/habido; domicilio Av. Benavides 347. Consulta oficial SUNAT aún pendiente.","checkedAt":"2026-10-29","confirmed":true},{"kind":"supplier_listing","claim":"physical_location_match","publisher":"GOSU Accessories","label":"Proveedor externo — punto de venta en Miraflores","url":"https://gosuaccessories.com/donde-comprar","finding":"GOSU lista Okami Dex en C.C. Expocentro, Av. Alfredo Benavides 347, Miraflores.","checkedAt":"2026-10-29","confirmed":true}]'::jsonb,NOW())
 ON CONFLICT(verification_key) DO NOTHING;

INSERT INTO shop_verification_reports(verification_key,country,name,website,facts,evidence,evaluated_at)
 VALUES('PE|lamazmorratcg.com','PE','La Mazmorra TCG','https://lamazmorratcg.com/','{"legal":{"country":"PE","name":"ESPORTS EVENTS S.A.C.","identifier":"20607953903","status":"active_reported_secondary","officialChecked":false,"officialCheckUrl":"https://www.gob.pe/565-consulta-de-ruc"},"contact":{"phone":"+51 988 158 221","email":"contacto@lamazmorratcg.com","url":"https://lamazmorratcg.com/contacto/"},"locations":[{"address":"Pasaje Luis Montero 140, local 203, Urb. El Doral, Santiago de Surco, Lima, Perú","city":"Lima","district":"Santiago de Surco","purpose":"store","corroborated":true,"corroboration":"GOSU","schedule":null}],"ecommerce":{"catalog":true,"termsPublished":true,"stockVerified":false,"deliveryAudited":false,"checkoutAudited":false},"policyNotes":["Las preventas tienen condiciones específicas de anticipos, cancelaciones y asignación; comprobarlas antes de reservar.","El RUC aparece en fuentes secundarias y en la web propia; no se ha consultado directamente SUNAT."]}'::jsonb,
 '[{"kind":"first_party","claim":"published_location","publisher":"La Mazmorra TCG","label":"Contacto y ubicación — web de La Mazmorra","url":"https://lamazmorratcg.com/contacto/","finding":"Anuncia local 203, Pasaje Luis Montero 140, Surco, teléfono y correo.","checkedAt":"2026-10-29","confirmed":true},{"kind":"first_party","claim":"online_catalog","publisher":"La Mazmorra TCG","label":"Comercio online — catálogo publicado","url":"https://lamazmorratcg.com/comprar/","finding":"Sitio con productos TCG, precios y categorías; no se ha validado stock real.","checkedAt":"2026-10-29","confirmed":true},{"kind":"first_party","claim":"published_identity","publisher":"La Mazmorra TCG","label":"Política de privacidad con razón social y RUC","url":"https://lamazmorratcg.com/politica-de-privacidad/","finding":"Identifica ESPORTS EVENTS S.A.C., RUC 20607953903 y el domicilio Luis Montero 140.","checkedAt":"2026-10-29","confirmed":true},{"kind":"first_party","claim":"commercial_conditions","publisher":"La Mazmorra TCG","label":"Políticas de venta y preventas","url":"https://lamazmorratcg.com/politicas-de-venta/","finding":"Publica reglas para anticipos y cancelaciones de preventas, compraventa y recogida.","checkedAt":"2026-10-29","confirmed":true},{"kind":"registry_secondary","claim":"legal_active","publisher":"Datos Perú","label":"Ficha registral secundaria — ESPORTS EVENTS S.A.C.","url":"https://www.datosperu.org/empresa-esports-events-sac-20607953903.php","finding":"RUC 20607953903 informado como activo/habido y domicilio Luis Montero 140.","checkedAt":"2026-10-29","confirmed":true},{"kind":"supplier_listing","claim":"physical_location_match","publisher":"GOSU Accessories","label":"Proveedor externo — punto de venta en Surco","url":"https://gosuaccessories.com/donde-comprar","finding":"GOSU lista La Mazmorra TCG en Pasaje Luis Montero 140, Santiago de Surco.","checkedAt":"2026-10-29","confirmed":true}]'::jsonb,NOW())
 ON CONFLICT(verification_key) DO NOTHING;

UPDATE discovered_shops SET
 address=COALESCE(address,'Av. Alfredo Benavides 347, C.C. Expocentro, tienda 34B, Miraflores, Lima, Perú'),
 phone=COALESCE(phone,'+51 930 133 751'),store_type='hybrid'
 WHERE id='connector-okami';
UPDATE discovered_shops SET
 address=COALESCE(address,'Pasaje Luis Montero 140, local 203, Santiago de Surco, Lima, Perú'),
 phone=COALESCE(phone,'+51 988 158 221'),store_type='hybrid'
 WHERE id='connector-mazmorra';
UPDATE store_registry SET
 address=COALESCE(address,'Av. Alfredo Benavides 347, C.C. Expocentro, tienda 34B, Miraflores, Lima, Perú'),
 address_type=COALESCE(address_type,'physical'),
 phone=COALESCE(phone,'+51 930 133 751'),email=COALESCE(email,'ventas@okamidex.pe')
 WHERE country='PE' AND host IN ('okamidex.pe','www.okamidex.pe');
UPDATE store_registry SET
 address=COALESCE(address,'Pasaje Luis Montero 140, local 203, Santiago de Surco, Lima, Perú'),
 address_type=COALESCE(address_type,'physical'),
 phone=COALESCE(phone,'+51 988 158 221'),email=COALESCE(email,'contacto@lamazmorratcg.com')
 WHERE country='PE' AND host IN ('lamazmorratcg.com','www.lamazmorratcg.com');
-- Separate from GOSU: independent TCG pickup-point directory confirms Mazmorra in Surco.
UPDATE shop_verification_reports
SET evidence=evidence||jsonb_build_array(jsonb_build_object(
 'kind','independent_directory','claim','physical_location_match',
 'publisher','TCG Binder','label','Directorio independiente de puntos de recogida TCG',
 'url','https://tcgbinder.gg/tiendas',
 'finding','TCG Binder lista La Mazmorra TCG en Pasaje Luis Montero 140, Santiago de Surco.',
 'checkedAt','2026-10-29','confirmed',true))
WHERE verification_key='PE|lamazmorratcg.com';

-- Old "reviewed · missing evidence" labels conflicted with independently
-- corroborated dossiers. The new reports are the only source of classification.
UPDATE store_registry SET research_label=NULL,research_level=NULL,
 research_note=NULL,research_reviewed_at=NULL,research_sources='[]'::jsonb
WHERE country='PE' AND host IN
 ('okamidex.pe','www.okamidex.pe','lamazmorratcg.com','www.lamazmorratcg.com');