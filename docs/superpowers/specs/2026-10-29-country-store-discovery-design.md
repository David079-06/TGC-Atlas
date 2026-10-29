# Tiendas por país: descubrimiento progresivo, expediente y recomendaciones

Estado: propuesta para revisión del propietario; todavía no implementada.
Fecha: 29/10/2026. Rama de trabajo: `feat/country-store-discovery`, basada en `main`.

## Intención y decisiones del propietario

Al seleccionar un país se investigarán comercios Pokémon TCG online, físicos e híbridos. Las tiendas se clasificarán individualmente y aparecerán progresivamente, sin esperar a terminar el país. Abrir una tarjeta mostrará su expediente en la zona del mapa/lista y desplazará la pantalla hasta el informe. Al final habrá una tier list explicable que considere verificación, reseñas y cercanía.

El propietario eligió ampliar el flujo real existente, con pruebas y sin desplegar. Esta petición permite preparar la reactivación antes pospuesta, incluida la búsqueda de nuevas candidatas en Perú; no autoriza cambiar Hatchable ni sus datos o cron. Las dos tiendas iniciales se conservarán, sin inventar nuevas tiendas.

## Enfoques considerados

1. **Ampliar la aplicación actual — elegido.** Reutilizar JavaScript, Leaflet, APIs privadas, PostgreSQL y la cola de Hatchable. Permite conservar expedientes, listas personales y reglas de evidencia. El backend completo sigue requiriendo el runtime de Hatchable para su validación real.
2. **Maqueta navegable primero.** Facilitaría ajustar la distribución, pero no resolvería el descubrimiento ni la verificación. El propietario prefirió trabajar sobre el flujo real.

Una migración de alojamiento es otra tarea. No se utilizará la rama experimental `codex/cloudflare-free-migration` para esta entrega.

## Pantalla y navegación propuestas

```text
País / ciudad · filtros de modalidad · actualizar
Progreso de la ronda y actividad real
┌──────────────────────────────────────────────────┐
│ Exploración: mapa + lista de tiendas clasificadas │
│                  o                               │
│ Expediente de la tienda seleccionada · Volver     │
└──────────────────────────────────────────────────┘
Recomendaciones para tu ubicación · tier list
```

- El país podrá elegirse en el mapa, selector o buscador. Las ciudades acotarán resultados; no sustituirán la ubicación personal sin indicarlo.
- El expediente sustituirá temporalmente al bloque mapa/lista. El progreso seguirá visible y el trabajo continuará mientras se lee.
- Al abrir desde lista, marcador o recomendación se hará scroll al encabezado y se moverá el foco accesible en móvil y escritorio. Se respetará la preferencia de movimiento reducido.
- Volver restaurará país, filtros, resultados, scroll de la lista y foco al elemento de origen. Llegar una tienda nueva no cerrará ni desplazará la ficha.
- Se mantendrán filtros de modalidad y de etiqueta, con un estado explícito cuando la modalidad no esté comprobada. No se supondrá una tienda física por defecto.

## Descubrimiento y resultados incrementales

1. Seleccionar país inicia o reanuda una ronda. Una ronda activa no se reinicia por volver a seleccionar el mismo país.
2. La búsqueda se ejecuta por áreas y fuentes, con cola persistente, deduplicación, caché y reintentos. Se reutilizarán los límites actuales conservadores: Photon 48 consultas/día y Overpass 6/día, con sus intervalos y backoff.
3. Las candidatas pendientes figuran en los contadores de actividad. La lista principal incorpora cada tienda cuando tiene una evaluación documental concluida: verde, amarilla por pruebas insuficientes o roja por riesgo oficial. Una comprobación fallida permanece como pendiente/error, sin simular una clasificación completada.
4. La relación con Pokémon TCG tendrá una fuente identificable. Una juguetería o librería genérica sin indicio comprobable no se anunciará como tienda Pokémon confirmada.
5. Cada actualización añade o actualiza por identidad estable; conserva sucursales distintas, filtros y posición. Cambiar de país invalida las respuestas anteriores.
6. Se reutilizará consulta periódica del estado y resultados; el intervalo respetará actividad, visibilidad, errores y próxima ejecución. No se introducirán WebSockets ni servicios adicionales.
7. La tier list mostrará resultados provisionales mientras trabaja la ronda y el resumen disponible al terminar. Una pausa por cuota no se presentará como análisis nacional completo.

