# TCG Atlas · Investigación de tiendas sin servicios de pago

**Estado provisional:** búsqueda y verificación automáticas pausadas hasta la fase final del proyecto. En Perú se muestra únicamente una selección inicial de dos tiendas: Okamidex y La Mazmorra TCG. Esto no supone recomendar ni certificar su seguridad. Los resultados de otros países no se han eliminado y los comercios guardados por el usuario permanecen intactos. Para reanudar el buscador se debe activar `AUTO_DISCOVERY_ENABLED` en `lib/directory-mode.js` y revisar la política de fuentes.

## Política: coste externo cero

- No se conecta a Brave Search ni a ningún buscador comercial de pago.
- El proyecto no requiere tarjetas bancarias, claves comerciales, compras de créditos ni suscripciones nuevas.
- Fuentes públicas: OpenStreetMap consultado con Photon y Overpass, más los dominios de comercios ya configurados en los conectores del proyecto.
- Photon es un **servidor de demostración con disponibilidad no garantizada**. La app limita el consumo por debajo de sus propios presupuestos de seguridad: hasta **48 consultas por día**, con intervalo mínimo de **180 segundos**, compartidos entre todos los países.
- Overpass se usa exclusivamente como complemento en cola: máximo **6 consultas por día**, intervalo mínimo de **30 minutos**. Tras varios errores consecutivos se pausa temporalmente. Su API pública puede estar saturada.
- No se usan servicios públicos de Nominatim para búsqueda masiva o sistemática de comercios.
- Las consultas y la actualización son conservadoras para mantener el proyecto dentro de los recursos gratuitos de alojamiento, aunque **el proveedor de hosting podría cambiar condiciones o límites**.

## Funcionamiento

1. Al elegir país se incorporan, si aún no están activos, los dominios ya configurados por la app como **candidatos no verificados**. No se afirma que tengan stock real ni reputación contrastada.
2. El escaneo geográfico revisa las áreas planificadas con Photon; Overpass consulta una selección de áreas de forma independiente para no retrasar el avance principal.
3. El sistema deduplica candidatos por el mismo identificador OSM, dominio o nombre y proximidad. Mantiene en `research_candidate_sources` todas las referencias del hallazgo, sin confundirlas con fuentes independientes de reputación.
4. La tabla `research_geo_cache` evita repetir consultas de áreas ya revisadas durante **30 días**, incluidas las búsquedas sin resultados. Los candidatos descubiertos también permanecen en una caché temporal de hasta **30 días**.
5. La tabla `research_verify_queue` permite reintentos separados por tienda, hasta cuatro intentos, con demoras crecientes. El navegador puede mostrar las fichas mientras siguen las verificaciones.
6. `research_area_retries` conserva una fuente geográfica fallida o lenta sin reiniciar el país. `research_source_budget` guarda cuotas y pausas de forma compartida para que escaneos simultáneos no dupliquen consultas.
7. Solo los comercios añadidos expresamente con el botón **Añadir a Mis tiendas** se almacenan en el directorio personal. La caché de descubrimiento no equivale a guardar permanentemente.
8. Un sitio web accesible no basta para mostrar una etiqueta verde. Varias consultas a OpenStreetMap tampoco son pruebas independientes de seguridad.

## Límites reales

- Ni OSM, Photon ni Overpass pueden garantizar que aparezcan **todas** las tiendas físicas y online del país. Muchos comercios no están registrados públicamente, carecen de etiquetas adecuadas o no tienen web en su ficha.
- Los servidores comunitarios pueden bloquear o limitar grandes volúmenes. El escáner se detiene cuando agota su presupuesto y reanuda el trabajo sin perder el cursor.
- El plan actual de Hatchable permite las tareas **recurrentes cada hora**. Las tareas activas pueden solicitar ejecuciones programadas adicionales dentro de los límites del plan.
- No se evaden CAPTCHA ni se realiza extracción masiva en webs que la prohíben.
- La clasificación de fiabilidad es documental y conservadora. No implica garantías de pago, entrega, stock ni inversión.
- La ausencia de una tienda en los resultados no significa que no exista; la ausencia de pruebas tampoco implica fraude.

## Diagnóstico

