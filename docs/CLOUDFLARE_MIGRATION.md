# TCG Atlas: migración gradual a Cloudflare Workers Free + D1

**Situación al 29/10/2026:** producción **Hatchable v85**; rama experimental `codex/cloudflare-free-migration`. La migración NO está desplegada. El código Cloudflare actual es una base deliberadamente cerrada (503) y un esquema D1 vacío.

## Principio innegociable: aplicación privada y coste 0 €
- Nada se publica ni se conecta a la base real hasta proteger todos los endpoints y verificarlo.
- No activar servicios de pago, facturación automática, upgrades ni APIs comerciales. El uso ha de quedar por debajo de las cuotas gratuitas. Si se agota una cuota, pausar operaciones y conservar la cola.
- Los registros de tiendas, expedientes comerciales, listas guardadas, precios y movimientos del usuario son privados. GitHub público contiene **solo código, migraciones vacías y fixtures sintéticas**.
- No exportar datos de PostgreSQL a archivos de la rama, pruebas, issues ni logs públicos.

## Inventario del estado existente
| Pieza de Hatchable | Alternativa planteada | Trabajo pendiente |
| --- | --- | --- |
| `public/` HTML/JS/CSS y Leaflet | Cloudflare Assets/Workers | Mantener rutas y proteger toda la UI antes de servirla |
| `hatchable.db.query` con PostgreSQL | Cloudflare D1/SQLite | Reescribir consultas `$1`, `::jsonb`, tipos, `NOW()`, `INTERVAL`, `FOR UPDATE SKIP LOCKED`, locking y transacciones |
| `api/*.js` con `access='admin'` | Cloudflare Workers con auth | Implementar cada ruta, autenticación y tests de autorización; **no** permitir GET anónimo |
| `scheduler.at` y `[[cron]]` | Cloudflare Cron Triggers y colas durables | Cambiar la planificación, reclamación de trabajo y backoff sin violar cuotas |
| `browser.session` y navegador integrado | Workers + proceso externo autorizado | Cambiar pruebas web sin automatizar CAPTCHA ni raspar fuentes con restricciones; revisar cuotas y uso |
| `shop_verification_reports` / `store_registry` | Tablas D1 y capa de dominio | Preservar fechas, URLs de prueba, criterio de confianza y asociación por dominio |
| Servidores externos Photon/Overpass | Mantener límites gratuitos | Caché, intervalos conservadores y prohibición de búsquedas masivas |
| Estado de usuario y sesiones | Cloudflare Access o autenticación owner-only | Validar denegación de usuarios anónimos y pruebas de preview |

## Fases de Codex (secuenciales)
1. **Baselínea:** ejecutar `npm run verify`, registrar las rutas existentes y crear tests de comparación de fichas en frío. No modificar producción.
2. **Extraer dominio:** aislar validación de tiendas, deduplicación y `evaluateVerification` de `hatchable`, manteniendo resultados idénticos. Probar PE/ES, online/física/mixta, errores HTTP, fuentes redundantes y rojo documental.
3. **Diseñar D1:** inventariar las migraciones PostgreSQL existentes; redactar equivalencias SQLite y pruebas que detecten pérdida de relaciones, índices, duplicados y datos; D1 se inicializa **vacía**, sin datos de clientes en GitHub.
4. **Autenticación primero:** configurar Cloudflare Access o servicio equivalente con el usuario propietario; cada API debe devolver 401/403 a quien no esté autorizado. No exponer la UI ni sesiones por error.
5. **Portar APIs y cachés:** contratos `/api/discovery`, `/api/stores`, `/api/store-verification`, etc., adaptados a D1 y Workers. Rutas no migradas deben responder 503, no datos inventados. No usar la base de datos de Hatchable desde pruebas.
6. **Tareas programadas:** garantizar idempotencia, cursor de progreso, recuperación de locks, reintentos individuales, límites de coste y pausas por proveedor. Evitar proyectos gratuitos excedidos.
7. **UI privada:** servir los assets existentes *después* de la autenticación y pruebas de responsive, accesibilidad, estados de cola, detalles y mapa.
8. **Exportación segura:** crear una copia de PostgreSQL por canal privado, cifrada y verificable; transformar e importar a D1 en cuenta controlada por el propietario. Nunca meter archivos de datos en PRs.
9. **Paridad y rollback:** comparar recuentos e IDs, informes de Okamidex y La Mazmorra, historial, estado de comprobación, seguridad y pruebas de carga moderadas. Solo después pedir autorización para cambiar de plataforma. Mantener Hatchable hasta confirmar todas las rutas.

## Criterios de aceptación mínimos
- La aplicación sigue privada. `GET /api/stores`, `/api/discovery`, `/api/store-verification`, `/api/jobs/*` nunca revelan datos sin autorización; no se debe confiar en CORS como autenticación.
- En Perú hay **dos tiendas temporales**: Okamidex y La Mazmorra TCG; `AUTO_DISCOVERY_ENABLED=false` hasta nueva orden.
- La verificación documental usa una única función, nunca califica por HTTP 200; fuentes repetidas del mismo editor cuentan como una, faltan RUC oficiales si no se consultaron realmente.
- Se mantienen las tiendas seleccionadas por el usuario y el historial de datos fuera del repositorio.
- Las pruebas unitarias, de contrato, autorización, migración y UI pasan; las métricas no superan las cuotas Free.
- Un cron o fallo externo no crea costes ni realiza más consultas de las permitidas.
- Cualquier funcionalidad no migrada muestra error explícito; **nunca** una réplica ficticia de datos.

## Cloudflare y seguridad
Cloudflare Workers Free ofrece cuotas, pero no un recurso ilimitado. El esquema `cloudflare/migrations/0001_initial.sql` es solo demostrativo y se ampliará antes de conectarlo. `cloudflare/wrangler.jsonc` mantiene `workers_dev=false`; configurar una ruta o dominio públicamente **no equivale a tener autenticación**.

El usuario debe crear o conectar su cuenta Cloudflare desde el panel y confirmar el plan gratuito. No hay una conexión Cloudflare disponible en el chat actualmente. No ejecutar `wrangler deploy` automáticamente ni subir secretos de producción a GitHub Actions.

Referencia: https://developers.cloudflare.com/workers/platform/pricing/ , https://developers.cloudflare.com/d1/platform/pricing/ y https://developers.cloudflare.com/workers/ci-cd/builds/

## Siguiente tarea concreta en Codex
> Revisa AGENTS.md y este documento, corre npm run verify y npm --prefix cloudflare test. Refactoriza la lógica pura de verificación para que sea importable sin Hatchable, mantén todos los tests verdes y crea un contrato de API autenticado para Cloudflare. No despliegues, no migres datos ni cambies la app actual. Entrega un PR con tests y una lista de riesgos.

**Estado de la rama:** prototipo seguro para revisión y trabajo de Codex, **no migración completada**.
