# TCG Atlas — especificación funcional para Codex

**Estado:** especificación de producto y contrato de evolución, NO afirmación de que todo esté ya implementado.
**Última revisión:** 29/10/2026.
**Fuente:** decisiones del propietario recogidas en el desarrollo del proyecto.
**Repositorio:** `David079-06/TGC-Atlas`.
**Producción actual:** Hatchable privada. **Nueva migración:** rama `codex/cloudflare-free-migration`, no desplegada.

## 1. Objetivo general

Crear una aplicación web **personal y privada** para investigar, comparar, gestionar y seguir productos Pokémon TCG en Perú y España, tanto para **reventa inmediata** como para **inversión/colección a medio y largo plazo**. Debe funcionar cómodamente en móvil y ordenador, ser rápida, elegante, clara y modular, y **no exigir APIs de pago ni poner en marcha facturación**.

No inventar información sobre tiendas, precios, stock, reimpresiones, noticias, reseñas, beneficios ni disponibilidad. Cualquier estimación debe etiquetarse como estimación con suposiciones visibles.

### Requisitos no negociables

- Presupuesto de herramientas externas: **0 €/mes** como objetivo. Usar únicamente planes gratuitos autorizados y dentro de sus cuotas; pausar antes de superar límites. Comprobar periódicamente las condiciones de cada proveedor. No contratar servicios ni introducir métodos de pago sin solicitud explícita.
- La app, la base de datos, los informes personales y las APIs deben permanecer **privados**. No basta con CORS o una URL difícil de adivinar; autenticar al propietario y denegar por defecto.
- Código y tareas en GitHub, con ramas, PR, commits pequeños `feat/fix/refactor/test/perf/docs/security`, pruebas automáticas y rollback.
- Si una fuente no está disponible, mostrar **sin verificar**, **sin stock comprobado** o **dato antiguo**; no suplirlo con números ficticios.
- Navegación moderna y minimalista, con jerarquía visual clara, buena tipografía, tonos sobrios, animaciones sutiles, estados de carga reales y sin demasiados elementos por pantalla. No generar botones decorativos inertes.
- Separar **tiendas**, **productos**, **inversión**, **reventa**, **preventas**, **alertas** y **configuración**, manteniendo un sistema visual y terminología coherentes.
- **Fase actual:** aparcar el buscador geográfico/comercial de nuevas tiendas. `AUTO_DISCOVERY_ENABLED=false`. Perú contiene temporalmente **solo dos candidatas: Okamidex y La Mazmorra TCG**. No ampliar automáticamente la lista hasta autorización del propietario.
- Al terminar la infraestructura y los módulos visuales, retomar el buscador de tiendas como una **fase separada**, sin reactivar la extracción masiva prematuramente.

## 2. Modelo de información transversal

Cada registro recolectado debe mantener, cuando corresponda:

- Origen, comercio, URL exacta de la página comprobada, moneda, idioma, fecha/hora de captura, fecha de última verificación válida, calidad del dato, estado de error y si es información oficial, de terceros, de usuario o cálculo.
- Los precios y cotizaciones de divisa con fecha. Convertir PEN ↔ EUR con tasa con marca temporal y, si no hay tasa reciente, indicar que la conversión es aproximada.
- Stock **exacto publicado y verificable** o explícitamente `unknown`. No tratar «en stock» como una cantidad numérica. No estimar unidades ni mostrar 0 falsos. Para límites de compra de una estrategia, no permitir más unidades que las verificadas.
- Identidad de producto por colección, edición, tipo (ETB, booster box, UPC, etc.), número de unidades, idioma, condición, lanzamiento, región y fuente. No confundir variante inglesa con española.
- Imágenes/URLs bajo sus licencias y políticas de uso; no copiar páginas protegidas ni falsificar fotos. Citas y fuentes verificables.
- Fechas reales de publicación/actualización de noticias, distinguiendo **confirmada**, **rumor**, **no verificable** y **caducada**.
- Historial de cambios, comparabilidad entre observaciones y deduplicación por tienda, edición y producto.

## 3. Módulo Tiendas: verificación universal

