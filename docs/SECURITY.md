# Seguridad y publicación de código fuente

Este proyecto es una herramienta privada de seguimiento de comercios Pokémon TCG.

El repositorio puede ser público, pero **la aplicación y su base de datos deben seguir siendo privadas**. Nunca subir claves de API, tokens, cookies, contraseñas, archivos `.env`, identificadores secretos, datos de usuarios o volcados de bases de datos. `hatchable.toml` debe contener únicamente configuración no secreta.

La verificación documental es gradual: web accesible, identidad legal, contacto, reseñas y fuentes independientes son evidencias diferentes. La etiqueta verde no garantiza la seguridad de una compra. Los errores de conexión no constituyen por sí solos pruebas de estafa.

Para publicar vulnerabilidades, no escribir claves ni datos sensibles en incidencias públicas. Mantener las rutas de administración con `access='admin'` y las rutas de mantenimiento con `access='scheduler'`.

Nota de licencias: los datos cartográficos y geográficos distribuidos con el proyecto pueden tener condiciones propias (incluidas las de OpenStreetMap/ODbL); conservar créditos y archivos de licencia correspondientes antes de publicar su copia en GitHub.