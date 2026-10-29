# Complementos y herramientas de TCG Atlas — selección sin costes

Fecha: 2026-10-29. **No instalar todo por instalar**: cada servicio añade permisos, mantenimiento, posible coste y complejidad. La selección depende de la fase y del plan gratuito real.

## A. Complementos de ChatGPT/Codex

| Nombre | Estado confirmado | Prioridad | Uso y criterio |
|---|---|---|---|
| **GitHub** | Conectado | Imprescindible | Repositorio `David079-06/TGC-Atlas`, ramas, issues, PR, CI, historial y control de cambios. |
| **Figma** | Conectado | Imprescindible para rediseño | Prototipos PC/móvil, sistema visual, accesibilidad y pantallas. No hace falta instalar otro constructor visual. |
| **Superpowers** | Ofrecido, no confirmado como instalado | Útil | Flujo de planificación, pruebas primero (TDD), depuración y revisión de PR. No sustituye a los tests reales. Revisar cualquier coste o permiso antes de instalar. |
| **Context7** | Ofrecido en una conversación anterior, no confirmado instalado | Opcional | Documentación actualizada de herramientas que cambian con frecuencia. Codex también puede consultar documentación oficial sin él. |
| **Supabase** | Ya conectado | Alternativa, no usar aún | PostgreSQL/Auth si se decide evitar la conversión de PostgreSQL a D1. Tiene límites de plan Free; evaluar suspensión, privacidad y cuota antes de migrar. |
| **Vercel** | Ya conectado | Alternativa, no usar aún | Alojamiento si Cloudflare no cumple las necesidades. No desplegar otra copia por defecto ni combinar automáticamente planes. |
| **Canva** | Ya conectado | No necesario ahora | Presentaciones; Figma resulta más adecuado para el diseño de pantallas de TCG Atlas. |
| **Cloudflare** | No se encontró complemento conectable directo en este chat | Infraestructura futura | Usar Wrangler en Codex y autorización de cuenta vía panel de Cloudflare. No hace falta un plugin Cloudflare específico para escribir código o tests. |

**No se recomiendan para instalar ahora**: Replit, Lovable, Railway, Render, Firecrawl, TinyFish, otra base de datos ni un proveedor LLM de API de pago. Suponen solapamiento, cuotas y, a menudo, facturación o transferencia adicional de datos. El motor de búsqueda de comercios sigue **pausado**.

**PostHog / Datadog / Sentry:** opciones posibles para observabilidad en una fase avanzada, pero NO necesarias para una app personal al principio. El registro y las pruebas propias son suficientes mientras se valida la infraestructura. Nunca enviar datos de usuario/tiendas privadas sin analizar primero la política de privacidad.

## B. Herramientas de desarrollo (paquetes/servicios, NO complementos de ChatGPT)

**Ya disponible en el repositorio sin npm install**
- Node.js 22+, `node --test` para pruebas de la lógica de confianza, y `npm run verify`.
- GitHub Actions para ejecutar las pruebas en cada PR.
- D1/SQLite `cloudflare/tests/schema-smoke.py` como test sintético en la rama de migración.
- Leaflet ya se encuentra en `public/vendor/`, con sus archivos de licencia. No cargar mapas innecesarios de terceros.

**Añadir después y solo cuando haya un frontend/backend migrado y ejecutable**
1. **Playwright** (`@playwright/test`): E2E en Chromium/Firefox/WebKit, escenarios con usuario autenticado, navegación, móvil (375px) y pantallas reales. Es una librería de pruebas, no un servicio de pago. Los binarios de navegador consumen espacio/CI; usar ejecuciones razonables.
2. **axe-core** + integración de Playwright: auditoría automática WCAG de estructura, etiquetas, contraste y navegación. La automatización no sustituye la revisión manual con teclado/lector de pantalla.
3. **ESLint + Prettier**: código ordenado, convenciones y detección de errores. Elegir reglas realistas; evitar un refactor global antes de inventariar.
4. **TypeScript** y **Vitest**, solo si Codex decide introducir un build o una interfaz modular. Mantener `node --test` si basta; no duplicar runners por moda.
5. **Lighthouse CI**: rendimiento, accesibilidad y mejores prácticas cuando la app protegida tenga un entorno de pruebas con autenticación.
6. **GitHub CodeQL** y **Dependabot**: revisar vulnerabilidades de código y dependencias, especialmente en repositorios públicos (características disponibles gratis para públicos, según GitHub). No configurar actualizaciones que rompan la app automáticamente.
7. **Wrangler CLI** para Workers + D1: solo para simular y migrar en cuenta autorizada. No ejecutar `wrangler deploy` sin proteger el acceso.
8. **OWASP ZAP (opcional)** y revisión de SSRF/XSS/CSRF/inyección SQL: auditoría de un staging propio con autorización, nunca de tiendas ajenas.

