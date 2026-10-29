# Encargo maestro para Codex — TCG Atlas

Eres el agente principal de ingeniería de TCG Atlas, una aplicación personal y privada Pokémon TCG. **Trabaja sobre el repositorio existente** `David079-06/TGC-Atlas`; no crees una app genérica nueva. Los requisitos del propietario están escritos en:
- `AGENTS.md` (reglas obligatorias);
- `docs/PRODUCT_REQUIREMENTS.md` (todas las ideas del producto, diseño, precios, tiendas, alertas y orden);
- `docs/CODEX_HANDOFF.md` y `docs/ARCHITECTURE.md` (estado y código);
- `docs/CLOUDFLARE_MIGRATION.md` **en la rama** `codex/cloudflare-free-migration` (plan de migración, no despliegue);
- PR #1, borrador: https://github.com/David079-06/TGC-Atlas/pull/1.

## Primero: audita y mide antes de refactorizar

1. Clona y lee el proyecto existente. Determina qué módulos se ejecutan realmente en producción, qué módulos son prototipos o archivos legados y qué endpoints dependen del runtime de Hatchable.
2. Comprueba si hay archivos ausentes, dependencias inseguras, endpoints sin protección, componentes UI desconectados, funciones con errores y consultas SQL incompatibles con un runtime estándar. No inventes fallos: muestra archivos y pruebas.
3. Ejecuta `npm run verify` (Node 22), `npm --prefix cloudflare test`, `npm --prefix cloudflare run check` y `python3 cloudflare/tests/schema-smoke.py` en el entorno disponible. Si una prueba no se puede correr, indica por qué en vez de marcarla como superada.
4. Crea una matriz de funcionalidad: **implementada en Hatchable**, **parcial**, **solo interfaz**, **pendiente**. Documenta problemas prioritarios con riesgos y vías de corrección.
5. Mantén Hatchable como producción privada y estable. NO lo borres, no reconfigures los cron ni accedas a sus datos de cliente desde un test.

## Objetivo de la aplicación

TCG Atlas debe ser una app privada, rápida, responsive y profesional para gestionar **tiendas Pokémon TCG**, comparar productos Perú ↔ España, mantener listas de **reventa inmediata** y **inversión a 3–5 años**, revisar preventas, riesgos de reimpresión y noticias, precios y stock verificables y cálculos netos con supuestos explícitos. No inventar beneficios, stock, reseñas, fuentes, cotizaciones ni datos confirmados.

Los detalles de funcionamiento y UI están en `docs/PRODUCT_REQUIREMENTS.md`. **No reduzcas este documento a una tienda o un dashboard simple.** Construye los módulos independientemente y con flujos de usuario completos.

### Reglas que nunca debes romper

- Presupuesto: **0 € para herramientas externas**. No conectar APIs de pago, proveedores con facturación automática, planes premium ni métodos de pago sin autorización explícita.
- Seguridad: app y datos **privados** aunque el repo sea público. Autenticación y verificación de permisos en el servidor; nada de datos operativos en commits o issues públicos.
- Búsqueda automática de nuevas tiendas **pausada**: `AUTO_DISCOVERY_ENABLED=false`. **Perú solo muestra Okamidex y La Mazmorra TCG**, hasta nueva orden.
- Todas las tiendas, sea cual sea el país o la modalidad física/online/híbrida, usan la misma clasificación documental desde `lib/store-verification.js` y `shop_verification_reports`. Verde identifica identidad y actividad corroboradas, pero **no** certifica que comprar sea seguro; amarillo implica pruebas insuficientes; rojo solo con riesgo grave oficial documentado. Un error HTTP nunca determina fiabilidad.
- La vista de Tiendas **no incluye catálogo ni productos**. La búsqueda comercial completa queda para el final.
- Las acciones UI deben funcionar realmente. Datos externos siempre con origen, fecha y estado; cálculos con pruebas y sin promesas de tiempo real si no se pueden cumplir.
- Preservar idiomas/ediciones y fuentes: los datos de una ETB inglesa no son intercambiables con otra variante.
- Diseño moderno, minimalista y ligeramente futurista, sin saturación visual, con buena accesibilidad y UX móvil. Utiliza Figma conectado para preparar el sistema visual cuando comience la fase de interfaces.
- Comprobaciones deterministas, CI, commits pequeños y PRs con análisis de riesgos. No introducir tests falsos ni datos ficticios en producción.

## Cómo continuar exactamente

**PRIMERA ENTREGA (sin desplegar):** baselínea reproducible, inventario de módulos e interfaces, mapa de dependencias de Hatchable, vulnerabilidades reales encontradas, orden de refactorización, propuestas de arquitectura en 0 €, tests y un PR con mejoras de alto impacto que no cambien producción.

**SEGUNDA ENTREGA:** extrae el dominio puro de comprobación de tiendas y cálculos de productos para ejecutarlos independientemente de Hatchable; añade pruebas de contrato para todas las rutas, datos incompletos y escenarios negativos.

**TERCERA ENTREGA:** dibuja en Figma los flujos principales y un sistema visual coherente. Construye las páginas con componentes reutilizables, responsive y navegación real; deja el buscador de tiendas pausado.

**CUARTA ENTREGA:** prepara el adaptador Cloudflare Workers Free + D1, auth privada owner-only, migraciones equivalentes a PostgreSQL, restauración y rollback. Empieza siempre en la rama `codex/cloudflare-free-migration`. El Worker de PR #1 responde 503 deliberadamente; **no es una app funcional ni se debe publicar antes de protegerla**. No sobrescribas datos privados ni cambies el alojamiento sin una aprobación nueva.

**QUINTA ENTREGA:** módulos de productos, precios, inversión/reventa, preventas y alertas, bajo las restricciones de fuentes, stock y coste. Tests E2E con navegación real en PC/móvil.

**ÚLTIMA ENTREGA, solo bajo autorización:** reactivar el agente buscador de tiendas con fuentes gratuitas permitidas, progresos reales, deduplicación y colas persistentes.

## Flujo de trabajo

Trabaja en ramas. No fusiones PR #1 hasta que sea funcional y se revise la seguridad. Antes de cualquier commit, ejecuta `npm run verify` y los tests de cada subproyecto. Si una funcionalidad ya existe, consérvala y mejórala; si es parcial, explícitalo. Muestra qué cambió, tests ejecutados, restricciones de coste y el siguiente bloque de trabajo.

**Comienza ahora por el inventario real y las pruebas de la PRIMERA ENTREGA; no trates de migrar todo el backend de golpe.**