Se distinguirán detectadas, pendientes, revisión técnica completada, evaluadas documentalmente, corroboradas, errores y límites. El porcentaje describirá la ronda/áreas previstas; nunca porcentaje de todas las tiendas de un país.

### Cobertura real

Las fuentes actuales son OSM mediante Photon/Overpass y conectores conocidos. Photon y Overpass tienen la misma procedencia y no cuentan como dos pruebas comerciales independientes. Estas fuentes tienen cobertura parcial y no constituyen un buscador universal de tiendas exclusivamente online. Se admitirán candidatas online de fuentes existentes y aportaciones por URL; cualquier fuente adicional deberá ser gratuita y permitir el uso previsto. No se prometerá exhaustividad ni se añadirán APIs de pago o scraping indiscriminado.

## Expediente y política única de verificación

Cada tienda tendrá una evaluación común, utilizada por tarjetas, mapa, expediente, actividad y clasificación final:

- **Verde:** identidad y actividad corroboradas con pruebas independientes suficientes según el dominio existente. No garantiza pedidos, pagos ni entregas.
- **Amarillo:** información insuficiente o comprobaciones pendientes. La ficha indicará qué falta.
- **Rojo:** riesgo grave respaldado por una fuente oficial concreta. Un error HTTP, ausencia de reseñas o lejanía nunca provocará rojo.

La cola automática deberá actualizar el expediente universal, conservando los hechos y fuentes documentales existentes. Los resultados técnicos de una web se guardarán separados y nunca generarán por sí solos evidencia independiente. Si no se obtiene corroboración, la evaluación terminará en amarillo con sus limitaciones, sin fabricar una etiqueta verde.

El expediente mostrará, cuando consten: identidad comercial, registro y si se consultó directamente, modalidad, locales y su tipo de dirección, contactos, condiciones publicadas, reseñas trazables, fuentes exactas y fechas, última evaluación, estado técnico, pruebas coincidentes y datos pendientes. Distinguirá lo declarado por la tienda de lo corroborado externamente. Un domicilio fiscal no se tratará como local abierto al público.

Cada reseña utilizada tendrá proveedor/URL, escala, puntuación válida, número de opiniones y fecha disponible. No se mezclarán escalas ni se crearán estrellas cuando falten datos. Se conserva el mínimo actual de 20 opiniones para usar una valoración como señal de reputación; no se interpretan menos opiniones como fraude. Las fechas no disponibles o antiguas serán visibles y no se describirán como comprobaciones actuales.

Solo el botón Añadir a Mis tiendas guardará una candidata en la lista personal. Ver una ficha o descubrir un comercio no lo guardará ni iniciará importación de productos.

## Ubicación y tier list: propuesta del implementador

La tier list ordenará relevancia y evidencia; su nivel será independiente del color documental. Ninguna valoración o distancia podrá convertir un amarillo en verde o hacer recomendable un rojo.

Origen de cercanía:

- Botón Usar mi ubicación: permiso explícito del navegador, sin petición automática al cargar.
- Alternativa manual por ciudad/punto seleccionado. Se indicará que se compara desde ese punto y no desde una dirección personal exacta.
- IP únicamente si el alojamiento ofrece una ubicación aproximada documentada; no añadir un proveedor externo de geolocalización ni inferir una dirección postal. Si no existe, se utilizarán las alternativas anteriores.
- Coordenadas del usuario solo en memoria de la sesión para el cálculo; no enviarlas a analítica ni incorporarlas a la base de tiendas o a Git.

Se calculará distancia aproximada en línea recta al local corroborado más cercano, con coordenadas válidas. No es distancia de carretera, tiempo de viaje ni coste de envío. Tiendas exclusivamente online o direcciones no corroboradas muestran sin distancia aplicable/comprobada; nunca 0 km ficticios.

