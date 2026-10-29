# Pokémon TCG Atlas — arquitectura

## Propósito

Directorio privado para investigar comercios Pokémon TCG. La aplicación diferencia **encontrar**, **revisar** y **recomendar**. Un mapa, un certificado HTTPS o un conector de catálogo no garantizan pagos ni entregas.

## Entorno

Hatchable sirve actualmente los archivos de `public/` (sin compilación), publica rutas desde `api/`, ejecuta módulos de `lib/`, aplica migraciones PostgreSQL y tareas horarias. Es la producción actual, no un servicio portable automáticamente. Para Codex y Cloudflare, consulta [CODEX_HANDOFF.md](./CODEX_HANDOFF.md).

## Frontend

- `public/index.html`: entrada, estilos y scripts, ordenados por dependencia.
- `public/locations.js` y `public/locations.css`: selección geográfica.
- `public/stores.js`: controlador del directorio (selección, búsqueda, acciones de usuario, peticiones).
- `public/scan-progress.js` y `public/scan-progress.css`: panel visual autónomo de las tres fases.
- `public/stores.css`, `public/stores-standalone.css`, `public/store-trust.css`: interfaz y estados.
- `public/vendor/leaflet.js` y estilos: mapa; se mantiene su licencia de distribución.

No se añaden recursos a la lista personal durante una búsqueda. Solo el botón **Añadir a Mis tiendas** guarda una tienda.

## Backend

| Área | Archivos |
| --- | --- |
| Países y zonas | `api/country-investigation.js`, `lib/country-areas.js` |
| Estado / métricas | `lib/investigation-status.js` |
| Descubrimiento | `lib/country-investigation.js` |
| Revisión | `lib/shop-review.js` |
| Candidatas temporales | `api/discovery.js` |
| Lista personal | `api/stores.js`, `lib/store-validation.js`, `lib/store-presenter.js` |
| Diagnóstico privado | `api/dev-health.js` |
| Tareas programadas | `api/jobs/…`, `hatchable.toml` |

## Datos y privacidad

- `discovered_shops`: caché temporal (hasta 30 días). No forma parte de la lista personal.
- `discovered_shop_evidence`: verificaciones técnicas previas de candidatas; no tienen prioridad frente al expediente documental universal.
- `country_search_areas`: coordenadas de planificación, sin comercios.
- `country_investigations`: progreso por país; no representa un censo exhaustivo.
- `store_registry`: comercios guardados expresamente por el usuario; las etiquetas se evalúan desde `shop_verification_reports` también para esta lista.
- `shop_verification_reports`: expediente documental por país y dominio con fuentes, ubicaciones, registros secundarios y estado técnico separado. `lib/store-verification.js` determina verde, amarillo y rojo de manera uniforme.
- `market_offers`: catálogo histórico separado del módulo Tiendas. Nunca publicar su contenido como archivo del repositorio.

Las rutas para datos son `access='admin'`; las tareas programadas usan `access='scheduler'`. Mantener el proyecto en modo personal/privado aunque el código fuente se publique.

## Límites conocidos

Las fuentes geográficas abiertas no sustituyen una búsqueda general de comercios online ni permiten afirmar que se encontraron todas las tiendas de un país. Los porcentajes indican avance de las áreas planificadas, no cobertura nacional. Las etiquetas no constituyen garantías de compra.
## Decisiones vigentes antes de pasar a Codex

- La búsqueda y verificación automáticas de nuevas tiendas están pausadas. `AUTO_DISCOVERY_ENABLED=false` en `lib/directory-mode.js`; se permite la revisión técnica manual de una tienda existente.
- Perú mantiene por ahora solo Okamidex y La Mazmorra TCG como tiendas candidatas iniciales. No se añaden otras automáticamente.
- Una web accesible no equivale a verificación de compras. Un resultado verde significa identidad y actividad comercial corroboradas por pruebas de distinta procedencia.
- El repositorio incluye `AGENTS.md`, pruebas `npm run verify` y guía `docs/CODEX_HANDOFF.md`. La rama `codex/cloudflare-free-migration` prepara un prototipo de migración cerrado, no desplegado.