Separar dos tareas: **descubrir una tienda** y **verificar una tienda existente**. Actualmente la primera está pausada.

Para cada tienda, independientemente del país o de si es web, física o híbrida:

1. Identidad comercial: razón social, identificador fiscal local (RUC, CIF/NIF, RFC, VAT, etc.), estado en fuente oficial si **se consultó realmente**, entidad y fecha; diferenciar un registro secundario de la fuente gubernamental.
2. Modalidad: **online**, **física** o **ambas**. Separar local abierto al público, punto de recogida, domicilio fiscal y dirección anunciada sin corroboración.
3. Cada sucursal física como local independiente con dirección, localidad, horario declarado, fuente, fecha y grado de comprobación. No inventar horarios ni marcar `abierto ahora` si no consta.
4. Contacto: web propia, teléfono, correo, redes anunciadas, políticas de pago, envío, devoluciones, garantías y preventas. Indicar qué está declarado y qué fue confirmado externamente.
5. Fuentes independientes: URLs exactas, fecha, editor, afirmación concreta respaldada; no contar dos páginas de la misma empresa como dos validaciones externas. Photon y Overpass comparten OSM: no son fuentes de confianza distintas.
6. Reputación/reseñas: solo reseñas trazables y suficientes para argumentar el resultado. La ausencia de reseñas no prueba fraude. No deducir confianza por un HTTP 200 o HTTPS.
7. Etiqueta estable y única en **todas las vistas**, calculada desde `shop_verification_reports` mediante `lib/store-verification.js` o un dominio puro equivalente:
   - **Verde:** identidad y actividad comercial corroboradas documentalmente.
   - **Amarillo:** documentación insuficiente o pendiente.
   - **Rojo:** riesgo grave vigente con prueba oficial concreta, no fallos de red.
   - **Estado técnico separado:** web accesible, inaccesible, pendiente, última comprobación.
8. Cada comprobación debe mostrar en qué se basa la etiqueta, cambios desde la última vez y elementos pendientes. No alternar verde/amarillo por errores temporales de disponibilidad web.
9. Las tiendas *descubiertas* son temporales. Solo se incorporan a «Mis tiendas» cuando el propietario pulsa **Añadir**. Nunca guardarlas en la lista personal automáticamente.
10. La vista **Tiendas no contiene catálogo de productos ni preventas**, solo descubrimiento/selección cuando se reactive, verificación, ubicación, información comercial y tiendas recomendadas con cautelas.

**Casos iniciales:** Okamidex y La Mazmorra TCG, en Perú. Sus expedientes están en el backend existente y deben mantenerse con las fuentes/fechas e incertidumbres originales. No inventar una verificación oficial de SUNAT si no se consultó realmente.

### Cuando el usuario reactive el buscador (más adelante)
- Selección país/ciudad con búsqueda de zonas y sugerencias, mapa con zoom, lista de fuentes, tarjetas y detalle, filtros por web/física/híbrida y etiquetas verde/amarillo/rojo.
- Agente de descubrimiento que pruebe **fuentes autorizadas gratuitas** en lotes pequeños; informes de cobertura real sin afirmar «todas las tiendas del país» sin pruebas.
- Barra de progreso *real* con zonas planeadas, consultas ejecutadas, tiendas únicas, verificaciones acabadas, pendientes, errores, cuotas, próxima ejecución, y fichas nuevas visibles mientras continúa el trabajo.
- Cola persistente por tienda con retries individuales y caché por proveedor/área; deduplicación de fuentes; presupuesto diario e intervalos por proveedor; evitar verificaciones duplicadas.
- Si se incorpora una tienda voluntariamente, **el análisis de productos se ejecutará en un módulo distinto**, nunca dentro de Tiendas.

## 4. Módulo Productos y fuentes de precios