Tier list propuesta, con condiciones visibles:

- **S · Prioridad cercana:** verde, reseña independiente válida de al menos 4/5 y 20 opiniones, y local corroborado a un máximo propuesto de 25 km del origen elegido.
- **A · Identidad corroborada y reputación documentada:** verde y reseña independiente válida, sin reunir todos los criterios de S. Incluye online; no se inventará disponibilidad de envío.
- **B · Identidad corroborada; reputación insuficientemente documentada:** verde con reseñas insuficientes/no disponibles. No implica mala experiencia ni fraude.
- **Pendientes:** amarillas fuera de la recomendación positiva, con datos que faltan.
- **Riesgo documentado:** rojas fuera de las recomendaciones, accesibles por su filtro y expediente.

Dentro de cada grupo se mostrará el motivo del orden: calidad/puntuación de reseñas comparables, distancia cuando exista un local válido y nombre como desempate estable. La modalidad física/híbrida aporta cercanía únicamente con un local corroborado. Cuando no haya origen, no se asignará S por cercanía. La falta de datos se conservará como desconocida.

Los umbrales 4/5, 20 opiniones y 25 km son una propuesta de producto explícita para esta primera versión; no son una garantía ni un estándar oficial. La interfaz explicará qué requisitos cumple cada recomendación.

## Cambios necesarios y riesgos confirmados por lectura

- Unificar activación frontend/backend y retirar de las rutas pertinentes el filtro temporal de Perú, conservando los dos expedientes existentes.
- Conectar la revisión automática con `shop_verification_reports`; actualmente solo completa evidencia técnica separada.
- Evitar reinicios al reutilizar áreas: `prepareCountryAreas` omite `source` al devolver caché, pero el controlador lo compara como si cambiase la cobertura.
- Aplicar cuotas compartidas también a rutas antiguas que podrían eludir el presupuesto del flujo. Tratar una respuesta cacheada como reutilización válida.
- Conservar la modalidad normalizada y la identidad de cada sucursal, y validar que resultados de áreas fronterizas pertenecen al país elegido.
- Reubicar ficha, unificar apertura/foco y marcadores, mantener selección durante sondeos y eliminar declaraciones duplicadas relevantes de `locations.js`.
- No utilizar puntuaciones antiguas de catálogo/conectores para valorar seguridad comercial.

## Pruebas y límites de validación

- Baseline ejecutada con Node 22: `npm run verify` correcto; 93 archivos JS y 10 contratos aprobados, sin omisiones. Se comprobó también la ejecución directa del archivo de contrato.
- Añadir regresiones significativas para estado de ronda/reanudación, evaluación con evidencia insuficiente, modalidad desconocida, actualización incremental sin resultados de países anteriores, frontera y sucursales, distancia válida, reseñas ausentes/incorrectas, niveles y exclusión de riesgos.
- Probar UI a 375 y 1440 px: apertura, scroll/foco, volver, resultados incrementales, errores, permiso de ubicación denegado y movimiento reducido. Los datos sintéticos y respuestas interceptadas se identificarán como pruebas; no probarán la calidad de fuentes reales.
- Ejecutar la suite actual y las comprobaciones nuevas sin consultar tiendas reales ni escribir datos de producción.
- El runtime propietario Hatchable no se ejecuta como servidor Node estándar. Las pruebas locales con dobles no validan scheduler, autenticación desplegada, PostgreSQL real ni descubrimiento en producción. Esas comprobaciones requerirán un entorno privado de pruebas compatible y autorizado, en otra fase; se informará esta limitación sin declarar el backend real validado.

## Entrega y límites

Trabajo en rama, sin desplegar, publicar previews públicos, cambiar Hatchable, ejecutar cron de producción, introducir secretos, conectar alojamientos ni activar facturación. No se migrará a Cloudflare o Supabase. Se entregarán cambios revisables, pruebas y limitaciones. La implementación comienza después de aprobar este diseño o de que el propietario indique que prefiere delegar estas decisiones y proceder directamente.