- `GET /api/dev-health`: resultados temporales, colas, trabajos atascados y consistencia de datos (solo propietario).
- `GET /api/country-investigation?country=PE`: avance del país, fuentes gratuitas, sus cuotas y colas.
- `GET /api/discovery?country=PE`: comercios temporales con su procedencia, etiqueta y estado de verificación.
- `POST /api/jobs/research-maintenance`: recuperación de colas y limpieza de caché (solo tarea programada).

## Fuentes y condiciones

- Photon: https://github.com/komoot/photon (servidor de demostración; uso razonable, sin garantías)
- Overpass: https://wiki.openstreetmap.org/wiki/Overpass_API
- OpenStreetMap / ODbL: https://www.openstreetmap.org/copyright

El objetivo es obtener resultados progresivos y útiles **sin contratar APIs de pago**, no simular una cobertura que los datos gratuitos no permiten.

## Criterio universal de verificación comercial (v83+)

**Fuente única de verdad:** `shop_verification_reports`, indexada por país y dominio normalizado o referencia física. La misma lógica `evaluateVerification` se ejecuta al listar tiendas descubiertas, tiendas guardadas y conectores, sin etiquetas distintas para una misma identidad.

Se comprueban por separado:

1. **Identidad legal:** nombre, identificador fiscal/mercantil, fuente y estado. Los registros secundarios se diferencian de una consulta directa a un organismo oficial. La presencia de un identificador en el propio sitio no es una verificación oficial.
2. **Locales y modalidades:** venta online indicada por catálogo; local físico declarado por el comercio; presencia física contrastada por un proveedor/directorio independiente. Se distingue la dirección legal de un establecimiento abierto al público y se muestran las diferentes sucursales.
3. **Contacto y condiciones:** teléfono, correo, domicilio, términos, envíos, devoluciones y reglas de preventas. Son datos declarados, no pruebas automáticas de cumplimiento.
4. **Referencias externas:** fuente, emisor, URL, fecha y afirmación concreta. Photon y Overpass comparten origen OSM, por lo que no cuentan como dos referencias independientes. Varias páginas del mismo comercio tampoco.
5. **Opiniones y transacciones:** sin muestra independiente contrastada, no se inventan reseñas, puntuaciones, entregas, seguridad de cobros ni stock.
6. **Disponibilidad técnica:** una comprobación manual puede volver a visitar páginas públicas del mismo dominio HTTPS, con pocos accesos y caché de seis horas. Un HTTP 403/429/timeout no convierte una tienda en fraudulenta ni borra las fuentes documentales.

### Etiquetas

- **Verde** = identidad comercial y actividad/localización respaldadas por la web propia más una fuente de registro y una fuente externa diferente que confirme actividad o local. **No certifica una compra segura ni recomienda automáticamente una tienda.**
- **Amarillo** = información insuficiente o todavía sin contraste independiente, aunque la web o el catálogo funcionen.
- **Rojo** = únicamente cuando exista evidencia oficial comprobada de un riesgo comercial grave y vigente; no se usa para errores técnicos, precios altos ni pocas reseñas.

Este método se aplica sin reglas especiales por país. Los identificadores locales (RUC, CIF, RFC, VAT, etc.) se registran en un campo genérico y siempre se indica qué autoridad se ha consultado realmente.

### Dos primeras fichas documentadas (29/10/2026)

- **Okamidex**: sitio propio con catálogo y dos establecimientos, segundo local declarado; Datos Perú para el RUC 20614610159 (fuente secundaria, no consulta SUNAT) y GOSU como fuente externa para la ubicación de Miraflores.
- **La Mazmorra TCG**: sitio propio con catálogo y tienda, políticas de preventa y razón social; Datos Perú para el RUC 20607953903 (fuente secundaria); GOSU y TCG Binder para la dirección de Surco.

Ambas quedan con identidad corroborada documentalmente, valoración de compra aún no auditada y sin puntuación de reseñas inventada. Las fuentes permanecen enlazadas y fechadas en cada ficha.

**La búsqueda de nuevas tiendas sigue pausada:** comprobar expresamente la web de una tienda ya incluida no reactiva el descubrimiento nacional.