**Comandos de referencia** (instalar solo dentro del proyecto cuando llegue su fase):
```sh
npm run verify
npm --prefix cloudflare test
python3 cloudflare/tests/schema-smoke.py

# Futuras dependencias, NO instaladas ni necesarias todavía:
# npm install -D @playwright/test @axe-core/playwright
# npm install -D eslint prettier
# npm install -D lighthouse @lhci/cli
# npm install -D vitest typescript
```

Las herramientas open source no cobran por licencia; el hosting y el consumo de CI/scraping pueden tener cuotas o cargos según cuenta y plan.

## C. Decisiones concretas para cada idea del propietario

| Necesidad | Elección mínima | Evitar |
|---|---|---|
| Diseño futurista responsive | Figma + CSS de diseño + pruebas Playwright/axe | Otro generador de interfaces con suscripción |
| Seguridad, privacidad, pruebas | Tests Node, GitHub Actions, CodeQL, auth server-side | Confiar en CORS o poner un enlace oculto |
| Precios Perú/España | Conectores propios autorizados, caché y fechas | APIs comerciales de pago, HTML masivo prohibido |
| Conversión PEN/EUR | Fuente FX pública permitida con fecha, fallback explícito | Fingir tiempo real |
| Stock | Registros exactos comprobados; unknown si no hay cifra | Estimar cantidades |
| Inversión y reventa | Librería de cálculos pura, escenarios, gráficos con tooltip | Prometer rendimientos |
| Tiendas online/físicas | Dossier universal y mapa Leaflet | Reseñas inventadas o verificación HTTP como confianza |
| Tareas programadas | Cron/colas idempotentes dentro de cuota gratuita | Reintentos ilimitados |
| Noticias y alertas | Fuentes oficiales y eventos con trazabilidad | Rumores con etiqueta confirmado |
| Despliegue privado | Cloudflare Workers Free/D1 si viables con auth, sino continuar Hatchable | Desplegar una copia pública o pagar sin permiso |

## D. Configuración recomendada ahora

1. **Usar GitHub y Figma que ya están conectados.**
2. **Conectar Superpowers solo si su instalación y permisos son aceptables**; disponible como sugerencia en esta conversación. **Context7 es opcional**, ya sugerido.
3. Abrir Codex Cloud, conectar el repositorio si lo solicita y crear un entorno con Node 22; leer `docs/CODEX_MASTER_PROMPT.md`.
4. No crear Cloudflare en producción hasta tener auth y base de datos migradas. No añadir Supabase o Vercel «por si acaso» cuando se eligió Cloudflare como objetivo inicial.
5. Priorizar la arquitectura, reglas de evidencia y UI; **el buscador de nuevas tiendas se trabaja al final**.

## E. Criterios al evaluar cualquier nuevo complemento

- ¿Resuelve una carencia real que no cubra GitHub, Figma o Codex?
- ¿Tiene plan gratuito suficiente y **sin facturación automática**?
- ¿Qué permisos y datos personales/operativos requiere?
- ¿Cuántos servicios nuevos hay que mantener, actualizar y proteger?
- ¿Permite exportar código y datos o crea dependencia del proveedor?
- ¿Podemos sustituirlo por una librería local libre?
- ¿Se puede medir con pruebas y apagarlo inmediatamente sin romper la aplicación?

Si no mejora significativamente la calidad, coste o seguridad, **no se instala**.
