# Pokémon TCG Atlas — arquitectura

## Propósito

Directorio privado para investigar comercios Pokémon TCG. La aplicación diferencia **encontrar**, **revisar** y **recomendar**. Un mapa, un certificado HTTPS o un conector de catálogo no garantizan pagos ni entregas.

## Entorno

Hatchable sirve directamente archivos en `public/` (sin proceso de compilación), publica rutas desde `api/`, ejecuta módulos compartidos en `lib/`, aplica migraciones SQL y ejecuta una tarea horaria descrita en `hatchable.toml`.

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

- `discovered_shops`: caché temporal (24 horas). No forma parte de la lista personal.
- `discovered_shop_evidence`: pruebas ligadas a candidatas temporales; se limpian al caducar.
- `country_search_areas`: coordenadas de planificación, sin comercios.
- `country_investigations`: progreso por país; no representa un censo exhaustivo.
- `store_registry`: comercios guardados expresamente por el usuario. Puede conservar una ficha física sin web y un resumen de las pruebas en el momento de guardarla.
- `market_offers`: catálogo histórico separado del módulo Tiendas. Nunca publicar su contenido como archivo del repositorio.

Las rutas para datos son `access='admin'`; las tareas programadas usan `access='scheduler'`. Mantener el proyecto en modo personal/privado aunque el código fuente se publique.

## Límites conocidos

Las fuentes geográficas abiertas no sustituyen una búsqueda general de comercios online ni permiten afirmar que se encontraron todas las tiendas de un país. Los porcentajes indican avance de las áreas planificadas, no cobertura nacional. Las etiquetas no constituyen garantías de compra.