- Catálogos de tiendas fiables, especialmente Perú; prioridad conocida: **Okamidex (okamidex.pe)**, pero no asumir stock sin comprobación.
- Permitir añadir/eliminar fuentes y seleccionar país/ciudad. Revisar permiso de consulta y respetar condiciones/robots/rate limits; no eludir CAPTCHA.
- Comparación con **precios reales de tiendas españolas**, diferenciando precios de tiendas online y anuncios de reventa entre particulares. Calcular medias/medianas sobre muestras comparables (edición, idioma, producto, fecha, impuestos y envío) e indicar tamaño de muestra.
- Disponibilidad/stock: excluir automáticamente productos sin existencias de recomendaciones de compra. Si la cantidad exacta no puede verificarse, **no presentar unidades disponibles inventadas** ni exceder las comprobadas.
- Detección de reservas/preventas por etiquetas publicadas, no por una lista rígida de un solo lanzamiento. Todas las preventas identificadas de las fuentes activas deben aparecer en la sección correspondiente con fecha y condiciones.
- Actualizaciones realistas según fuente, cuota gratuita y necesidad; **no afirmar actualización cada segundo** si la web/API no lo permite. Mostrar última sincronización real y un botón de actualización manual sometido a límites.
- Distinguir confirmación de que la página existe, que el precio está publicado, que permite completar un checkout y que la venta/stock está realmente disponible. Son niveles de evidencia distintos.

## 5. Módulo Inversión y reventa

Dos espacios separados, aunque compartan catálogo y fuentes:

**Reventa inmediata**
- Precio de compra PEN, conversión a EUR, precio comparable en España, comisión de plataforma, transporte, impuestos/aduanas si proceden, márgenes netos, rotación y liquidez estimada.
- Ordenar por rentabilidad, riesgo, evidencia y rapidez de salida. No garantizar que un producto se venda a un precio proyectado.
- Lista editable con cantidad comprobada disponible, coste agregado, beneficio **estimado** y resultado real cuando el propietario introduzca una venta.

**Inversión y colección (2–3 y 3–5 años)**
- Lista separada para conservar sellado o abrir productos, sin confundir el valor esperado de abrir sobres con beneficio garantizado.
- Escenarios bajo/base/alto para 1, 3 y 5 años, gráficos con tooltip, bandas de incertidumbre, suposiciones documentadas y riesgo de reimpresiones.
- Ver diferencia entre beneficio bruto, neto, rendimiento anualizado y capital inmovilizado. Inversión Pokémon TCG es especulativa.
- El presupuesto debe ser configurable, no fijo; sumar/recalcular cuando se añaden cantidades y cambios de precios o comisiones.
- Poner a prueba que los totales y márgenes coinciden con las filas y que los idiomas/ediciones no se mezclan.

## 6. Productos prioritarios e idioma

- **Delta Reign:** cuando la fuente indique una preventa real, tratar la variante inglesa como prioridad en el análisis pedido anteriormente. No inventar fecha/stock/noticias de lanzamiento.
- **30th** y otras colecciones: permitir productos en español e inglés cuando existan, diferenciándolos.
- Productos anteriores estudiados, p. ej. *Prismatic Evolutions Super Premium Collection* y otras referencias del usuario: no inventar stock ni cotizaciones y no tratarlos automáticamente como inversiones.
- Las prioridades son filtros/preferencias, nunca garantías de rentabilidad.

## 7. Alertas, noticias y riesgos

- Separar noticias oficiales confirmadas, rumores, fuentes sin corroborar y cambios de precio/stock.
- Riesgos de reimpresiones, cambios de series, nuevas tiradas, sanciones, cierre de comercios y retirada de listados.
- Alertas por cambio de precio, rentabilidad al superar un umbral, preventa abierta/agotada y cambios de disponibilidad verificados.
- Los avisos deben contener fuente, fecha, variable anterior/nueva, motivo y acción sugerida; deduplicarlos y permitir marcarlos como revisados.
- No prometer notificaciones instantáneas, vigilancia 24/7 o disponibilidad de proveedores gratuitos que no esté implementada.

## 8. Experiencia de usuario (UX/UI)

