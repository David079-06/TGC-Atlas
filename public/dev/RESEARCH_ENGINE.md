# Motor de investigación de tiendas — TCG Atlas

## Qué hace

- Explora zonas planificadas por país o ciudad. La cobertura **no** constituye un censo completo.
- Usa Photon (OpenStreetMap) como fuente geográfica rápida. Overpass/OpenStreetMap se procesa como fuente complementaria lenta en trabajos independientes, con cuotas. **Photon y Overpass consultan la misma base OSM: no son dos fuentes independientes de fiabilidad comercial.**
- Ofrece una integración comercial **opcional** con la API oficial de Brave Search para descubrir dominios y posibles tiendas online. Se activa cuando el propietario introduce su clave desde *Setup* de Hatchable; no funciona sin conexión.
- Deduplica candidatos por identificador OSM, dominio normalizado y nombre con proximidad geográfica, sin fusionar automáticamente sucursales lejanas. Conserva en `research_candidate_sources` la procedencia de cada hallazgo, separada de la evidencia externa de fiabilidad.
- Cola `research_verify_queue`: permite como máximo dos verificaciones simultáneas por lote, reclama trabajos de forma atómica, evita duplicados concurrentes y reintenta errores temporales hasta cuatro veces con demoras crecientes. Los fallos no convierten una tienda en fraudulenta.
- Cola `research_area_retries`: reintenta individualmente fuentes o zonas fallidas. Los proveedores tienen presupuesto diario y pausas compartidas en `research_source_budget`.
- Guarda resultados de investigación como **candidatos temporales durante 24 horas**, con su fuente. Solo se incorporan a `store_registry` al pulsar expresamente *Añadir a Mis tiendas*.
- Muestra fichas y estados conforme llegan, sin esperar a que termine el país, y mantiene los resultados existentes ante errores de proveedores.

## Límites comprobados

1. El plan actual de Hatchable solo admite tareas periódicas **cada hora**. La comprobación activa también programa trabajos individuales mientras exista investigación en curso.
2. Overpass público puede responder con 429, 502 o timeout. No se le pueden exigir tiempos de respuesta garantizados. Las consultas costosas se realizan fuera del cursor principal.
3. Brave Search requiere una clave propia, configuración voluntaria y tiene tarifas/cuotas del proveedor. La clave **no se incluye en GitHub** ni se envía al navegador.
4. No se raspan masivamente sitios que impidan la extracción, no se evitan CAPTCHA y no se inventan registros, reseñas, verificaciones ni cantidades.
5. Verde requiere evidencia independiente contrastada; web accesible, mapa y nombre comercial no bastan. Un resultado no ofrece garantía de compra.

## Activar búsquedas comerciales

En la configuración de Hatchable del proyecto, apartado *Setup*, añadir el secreto opcional `BRAVE_SEARCH_API_KEY`. El motor ya está preparado para consultar la API oficial con un presupuesto máximo conservador (24 solicitudes al día en la app). Con la clave ausente, este proveedor se muestra como pendiente de configuración y el directorio sigue funcionando con fuentes geográficas.

Documentación del proveedor: https://api-dashboard.search.brave.com/api-reference/web/search/post

## Diagnóstico

- `/api/dev-health`: diagnósticos solo para el propietario (candidatas, colas, trabajos atascados, referencias huérfanas).
- `/api/country-investigation?country=PE`: estado del escaneo, fuentes, coberturas y cola.
- `/api/discovery?country=PE`: tiendas temporales con estado de revisión.
- `/api/jobs/research-maintenance`: recuperación periódica de colas (solo scheduler).
- Los límites de tiempo por red y la calidad de un proveedor pueden cambiar; ningún escáner puede prometer encontrar todas las tiendas del país.