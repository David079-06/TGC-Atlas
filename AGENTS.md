# Instrucciones para Codex — TCG Atlas

## Objetivo
Continuar y mejorar el proyecto existente de Pokémon TCG. **No reconstruir desde cero** ni inventar tiendas, opiniones, precios, disponibilidad o registros fiscales. El código del repositorio se puede leer públicamente, pero la aplicación y sus datos operativos son **privados**.

## Estado real
- Producción actual: Hatchable. `public/` contiene la interfaz sin build; `api/` y `lib/` dependen del runtime propietario `hatchable`; `migrations/` usa PostgreSQL.
- No se puede ejecutar el backend de Hatchable de forma nativa con Node o desplegarlo directamente en Cloudflare: primero hay que implementar adaptadores, migraciones equivalentes y autenticación.
- El directorio de Perú muestra temporalmente **solo dos tiendas**: Okamidex y La Mazmorra TCG. No añadir otras automáticamente.
- `lib/directory-mode.js` deja **pausado el descubrimiento automático** mientras se rediseña el resto de la aplicación. No reactivarlo sin petición explícita.
- El análisis comercial es independiente del catálogo: una web accesible NO implica compra segura.
- `lib/store-verification.js` y `shop_verification_reports` contienen el criterio de verificación. La evaluación debe ser igual en todos los países y en tiendas guardadas, descubiertas o con conector.
- **Verde:** corroboración documental de identidad y actividad, NO entrega garantizada. **Amarillo:** pruebas insuficientes. **Rojo:** riesgo grave documentado en fuentes oficiales. Fallos HTTP nunca producen rojo.
- Los registros fiscales no consultados directamente en un organismo oficial deben mostrarse como "fuentes secundarias".

## Herramientas y verificaciones
- Node.js 22 o posterior. Sin paquetes externos requeridos para las pruebas de esta fase.
- Antes de cada PR, ejecutar `npm run verify` y comprobar el resultado.
- Mantener pruebas específicas para identidad comercial, tipos de tienda, deduplicación, cache y permisos.
- Las pruebas unitarias no deben consultar internet ni escribir datos reales. Evitar capturas o fixtures con usuarios, tokens o datos privados.
- Preferir cambios pequeños por responsabilidad, `Conventional Commits` y PRs revisables.
- Si una tarea afecta a la UI, comprobar 375 px y escritorio, accesibilidad y contraste.

## Normas de seguridad y coste
- **Objetivo 0 €:** no activar APIs de pago, facturación, planes de pago ni upgrades automáticos. No introducir claves comerciales.
- No hacer pública la aplicación ni los endpoints. El repositorio sí es público: jamás guardar credenciales, cookies, contraseñas, direcciones personales, DB dumps ni tokens.
- La alternativa Cloudflare debe ser **deny-by-default** hasta configurar Cloudflare Access (o autenticación equivalente) y validar permisos de las APIs.
- Cloudflare Workers Free y D1 tienen cuotas; aplicar cachés, límites y backoff. No garantizar cobertura exhaustiva de tiendas.
- No permitir que un preview o una rama de pruebas escriba en la DB de producción.
- No cambiar la producción en Hatchable ni borrar sus datos durante la migración. Trabajar en una rama de prueba y entregar evidencia de paridad antes del cambio.

## Migración pendiente
Leer `docs/CODEX_HANDOFF.md` y `docs/CLOUDFLARE_MIGRATION.md` (cuando exista).
Secuencia sugerida: (1) extraer lógica de dominio independiente, (2) pruebas,
(3) adaptar SQL/PostgreSQL a D1/SQLite sin pérdida de datos,
(4) proteger las APIs, (5) migrar rutas y cron una a una,
(6) probar el frontend completo, (7) auditar costes y seguridad, (8) pasar a producción solo tras aprobación.

## Primer mensaje para Codex
"Lee AGENTS.md, docs/CODEX_HANDOFF.md y el repositorio. Ejecuta npm run verify. Prepara un plan de migración incremental a Cloudflare Workers Free y D1 sin alterar Hatchable ni descubrir más tiendas. Revisa primero autenticación, integridad de evidencias y equivalencias SQL. Implementa cada fase con pruebas y commits en una rama."