- Diseño coherente **moderno, profesional, minimalista y ligeramente futurista**, sin sobresaturación visual ni componentes genéricos repetidos. Planificar los flujos primero en Figma (conectado).
- Navegación clara en escritorio (sidebar) y móvil (adaptativa); accesibilidad teclado/táctil, foco visible, contraste WCAG, estados disabled/hover/loading/error/success.
- Pantallas sin demasiadas funciones simultáneas; un objetivo claro por vista. Botones y enlaces con comportamiento real; formularios validados y feedback honesto.
- Tiendas: mapa + listado + ficha documental. No mezclar catálogo.
- Productos: búsqueda, filtros, idioma, edición, precios y disponibilidad.
- Reventa/inversión: tablas editables, comparaciones y gráficos separados, información de incertidumbre y totales.
- Noticias/alertas: separadas, prioridad, fecha, confiabilidad y fuente.
- Mostrar progreso de actividades extensas de modo **incremental, no animación ficticia**.
- Comprobar diseño en 375px, tablet y 1440px; pruebas de rendimiento y accesibilidad, especialmente al navegar y filtrar grandes listas.

## 9. Privacidad, legalidad, fiabilidad, rendimiento

- Autenticación propietario para UI y APIs, sesiones seguras, controles servidor en cada ruta. Sin credenciales en GitHub o en frontend.
- Seguridad ante SSRF, redirecciones, HTML externo malicioso, inyección SQL, XSS, CSRF y abuso de cron, con límites por usuario y proveedor.
- En webs externas, no ejecutar scripts de terceros ni seguir redirecciones de forma insegura; no usar cookies/contraseñas personales para scraping. Documentar robots, términos y atribución OpenStreetMap.
- Cachear por fuente con TTL y fecha; idempotencia, locking, retries, tareas atómicas, índices y SQL parametrizado. Evitar búsquedas repetidas si los datos siguen vigentes.
- Fomentar pruebas unitarias, integración, contrato API, end-to-end, seguridad, accesibilidad, smoke de despliegue y rollback. No introducir datos ficticios en producción.
- Conservar copias de seguridad **privadas** y estrategia de restauración, nunca en el repositorio público.
- Medir latencias y coste de cuota. El plan gratuito de Cloudflare Workers tiene limitaciones, y las labores de rastreo intensivas pueden requerir otro diseño si exceden esos límites; no activar un servicio de pago por defecto.

## 10. Roadmap de implementación

**Fase 0 — Codex y auditoría (actual):** repositorio completo, `AGENTS.md`, contrato de tests y flujo de CI, análisis de cobertura de funciones, mapeo de dependencias Hatchable, README y plan de rollback. Sin tocar producción.

**Fase 1 — Replantear producto y diseño:** mapa de información, arquitectura de pantallas, prototipos Figma de escritorio/móvil, navegación y diseño visual sin perder funciones ni inventar datos.

**Fase 2 — Dominio y pruebas:** extraer lógica de productos/precios, tipos de tienda, confianza y estrategias a módulos puros; realizar tests con fixtures. Reparar duplicidades.

**Fase 3 — Infraestructura privada gratuita:** Cloudflare Workers + D1 como candidato, primero autenticación, después paridad SQL/API, luego migración de datos en entorno privado y rollback. Si las cuotas o una función impiden migrar, conservar Hatchable y documentar la limitación sin cargos.

**Fase 4 — Productos, reventa, inversión, gráficos, preventas y alertas:** integración modular con fuentes comprobadas, rendimientos y costes netos, pruebas de extremo a extremo.

**Fase 5 — Buscador de nuevas tiendas (la última):** reactivar solo con autorización, límites, colas, verificación universal y progreso real.

**Fase 6 — Auditoría final:** accesibilidad, móvil/PC, errores, rendimiento, costes, privacidad, integridad y documentación de límites.

## 11. Condiciones de entrega de cada fase

1. Explicar exactamente qué función se implementó, qué se mantiene pendiente y qué no puede comprobarse.
2. Añadir tests de regresión y hacer que GitHub Actions pase antes de fusionar.
3. No tocar la producción Hatchable salvo autorización expresa para una acción de cambio de producción.
4. Comprobar rutas privadas y prohibir datos públicos por error.
5. No afirmar estado en tiempo real, cobertura nacional completa, verificación oficial o ganancias aseguradas sin evidencia.
6. Mantener la búsqueda pausada y exactamente dos candidatas iniciales de Perú hasta orden contraria.
7. Sin nuevas suscripciones, claves de pago ni costes.
